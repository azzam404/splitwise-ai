// Claude-powered helpers: plain-English expense entry, receipt scanning and spending insights.
// Every helper returns a *draft* - nothing is saved until the user confirms it in the UI.
const Anthropic = require('@anthropic-ai/sdk').default;
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { z } = require('zod');
const AppError = require('../utils/AppError');
const { CATEGORIES } = require('../models/Expense');

// Haiku is fast and cheap, and extraction is well within its abilities.
const MODEL = 'claude-haiku-5-5';

let client = null;
let clientOverride = null;

function getClient() {
  if (clientOverride) return clientOverride;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

const isEnabled = () => Boolean(getClient());

// Lets tests swap in a fake client; pass null to restore the real one.
function setClientForTesting(fake) {
  clientOverride = fake;
}

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

/** Runs one structured-output request and returns the parsed object, mapping failures to AppErrors. */
async function runStructured({ system, content, schema, maxTokens = 2000 }) {
  const ai = getClient();
  if (!ai) throw new AppError(503, 'AI features are not configured on this server');

  let response;
  try {
    response = await ai.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort: 'low', format: zodOutputFormat(schema) },
      system,
      messages: [{ role: 'user', content }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error('Anthropic auth error:', err.message);
      throw new AppError(503, 'AI is unavailable: the server API key is invalid or out of credit');
    }
    if (err instanceof Anthropic.RateLimitError) throw new AppError(429, 'AI is busy right now. Try again in a minute.');
    if (err instanceof Anthropic.BadRequestError) {
      console.error('Anthropic bad request:', err.message);
      throw new AppError(422, "The AI couldn't process that input");
    }
    if (err instanceof Anthropic.APIError || err instanceof Anthropic.APIConnectionError) {
      console.error('Anthropic API error:', err.message);
      throw new AppError(502, 'AI service error. Please try again.');
    }
    // The SDK throws the base AnthropicError when the reply doesn't match the schema.
    if (err instanceof Anthropic.AnthropicError) {
      console.warn('AI output failed validation:', err.message);
      throw new AppError(422, "The AI couldn't read that clearly. Try rephrasing or entering it manually.");
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') throw new AppError(422, "The AI declined to process that input");
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
    throw new AppError(422, "The AI couldn't read that clearly. Try rephrasing or entering it manually.");
  }
  return response.parsed_output;
}

// Members are referred to by short keys (m1, m2…) so the model can only pick real people.
function memberKeys(members, currentUserId) {
  const keyed = members.map((m, i) => ({ key: `m${i + 1}`, id: String(m.id), name: m.name, isYou: String(m.id) === String(currentUserId) }));
  const byKey = new Map(keyed.map((m) => [m.key, m]));
  const roster = keyed.map((m) => `- ${m.key}: ${m.name}${m.isYou ? ' (this is "me" / "I" / "you", the person typing)' : ''}`).join('\n');
  return { keyed, byKey, roster, keys: keyed.map((m) => m.key) };
}

const categoryList = CATEGORIES.join(', ');

/**
 * Turns "Paid 1200 for dinner with Rahul and Priya" into an expense draft for this group.
 * @returns {Promise<{draft: object, notes: string[]}>} draft uses paise and user ids, ready for the expense form
 */
async function parseExpenseText({ text, members, currentUserId, today }) {
  const { byKey, roster, keys } = memberKeys(members, currentUserId);
  const memberKey = z.enum(keys);

  const schema = z.object({
    description: z.string().describe('Short title, e.g. "Dinner at Thalassa"'),
    amount: z.number().describe('Total amount in rupees'),
    category: z.enum(CATEGORIES),
    date: z.string().nullable().describe('YYYY-MM-DD if a date is mentioned or implied (e.g. "yesterday"), else null'),
    paidBy: memberKey,
    splitType: z.enum(['equal', 'exact', 'percentage']),
    participants: z
      .array(
        z.object({
          member: memberKey,
          amount: z.number().nullable().describe('Rupees owed, only for exact splits'),
          percent: z.number().nullable().describe('Percent, only for percentage splits'),
        })
      )
      .describe('Everyone who shares the cost, including the payer if they share it'),
    notes: z.array(z.string()).describe('Anything ambiguous the user should double-check; empty if none'),
  });

  const system = `You turn a short description of a shared expense into structured data for a bill-splitting app used in India.
Today is ${today}. Amounts are in Indian rupees (₹); "1.2k" means 1200 and "1 lakh" means 100000.

Group members (use only these keys):
${roster}

Rules:
- If no payer is mentioned, the person typing paid.
- If no one else is mentioned, split equally among all group members.
- "with X and Y" means the payer plus X and Y share it.
- Match names loosely (nicknames, typos, first names). If someone mentioned is not in the group, leave them out and add a note.
- Use "exact" only when specific amounts per person are given, "percentage" only when percentages are given; otherwise "equal".
- Pick the closest category from: ${categoryList}.`;

  const out = await runStructured({ system, content: text, schema });

  const participants = out.participants.filter((p, i, all) => all.findIndex((q) => q.member === p.member) === i);
  if (!participants.length) throw new AppError(422, "Couldn't tell who shares this expense");

  return {
    draft: {
      description: out.description.slice(0, 120),
      amount: toPaise(out.amount),
      category: out.category,
      date: /^\d{4}-\d{2}-\d{2}$/.test(out.date ?? '') && out.date <= today ? out.date : today,
      paidBy: byKey.get(out.paidBy).id,
      splitType: out.splitType,
      participants: participants.map((p) => ({
        user: byKey.get(p.member).id,
        ...(out.splitType === 'exact' && { amount: toPaise(p.amount ?? 0) }),
        ...(out.splitType === 'percentage' && { percent: p.percent ?? 0 }),
      })),
      createdVia: 'ai-text',
    },
    notes: out.notes,
  };
}

const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Reads a receipt photo. Payer defaults to the uploader and the split to everyone, equally;
 * the user adjusts both in the form.
 */
async function scanReceipt({ image, mediaType, members, currentUserId, today }) {
  if (!RECEIPT_TYPES.includes(mediaType)) throw new AppError(400, 'Receipt must be a JPEG, PNG, WebP or GIF image');

  const schema = z.object({
    isReceipt: z.boolean().describe('false if the image is not a receipt or bill'),
    merchant: z.string().describe('Shop or restaurant name, or a short description'),
    total: z.number().describe('Final amount paid in rupees, including taxes and tips'),
    date: z.string().nullable().describe('Receipt date as YYYY-MM-DD, or null if not visible'),
    category: z.enum(CATEGORIES),
    items: z.array(z.object({ name: z.string(), amount: z.number() })).describe('Up to 10 main line items'),
    notes: z.array(z.string()).describe('Anything unclear, e.g. a blurry total; empty if none'),
  });

  const system = `You read photos of receipts and bills for a bill-splitting app used in India. Today is ${today}.
Report the final total actually paid (after taxes, service charge and discounts) in rupees.
Pick the closest category from: ${categoryList}.
If the image is not a receipt or bill, set isReceipt to false.`;

  const out = await runStructured({
    system,
    schema,
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: image.toString('base64') } },
      { type: 'text', text: 'Extract this receipt.' },
    ],
  });

  if (!out.isReceipt) throw new AppError(422, "That doesn't look like a receipt. Try a clearer photo.");
  if (!(out.total > 0)) throw new AppError(422, "Couldn't find the total on this receipt");

  return {
    draft: {
      description: out.merchant.slice(0, 120),
      amount: toPaise(out.total),
      category: out.category,
      date: /^\d{4}-\d{2}-\d{2}$/.test(out.date ?? '') && out.date <= today ? out.date : today,
      paidBy: String(currentUserId),
      splitType: 'equal',
      participants: members.map((m) => ({ user: String(m.id) })),
      createdVia: 'ai-receipt',
    },
    items: out.items.slice(0, 10).map((i) => ({ name: i.name, amount: toPaise(i.amount) })),
    notes: out.notes,
  };
}

