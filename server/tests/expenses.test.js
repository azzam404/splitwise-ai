const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTestDatabase } = require('./setup');
const { createAuthedAgent } = require('./helpers');

useTestDatabase();

// Three members in one group: alice (owner), bob, carol. Dave is an outsider.
async function setupGroup() {
  const alice = await createAuthedAgent({ name: 'Alice' });
  const bob = await createAuthedAgent({ name: 'Bob' });
  const carol = await createAuthedAgent({ name: 'Carol' });
  const dave = await createAuthedAgent({ name: 'Dave' });
  const { group } = (await alice.agent.post('/api/groups').send({ name: 'Trip' })).body;
  await bob.agent.post(`/api/groups/join/${group.inviteCode}`).expect(200);
  await carol.agent.post(`/api/groups/join/${group.inviteCode}`).expect(200);
  return { alice, bob, carol, dave, group };
}

const sharesByName = (expense) => Object.fromEntries(expense.splits.map((s) => [s.user.name, s.amount]));

describe('expenses', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setupGroup();
  });

  const url = () => `/api/groups/${ctx.group._id}/expenses`;
  const everyone = () => [ctx.alice, ctx.bob, ctx.carol].map((m) => ({ user: m.user.id }));

  it('creates an equal split and populates users', async () => {
    const res = await ctx.alice.agent
      .post(url())
      .send({
        description: 'Dinner',
        amount: 100000,
        category: 'food',
        paidBy: ctx.alice.user.id,
        splitType: 'equal',
        participants: everyone(),
      })
      .expect(201);

    const { expense } = res.body;
    assert.equal(expense.paidBy.name, 'Alice');
    assert.deepEqual(sharesByName(expense), { Alice: 33334, Bob: 33333, Carol: 33333 });
    assert.equal(expense.createdVia, 'manual');
  });

  it('creates exact and percentage splits', async () => {
    const exact = await ctx.bob.agent
      .post(url())
      .send({
        description: 'Cab',
        amount: 60000,
        paidBy: ctx.bob.user.id,
        splitType: 'exact',
        participants: [
          { user: ctx.alice.user.id, amount: 10000 },
          { user: ctx.bob.user.id, amount: 50000 },
        ],
      })
      .expect(201);
    assert.deepEqual(sharesByName(exact.body.expense), { Alice: 10000, Bob: 50000 });
    assert.equal(exact.body.expense.category, 'other');

    const pct = await ctx.bob.agent
      .post(url())
      .send({
        description: 'Hotel',
        amount: 900000,
        paidBy: ctx.carol.user.id,
        splitType: 'percentage',
        participants: [
          { user: ctx.alice.user.id, percent: 50 },
          { user: ctx.bob.user.id, percent: 25 },
          { user: ctx.carol.user.id, percent: 25 },
        ],
      })
      .expect(201);
    assert.deepEqual(sharesByName(pct.body.expense), { Alice: 450000, Bob: 225000, Carol: 225000 });
  });

  it('rejects bad splits, outsiders and non-integer amounts', async () => {
    const base = { description: 'X', amount: 1000, paidBy: ctx.alice.user.id, splitType: 'equal', participants: everyone() };

    await ctx.alice.agent.post(url()).send({ ...base, amount: 10.5 }).expect(400);
    await ctx.alice.agent.post(url()).send({ ...base, paidBy: ctx.dave.user.id }).expect(400);
    await ctx.alice.agent
      .post(url())
      .send({ ...base, participants: [...everyone(), { user: ctx.dave.user.id }] })
      .expect(400);
    const res = await ctx.alice.agent
      .post(url())
      .send({ ...base, splitType: 'exact', participants: [{ user: ctx.alice.user.id, amount: 1 }] })
      .expect(400);
    assert.match(res.body.error.message, /add up/);
  });

  it('blocks non-members from reading or writing', async () => {
    await ctx.dave.agent.get(url()).expect(404);
    await ctx.dave.agent
      .post(url())
      .send({ description: 'X', amount: 100, paidBy: ctx.dave.user.id, splitType: 'equal', participants: [{ user: ctx.dave.user.id }] })
      .expect(404);
  });

  it('lists newest first with pagination', async () => {
    for (const [i, day] of [1, 3, 2].entries()) {
      await ctx.alice.agent
        .post(url())
        .send({
          description: `E${i}`,
          amount: 300,
          paidBy: ctx.alice.user.id,
          splitType: 'equal',
          participants: everyone(),
          date: `2026-10-0${day}`,
        })
        .expect(201);
    }

    const page1 = (await ctx.bob.agent.get(`${url()}?limit=2`).expect(200)).body;
    assert.equal(page1.total, 3);
    assert.equal(page1.pages, 2);
    assert.deepEqual(
      page1.expenses.map((e) => e.description),
      ['E1', 'E2']
    );
    const page2 = (await ctx.bob.agent.get(`${url()}?limit=2&page=2`).expect(200)).body;
    assert.deepEqual(
      page2.expenses.map((e) => e.description),
      ['E0']
    );
    await ctx.bob.agent.get(`${url()}?limit=0`).expect(400);
  });

  it('updates an expense and recomputes splits, keeping existing participants', async () => {
    const { expense } = (
      await ctx.alice.agent
        .post(url())
        .send({
          description: 'Groceries',
          amount: 30000,
          category: 'groceries',
          paidBy: ctx.alice.user.id,
          splitType: 'equal',
          participants: everyone(),
        })
        .expect(201)
    ).body;

    const res = await ctx.bob.agent.patch(`/api/expenses/${expense._id}`).send({ amount: 60000 }).expect(200);
    assert.deepEqual(sharesByName(res.body.expense), { Alice: 20000, Bob: 20000, Carol: 20000 });
    assert.equal(res.body.expense.category, 'groceries', 'category must not reset on partial update');

    const switched = await ctx.bob.agent
      .patch(`/api/expenses/${expense._id}`)
      .send({
        splitType: 'exact',
        participants: [
          { user: ctx.alice.user.id, amount: 40000 },
          { user: ctx.carol.user.id, amount: 20000 },
        ],
      })
      .expect(200);
    assert.deepEqual(sharesByName(switched.body.expense), { Alice: 40000, Carol: 20000 });

    await ctx.bob.agent.patch(`/api/expenses/${expense._id}`).send({}).expect(400);
  });

  it('deletes an expense; outsiders get 404', async () => {
    const { expense } = (
      await ctx.alice.agent
        .post(url())
        .send({ description: 'Tea', amount: 600, paidBy: ctx.alice.user.id, splitType: 'equal', participants: everyone() })
        .expect(201)
    ).body;

    await ctx.dave.agent.delete(`/api/expenses/${expense._id}`).expect(404);
    await ctx.carol.agent.delete(`/api/expenses/${expense._id}`).expect(204);
    await ctx.alice.agent.get(`/api/expenses/${expense._id}`).expect(404);
  });
});
