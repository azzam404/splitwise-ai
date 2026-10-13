const request = require('supertest');
const app = require('../src/app');

let counter = 0;

// Registers a fresh user and returns a supertest agent that keeps its auth cookies.
async function createAuthedAgent(overrides = {}) {
  counter += 1;
  const agent = request.agent(app);
  const body = {
    name: `User ${counter}`,
    email: `user${counter}@example.com`,
    password: 'password123',
    ...overrides,
  };
  const res = await agent.post('/api/auth/register').send(body).expect(201);
  return { agent, user: res.body.user };
}

module.exports = { app, createAuthedAgent };