/**
 * Short, friendly observations about a month's spending. Only aggregate numbers are sent -
 * no names, groups or descriptions.
 */
async function spendingInsights({ month, totalSpent, previousMonthSpent, byCategory, trend, budgets }) {
  const rupees = (p) => Math.round(p / 100);
  const facts = {
    month,
    totalSpentRupees: rupees(totalSpent),
    previousMonthRupees: rupees(previousMonthSpent),
    byCategoryRupees: Object.fromEntries(byCategory.map((c) => [c.category, rupees(c.amount)])),
    last6MonthsRupees: Object.fromEntries(trend.map((t) => [t.month, rupees(t.amount)])),
    budgets: budgets.map((b) => ({ category: b.category, limitRupees: rupees(b.limit), spentRupees: rupees(b.spent), percent: b.percent })),
  };

  const schema = z.object({
    insights: z
      .array(
        z.object({
          title: z.string().describe('At most 6 words'),
          detail: z.string().describe('One sentence with a specific number'),
          tone: z.enum(['positive', 'neutral', 'warning']),
        })
      )
      .describe('2 to 4 insights, most useful first'),
  });

  const system = `You are a friendly personal-finance assistant inside a bill-splitting app used in India.
Given one person's spending figures (their share of shared expenses, in rupees), write 2-4 short, specific insights:
notable changes vs previous months, the biggest categories, budgets at risk, and one practical tip if useful.
Use ₹ with Indian digit grouping (e.g. ₹1,20,000). Be concrete and kind; never invent numbers that aren't in the data.
If there is no spending, say so briefly and suggest setting a budget.`;

  const out = await runStructured({ system, schema, content: JSON.stringify(facts), maxTokens: 1500 });
  return out.insights.slice(0, 4);
}

module.exports = { MODEL, RECEIPT_TYPES, isEnabled, setClientForTesting, parseExpenseText, scanReceipt, spendingInsights };
