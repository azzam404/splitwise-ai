const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Anthropic = require('@anthropic-ai/sdk').default;
const { useTestDatabase } = require('./setup');
const { createAuthedAgent } = require('./helpers');
const ai = require('../src/services/aiService');

useTestDatabase();

// A stand-in for the Anthropic client: records each request and returns a canned reply.
function fakeClient(reply) {
  const calls = [];
  return {
    calls,
    messages: {
      parse: async (params) => {
        calls.push(params);
        if (reply instanceof Error) throw reply;
        return typeof reply === 'function' ? reply(params) : { stop_reason: 'end_turn', parsed_output: reply };
      },
    },
  };
}

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

describe('AI features', () => {
  let alice;
  let bob;
  let carol;
  let dave;
  let group;

  beforeEach(async () => {
    alice = await createAuthedAgent({ name: 'Alice' });
    bob = await createAuthedAgent({ name: 'Bob' });
    carol = await createAuthedAgent({ name: 'Carol' });
    dave = await createAuthedAgent({ name: 'Dave' });
    group = (await alice.agent.post('/api/groups').send({ name: 'Trip' })).body.group;
    await bob.agent.post(`/api/groups/join/${group.inviteCode}`).expect(200);
    await carol.agent.post(`/api/groups/join/${group.inviteCode}`).expect(200);
  });

  afterEach(() => ai.setClientForTesting(null));

  const url = (path) => `/api/groups/${group._id}/ai/${path}`;

  it('reports when AI is not configured and refuses AI calls', async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      assert.equal((await alice.agent.get('/api/ai/status').expect(200)).body.enabled, false);
      const res = await alice.agent.post(url('parse-expense')).send({ text: 'Paid 500 for lunch' }).expect(503);
      assert.match(res.body.error.message, /not configured/);
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });

  it('parses plain English into a draft mapped to real members', async () => {
    const fake = fakeClient((params) => {
      // Member keys follow group order: m1 Alice (the typist), m2 Bob, m3 Carol.
      assert.match(params.system, /m1: Alice \(this is "me"/);
      assert.match(params.system, /m3: Carol/);
      return {
        stop_reason: 'end_turn',
        parsed_output: {
          description: 'Dinner',
          amount: 1200.5,
          category: 'food',
          date: '2026-10-12',
          paidBy: 'm2',
          splitType: 'equal',
          participants: [
            { member: 'm1', amount: null, percent: null },
            { member: 'm2', amount: null, percent: null },
            { member: 'm2', amount: null, percent: null }, // duplicate is dropped
          ],
          notes: ['Priya is not in this group'],
        },
      };
    });
    ai.setClientForTesting(fake);

    const res = await alice.agent
      .post(url('parse-expense'))
      .send({ text: 'Bob paid 1200.50 for dinner with me and Priya yesterday', today: '2026-10-13' })
      .expect(200);

    assert.deepEqual(res.body.draft, {
      description: 'Dinner',
      amount: 120050,
      category: 'food',
      date: '2026-10-12',
      paidBy: bob.user.id,
      splitType: 'equal',
      participants: [{ user: alice.user.id }, { user: bob.user.id }],
      createdVia: 'ai-text',
    });
    assert.deepEqual(res.body.notes, ['Priya is not in this group']);

    const [call] = fake.calls;
    assert.equal(call.model, 'claude-haiku-5-5');
    assert.equal(call.output_config.effort, 'low');
    assert.match(call.system, /Today is 2026-10-13/);
    assert.equal(call.messages[0].content, 'Bob paid 1200.50 for dinner with me and Priya yesterday');

    // The draft is accepted as-is by the expense API.
    await alice.agent.post(`/api/groups/${group._id}/expenses`).send(res.body.draft).expect(201);
  });

  it('converts exact and percentage splits and ignores future dates', async () => {
    ai.setClientForTesting(
      fakeClient({
        description: 'Cab',
        amount: 900,
        category: 'transport',
        date: '2030-01-01',
        paidBy: 'm1',
        splitType: 'exact',
        participants: [
          { member: 'm1', amount: 300, percent: null },
          { member: 'm3', amount: 600, percent: null },
        ],
        notes: [],
      })
    );
    const res = await alice.agent.post(url('parse-expense')).send({ text: 'cab 900, I owe 300 Carol 600', today: '2026-10-13' }).expect(200);
    assert.equal(res.body.draft.date, '2026-10-13');
    assert.deepEqual(res.body.draft.participants, [
      { user: alice.user.id, amount: 30000 },
      { user: carol.user.id, amount: 60000 },
    ]);
  });

  it('maps model failures to clear HTTP errors', async () => {
    ai.setClientForTesting(fakeClient(() => ({ stop_reason: 'refusal', parsed_output: null })));
    await alice.agent.post(url('parse-expense')).send({ text: 'something odd' }).expect(422);

    ai.setClientForTesting(fakeClient(() => ({ stop_reason: 'end_turn', parsed_output: null })));
    await alice.agent.post(url('parse-expense')).send({ text: 'gibberish here' }).expect(422);

    ai.setClientForTesting(fakeClient(new Anthropic.AuthenticationError(401, undefined, 'invalid x-api-key', new Headers())));
    const auth = await alice.agent.post(url('parse-expense')).send({ text: 'Paid 500' }).expect(503);
    assert.match(auth.body.error.message, /invalid or out of credit/);

    ai.setClientForTesting(fakeClient(new Anthropic.RateLimitError(429, undefined, 'slow down', new Headers())));
    await alice.agent.post(url('parse-expense')).send({ text: 'Paid 500' }).expect(429);

    // Reply that doesn't match the schema (e.g. an unknown member key).
    ai.setClientForTesting(fakeClient(new Anthropic.AnthropicError('Failed to parse structured output')));
    await alice.agent.post(url('parse-expense')).send({ text: 'Paid 500' }).expect(422);
  });

  it('validates input and group membership', async () => {
    ai.setClientForTesting(fakeClient({}));
    await alice.agent.post(url('parse-expense')).send({ text: 'hi' }).expect(400);
    await dave.agent.post(url('parse-expense')).send({ text: 'Paid 500 for lunch' }).expect(404);
  });

  it('scans a receipt image into an equal-split draft paid by the uploader', async () => {
    const fake = fakeClient({
      isReceipt: true,
      merchant: 'Cafe Mondegar',
      total: 1842.75,
      date: '2026-10-11',
      category: 'food',
      items: [{ name: 'Beer', amount: 600 }],
      notes: [],
    });
    ai.setClientForTesting(fake);

    const res = await bob.agent
      .post(url('scan-receipt'))
      .field('today', '2026-10-13')
      .attach('receipt', PNG, { filename: 'r.png', contentType: 'image/png' })
      .expect(200);

    assert.equal(res.body.draft.amount, 184275);
    assert.equal(res.body.draft.paidBy, bob.user.id);
    assert.equal(res.body.draft.createdVia, 'ai-receipt');
    assert.equal(res.body.draft.participants.length, 3);
    assert.deepEqual(res.body.items, [{ name: 'Beer', amount: 60000 }]);

    const [block] = fake.calls[0].messages[0].content;
    assert.equal(block.type, 'image');
    assert.equal(block.source.media_type, 'image/png');
    assert.equal(block.source.data, PNG.toString('base64'));
  });

  it('rejects non-images, oversized files, missing files and non-receipts', async () => {
    ai.setClientForTesting(fakeClient({ isReceipt: false, merchant: '', total: 0, date: null, category: 'other', items: [], notes: [] }));
    await alice.agent.post(url('scan-receipt')).attach('receipt', Buffer.from('%PDF-1.4'), { filename: 'r.pdf', contentType: 'application/pdf' }).expect(400);
    await alice.agent.post(url('scan-receipt')).attach('receipt', Buffer.alloc(6 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' }).expect(413);
    await alice.agent.post(url('scan-receipt')).expect(400);
    const res = await alice.agent.post(url('scan-receipt')).attach('receipt', PNG, { filename: 'cat.png', contentType: 'image/png' }).expect(422);
    assert.match(res.body.error.message, /doesn't look like a receipt/);
  });

  it('sends only aggregate numbers for insights', async () => {
    await alice.agent
      .post(`/api/groups/${group._id}/expenses`)
      .send({ description: 'Secret dinner', amount: 30000, category: 'food', date: '2026-10-05', paidBy: alice.user.id, splitType: 'equal', participants: [{ user: alice.user.id }, { user: bob.user.id }] })
      .expect(201);
    const fake = fakeClient({ insights: [{ title: 'Food leads', detail: 'Food was ₹150 this month.', tone: 'neutral' }] });
    ai.setClientForTesting(fake);

    const res = await alice.agent.get('/api/ai/insights?month=2026-10').expect(200);
    assert.equal(res.body.insights[0].title, 'Food leads');

    const sent = JSON.parse(fake.calls[0].messages[0].content);
    assert.equal(sent.totalSpentRupees, 150);
    assert.deepEqual(sent.byCategoryRupees, { food: 150 });
    const raw = JSON.stringify(fake.calls[0]);
    assert.ok(!raw.includes('Secret dinner') && !raw.includes('Bob') && !raw.includes('Trip'), 'no names or descriptions sent');
  });
});
