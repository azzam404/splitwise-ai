const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTestDatabase } = require('./setup');
const { createAuthedAgent } = require('./helpers');
const { budgetStatus, previousMonths, monthRange } = require('../src/services/spending');

useTestDatabase();

describe('spending helpers', () => {
  it('lists previous months across a year boundary', () => {
    assert.deepEqual(previousMonths('2026-02', 4), ['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('builds half-open UTC month ranges', () => {
    const { start, end } = monthRange('2026-12');
    assert.equal(start.toISOString(), '2026-12-01T00:00:00.000Z');
    assert.equal(end.toISOString(), '2027-01-01T00:00:00.000Z');
  });

  it('classifies budget health', () => {
    assert.equal(budgetStatus(5000, 10000).status, 'ok');
    assert.equal(budgetStatus(8000, 10000).status, 'warning');
    assert.equal(budgetStatus(10000, 10000).status, 'warning');
    assert.deepEqual(budgetStatus(12500, 10000), { spent: 12500, percent: 125, status: 'over', remaining: -2500 });
  });
});

describe('budgets and dashboard', () => {
  let alice;
  let bob;
  let group;

  beforeEach(async () => {
    alice = await createAuthedAgent({ name: 'Alice' });
    bob = await createAuthedAgent({ name: 'Bob' });
    group = (await alice.agent.post('/api/groups').send({ name: 'Flat' })).body.group;
    await bob.agent.post(`/api/groups/join/${group.inviteCode}`).expect(200);
  });

  const addExpense = (agent, { amount, category, date, paidBy, people }) =>
    agent
      .post(`/api/groups/${group._id}/expenses`)
      .send({
        description: category,
        amount,
        category,
        date,
        paidBy: paidBy.user.id,
        splitType: 'equal',
        participants: people.map((p) => ({ user: p.user.id })),
      })
      .expect(201);

  it('upserts budgets and reports spending against them', async () => {
    // Alice's share: food 300 + 200 = 500 in October; rent 1000 in September (outside the month).
    await addExpense(alice.agent, { amount: 60000, category: 'food', date: '2026-10-05', paidBy: alice, people: [alice, bob] });
    await addExpense(bob.agent, { amount: 40000, category: 'food', date: '2026-10-20', paidBy: bob, people: [alice, bob] });
    await addExpense(alice.agent, { amount: 100000, category: 'rent', date: '2026-09-30', paidBy: alice, people: [alice] });

    await alice.agent.put('/api/budgets').send({ month: '2026-10', category: 'food', limit: 40000 }).expect(200);
    await alice.agent.put('/api/budgets').send({ month: '2026-10', category: 'overall', limit: 100000 }).expect(200);
    const updated = await alice.agent.put('/api/budgets').send({ month: '2026-10', category: 'food', limit: 60000 }).expect(200);
    assert.deepEqual(
      { limit: updated.body.budget.limit, spent: updated.body.budget.spent, status: updated.body.budget.status },
      { limit: 60000, spent: 50000, status: 'warning' }
    );

    const { body } = await alice.agent.get('/api/budgets?month=2026-10').expect(200);
    assert.deepEqual(
      body.budgets.map((b) => [b.category, b.spent, b.status]),
      [
        ['overall', 50000, 'ok'],
        ['food', 50000, 'warning'],
      ]
    );

    // Budgets are personal.
    assert.equal((await bob.agent.get('/api/budgets?month=2026-10').expect(200)).body.budgets.length, 0);
  });

  it('validates budget input and ownership on delete', async () => {
    await alice.agent.put('/api/budgets').send({ month: '2026-13', category: 'food', limit: 100 }).expect(400);
    await alice.agent.put('/api/budgets').send({ month: '2026-10', category: 'yachts', limit: 100 }).expect(400);
    await alice.agent.put('/api/budgets').send({ month: '2026-10', category: 'food', limit: 0 }).expect(400);
    await alice.agent.get('/api/budgets?month=oct').expect(400);

    const { budget } = (await alice.agent.put('/api/budgets').send({ month: '2026-10', category: 'food', limit: 100 })).body;
    await bob.agent.delete(`/api/budgets/${budget._id}`).expect(404);
    await alice.agent.delete(`/api/budgets/${budget._id}`).expect(204);
  });

  it('summarises the month: categories, trend, alerts, balances and recent expenses', async () => {
    await addExpense(alice.agent, { amount: 60000, category: 'food', date: '2026-10-05', paidBy: alice, people: [alice, bob] });
    await addExpense(bob.agent, { amount: 20000, category: 'transport', date: '2026-10-07', paidBy: bob, people: [alice, bob] });
    await addExpense(alice.agent, { amount: 50000, category: 'rent', date: '2026-08-15', paidBy: alice, people: [alice] });
    await alice.agent.put('/api/budgets').send({ month: '2026-10', category: 'food', limit: 25000 }).expect(200);

    const { body } = await alice.agent.get('/api/dashboard/summary?month=2026-10').expect(200);

    assert.equal(body.totalSpent, 40000);
    assert.deepEqual(body.byCategory, [
      { category: 'food', amount: 30000 },
      { category: 'transport', amount: 10000 },
    ]);
    assert.deepEqual(
      body.trend.map((t) => [t.month, t.amount]),
      [
        ['2026-05', 0],
        ['2026-06', 0],
        ['2026-07', 0],
        ['2026-08', 50000],
        ['2026-09', 0],
        ['2026-10', 40000],
      ]
    );
    assert.equal(body.previousMonthSpent, 0);
    assert.deepEqual(
      body.alerts.map((a) => [a.category, a.status]),
      [['food', 'over']]
    );
    // Alice paid 600 for food (Bob owes 300); Bob paid 200 for transport (Alice owes 100).
    assert.equal(body.balances.owedToYou, 20000);
    assert.equal(body.balances.youOwe, 0);
    assert.deepEqual(body.balances.groups.map((g) => [g.group.name, g.net]), [['Flat', 20000]]);
    assert.equal(body.recentExpenses.length, 3);
    assert.equal(body.recentExpenses[0].yourShare, 10000);
  });

  it('defaults to the current month and requires auth', async () => {
    const { body } = await alice.agent.get('/api/dashboard/summary').expect(200);
    assert.match(body.month, /^\d{4}-\d{2}$/);
    assert.equal(body.totalSpent, 0);

    const request = require('supertest');
    await request(require('../src/app')).get('/api/dashboard/summary').expect(401);
    await request(require('../src/app')).get('/api/budgets').expect(401);
  });
});
