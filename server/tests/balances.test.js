const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTestDatabase } = require('./setup');
const { createAuthedAgent } = require('./helpers');

useTestDatabase();

async function setupGroup() {
  const people = {};
  for (const name of ['Alice', 'Bob', 'Carol', 'Dave']) people[name] = await createAuthedAgent({ name });
  const { group } = (await people.Alice.agent.post('/api/groups').send({ name: 'Flat' })).body;
  for (const name of ['Bob', 'Carol']) await people[name].agent.post(`/api/groups/join/${group.inviteCode}`).expect(200);
  return { ...people, group };
}

const byName = (balances) => Object.fromEntries(balances.map((b) => [b.user.name, b.net]));
const payments = (list) => list.map((p) => `${p.from.name}->${p.to.name}:${p.amount}`).sort();

describe('balances and settlements', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setupGroup();
  });

  const g = (path = '') => `/api/groups/${ctx.group._id}${path}`;
  const id = (name) => ctx[name].user.id;
  const addExpense = (payer, amount, names) =>
    ctx[payer].agent
      .post(g('/expenses'))
      .send({
        description: `${payer} paid`,
        amount,
        paidBy: id(payer),
        splitType: 'equal',
        participants: names.map((n) => ({ user: id(n) })),
      })
      .expect(201);

  it('starts with everyone settled', async () => {
    const res = await ctx.Alice.agent.get(g('/balances')).expect(200);
    assert.deepEqual(byName(res.body.balances), { Alice: 0, Bob: 0, Carol: 0 });
    assert.deepEqual(res.body.simplified, []);
    assert.equal(res.body.totalSpent, 0);
  });

  it('computes net balances and simplified payments', async () => {
    await addExpense('Alice', 30000, ['Alice', 'Bob', 'Carol']); // Bob, Carol owe Alice 100 each
    await addExpense('Bob', 20000, ['Bob', 'Carol']); // Carol owes Bob 100

    const { body } = await ctx.Carol.agent.get(g('/balances')).expect(200);
    assert.deepEqual(byName(body.balances), { Alice: 20000, Bob: 0, Carol: -20000 });
    assert.deepEqual(payments(body.simplified), ['Carol->Alice:20000']);
    assert.deepEqual(payments(body.pairwise), ['Bob->Alice:10000', 'Carol->Alice:10000', 'Carol->Bob:10000']);
    assert.equal(body.totalSpent, 50000);
  });

  it('records settlements that move balances toward zero', async () => {
    await addExpense('Alice', 30000, ['Alice', 'Bob', 'Carol']);

    const res = await ctx.Bob.agent
      .post(g('/settlements'))
      .send({ from: id('Bob'), to: id('Alice'), amount: 10000, note: 'UPI' })
      .expect(201);
    assert.equal(res.body.settlement.from.name, 'Bob');

    const { body } = await ctx.Alice.agent.get(g('/balances')).expect(200);
    assert.deepEqual(byName(body.balances), { Alice: 10000, Bob: 0, Carol: -10000 });
    assert.deepEqual(payments(body.simplified), ['Carol->Alice:10000']);
    assert.deepEqual(payments(body.pairwise), ['Carol->Alice:10000']);

    const list = (await ctx.Carol.agent.get(g('/settlements')).expect(200)).body.settlements;
    assert.equal(list.length, 1);
    assert.equal(list[0].note, 'UPI');
  });

  it('validates settlements', async () => {
    await ctx.Alice.agent.post(g('/settlements')).send({ from: id('Bob'), to: id('Bob'), amount: 100 }).expect(400);
    await ctx.Alice.agent.post(g('/settlements')).send({ from: id('Dave'), to: id('Bob'), amount: 100 }).expect(400);
    await ctx.Alice.agent.post(g('/settlements')).send({ from: id('Carol'), to: id('Bob'), amount: 0 }).expect(400);
    await ctx.Dave.agent.post(g('/settlements')).send({ from: id('Carol'), to: id('Bob'), amount: 100 }).expect(404);
    await ctx.Dave.agent.get(g('/balances')).expect(404);
  });

  it('deleting a settlement restores the balance; outsiders cannot delete', async () => {
    await addExpense('Alice', 20000, ['Alice', 'Bob']);
    const { settlement } = (
      await ctx.Bob.agent.post(g('/settlements')).send({ from: id('Bob'), to: id('Alice'), amount: 10000 }).expect(201)
    ).body;

    await ctx.Dave.agent.delete(`/api/settlements/${settlement._id}`).expect(404);
    await ctx.Alice.agent.delete(`/api/settlements/${settlement._id}`).expect(204);

    const { body } = await ctx.Alice.agent.get(g('/balances')).expect(200);
    assert.deepEqual(byName(body.balances), { Alice: 10000, Bob: -10000, Carol: 0 });
  });

  it('still serves group routes under the same prefix', async () => {
    await ctx.Dave.agent.post(`/api/groups/join/${ctx.group.inviteCode}`).expect(200);
    await ctx.Dave.agent.get(g()).expect(200);
  });
});
