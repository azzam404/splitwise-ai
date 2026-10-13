// Starts the API against a throwaway in-memory MongoDB, so no local install is needed.
// Data is lost when the process exits; use MONGO_URI with `npm run dev` for persistence.
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('splitwise-ai');
  console.log('In-memory MongoDB started (data resets on exit)');

  const stop = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  require('../src/server');
})();
