// Shared test lifecycle: one in-memory MongoDB per test file, wiped between tests.
// Jest is not used because its VM sandbox breaks the MongoDB v7 driver handshake.
const { before, after, afterEach } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

let mongod;

function useTestDatabase() {
  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  });

  after(async () => {
    await mongoose.disconnect();
    await mongod?.stop();
  });
}

module.exports = { useTestDatabase };
