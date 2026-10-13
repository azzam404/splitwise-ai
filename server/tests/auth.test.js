const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { useTestDatabase } = require('./setup');
const { app, createAuthedAgent } = require('./helpers');

useTestDatabase();

describe('auth', () => {
  it('registers a user, sets cookies and never leaks the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'Asha@Example.com', password: 'password123' })
      .expect(201);

    assert.equal(res.body.user.name, 'Asha');
    assert.equal(res.body.user.email, 'asha@example.com');
    assert.equal(res.body.user.passwordHash, undefined);
    const cookies = res.headers['set-cookie'].join(';');
    assert.match(cookies, /accessToken=/);
    assert.match(cookies, /refreshToken=/);
    assert.match(cookies, /HttpOnly/);
  });

  it('rejects invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })
      .expect(400);
    const paths = res.body.error.details.map((d) => d.path);
    for (const field of ['name', 'email', 'password']) assert.ok(paths.includes(field), `missing ${field} error`);
  });

  it('rejects duplicate emails', async () => {
    await createAuthedAgent({ email: 'dup@example.com' });
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'dup@example.com', password: 'password123' })
      .expect(409);
  });

  it('logs in with correct credentials only', async () => {
    await createAuthedAgent({ email: 'login@example.com' });
    await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'wrong-pass' }).expect(401);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);
    assert.equal(res.body.user.email, 'login@example.com');
  });

  it('protects /me and returns the current user', async () => {
    await request(app).get('/api/auth/me').expect(401);
    const { agent, user } = await createAuthedAgent();
    const res = await agent.get('/api/auth/me').expect(200);
    assert.equal(res.body.user.id, user.id);
  });

  it('refreshes tokens and revokes them on logout', async () => {
    const { agent } = await createAuthedAgent();
    const res = await agent.post('/api/auth/refresh').expect(200);
    const refreshCookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

    await agent.post('/api/auth/logout').expect(204);

    // A refresh token captured before logout must no longer work.
    await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie.split(';')[0]).expect(401);
  });
});
