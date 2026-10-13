const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');

connectDB(env.mongoUri)
  .then(() => app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`)))
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
