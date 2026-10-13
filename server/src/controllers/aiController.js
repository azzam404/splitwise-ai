const { z } = require('zod');
const ai = require('../services/aiService');
const AppError = require('../utils/AppError');
const { loadGroupForMember } = require('./groupController');
const { MONTH_RE, currentMonth, spendingByCategory, monthlyTrend } = require('../services/spending');
const { budgetsWithSpending } = require('./budgetController');

// The client sends its local date so "today" / "yesterday" match the user's calendar.
const today = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();
const serverToday = () => new Date().toISOString().slice(0, 10);

const parseExpenseSchema = z.object({
  text: z.string().trim().min(3, 'Describe the expense in a few words').max(500),
  today,
});

const receiptFieldsSchema = z.object({ today });
const insightsQuerySchema = z.object({ month: z.string().regex(MONTH_RE, 'Month must be YYYY-MM').optional() });

const membersOf = (group) => group.members.map((m) => ({ id: String(m._id), name: m.name }));

function status(req, res) {
  res.json({ enabled: ai.isEnabled(), model: ai.MODEL });
}

async function parseExpense(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  const result = await ai.parseExpenseText({
    text: req.body.text,
    members: membersOf(group),
    currentUserId: req.user._id,
    today: req.body.today || serverToday(),
  });
  res.json(result);
}

async function scanReceipt(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  if (!req.file) throw new AppError(400, 'Attach a receipt image');
  const fields = receiptFieldsSchema.safeParse(req.body);

  const result = await ai.scanReceipt({
    image: req.file.buffer,
    mediaType: req.file.mimetype,
    members: membersOf(group),
    currentUserId: req.user._id,
    today: (fields.success && fields.data.today) || serverToday(),
  });
  res.json(result);
}

async function insights(req, res) {
  const userId = req.user._id;
  const month = req.validated.query.month || currentMonth();
  const [byCategory, trend, budgets] = await Promise.all([
    spendingByCategory(userId, month),
    monthlyTrend(userId, month, 6),
    budgetsWithSpending(userId, month),
  ]);
  const categories = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const list = await ai.spendingInsights({
    month,
    totalSpent: categories.reduce((t, c) => t + c.amount, 0),
    previousMonthSpent: trend.at(-2)?.amount ?? 0,
    byCategory: categories,
    trend,
    budgets,
  });
  res.json({ month, insights: list });
}

module.exports = { parseExpenseSchema, insightsQuerySchema, status, parseExpense, scanReceipt, insights };
