require('dotenv').config({ quiet: true });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/splitwise-ai',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
};

env.isProd = env.nodeEnv === 'production';

if (env.isProd && (env.jwtAccessSecret.startsWith('dev-') || env.jwtRefreshSecret.startsWith('dev-'))) {
  throw new Error('JWT secrets must be set in production');
}

module.exports = env;
