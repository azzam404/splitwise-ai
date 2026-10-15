const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { useTestDatabase } = require('./setup');
const { createAuthedAgent } = require('./helpers');

useTestDatabase();

describe('group activity feed', () => {
  let alice, bob, group;
  const g = (path = '') => `/api/groups/${group._id}${path}`;
  const feed = async (agent = alice.agent, query = '') => (await agent.get(g(`/activity${query}`)).expect(200)).body;
  const types = (body) => body.activity.map((a) => a.type);

  beforeEach(async () => {
    alice = await createAuthedAgent({ name: 'Alice' });
    bob = await createAuthedAgent({ name: 'Bob' });
    ({ group } = (await alice.agent.post('/api/groups').send({ name: 'Trip' })).body);
    await bob.agent.post(`/api/groups/join/${group.inviteCode}`).expect(200);
  });

  const addExpense = (body = {}) =>
    alice.agent
      .post(g('/expenses'))
      .send({
        description: 'Dinner',
        amount: 120000,
        paidBy: alice.user.id,
        splitType: 'equal',
        participants: [{ user: alice.user.id }, { user: bob.user.id }],
        ...body,
      })
      .expect(201);

  it('logs group creation and joins, newest first, with the actor populated', async () => {
    const body = await feed();
    assert.deepEqual(types(body), ['member.joined', 'group.created']);
    assert.equal(body.activity[0].actor.name, 'Bob');
    assert.equal(body.activity[1].actor.name, 'Alice');
  });

  it('does not log a repeat join', async () => {
    const res = await bob.agent.post(`/api/groups/join/${group.inviteCode}`).expect(200);
    assert.equal(res.body.group.members.length, 2);
    assert.deepEqual(types(await feed()), ['member.joined', 'group.created']);
  });

  it('keeps a snapshot of expenses through edits and deletion', async () => {
    const { expense } = (await addExpense({ createdVia: 'ai-text' })).body;
    await bob.agent.patch(`/api/expenses/${expense._id}`).send({ amount: 150000 }).expect(200);
    await bob.agent.patch(`/api/expenses/${expense._id}`).send({ description: 'Team dinner' }).expect(200);
    await alice.agent.delete(`/api/expenses/${expense._id}`).expect(204);

    const [deleted, renamed, repriced, created] = (await feed(bob.agent)).activity;
    assert.equal(created.type, 'expense.created');
    assert.deepEqual(created.details, { description: 'Dinner', amount: 120000, createdVia: 'ai-text' });
    assert.equal(repriced.actor.name, 'Bob');
    assert.equal(repriced.details.amount, 150000);
    assert.equal(repriced.details.previousAmount, 120000);
    assert.equal(renamed.details.description, 'Team dinner');
    assert.equal(renamed.details.previousAmount, undefined);
    assert.equal(deleted.type, 'expense.deleted');
    assert.deepEqual(deleted.details, { description: 'Team dinner', amount: 150000 });
  });

  it('logs payments with the names of both people', async () => {
    const { settlement } = (
      await bob.agent.post(g('/settlements')).send({ from: bob.user.id, to: alice.user.id, amount: 60000 }).expect(201)
    ).body;
    await alice.agent.delete(`/api/settlements/${settlement._id}`).expect(204);

    const [deleted, created] = (await feed()).activity;
    assert.equal(created.type, 'settlement.created');
    assert.deepEqual(created.details, { amount: 60000, fromName: 'Bob', toName: 'Alice' });
    assert.equal(deleted.type, 'settlement.deleted');
    assert.equal(deleted.actor.name, 'Alice');
  });

  it('paginates', async () => {
    await addExpense();
    await addExpense();
    const body = await feed(alice.agent, '?limit=2&page=2');
    assert.equal(body.total, 4);
    assert.equal(body.pages, 2);
    assert.deepEqual(types(body), ['member.joined', 'group.created']);
  });

  it('hides the feed from non-members', async () => {
    const outsider = await createAuthedAgent();
    await outsider.agent.get(g('/activity')).expect(404);
  });
});
