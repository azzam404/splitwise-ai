const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { useTestDatabase } = require('./setup');
const { app, createAuthedAgent } = require('./helpers');

useTestDatabase();

describe('groups', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/groups').expect(401);
  });

  it('creates a group with the creator as the only member', async () => {
    const { agent, user } = await createAuthedAgent();
    const res = await agent.post('/api/groups').send({ name: 'Goa Trip' }).expect(201);

    assert.equal(res.body.group.name, 'Goa Trip');
    assert.match(res.body.group.inviteCode, /^[0-9A-F]{8}$/);
    assert.deepEqual(
      res.body.group.members.map((m) => m.id),
      [user.id]
    );
  });

  it('lets another user join by invite code, once', async () => {
    const { agent: owner } = await createAuthedAgent();
    const { agent: friend, user: friendUser } = await createAuthedAgent();
    const { group } = (await owner.post('/api/groups').send({ name: 'Flat 4B' })).body;

    await friend.post(`/api/groups/join/${group.inviteCode.toLowerCase()}`).expect(200);
    const res = await friend.post(`/api/groups/join/${group.inviteCode}`).expect(200);

    assert.equal(res.body.group.members.length, 2);
    assert.ok(res.body.group.members.some((m) => m.id === friendUser.id));
    assert.equal((await friend.get('/api/groups').expect(200)).body.groups.length, 1);
  });

  it('hides groups from non-members', async () => {
    const { agent: owner } = await createAuthedAgent();
    const { agent: stranger } = await createAuthedAgent();
    const { group } = (await owner.post('/api/groups').send({ name: 'Private' })).body;

    await stranger.get(`/api/groups/${group._id}`).expect(404);
    await owner.get(`/api/groups/${group._id}`).expect(200);
  });

  it('returns 400 for malformed ids and 404 for bad invite codes', async () => {
    const { agent } = await createAuthedAgent();
    await agent.get('/api/groups/not-an-id').expect(400);
    await agent.post('/api/groups/join/BADCODE1').expect(404);
  });
});
