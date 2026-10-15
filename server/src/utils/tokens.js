const jwt = require('jsonwebtoken');
const env = require('../config/env');

const unitMs = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 };
const toMs = (ttl) => Number(ttl.slice(0, -1)) * unitMs[ttl.slice(-1)];

const cookieBase = () => ({
  httpOnly: true,
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
});

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: String(user._id), v: user.tokenVersion }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenTtl,
  });
}

function setAuthCookies(res, user) {
  res.cookie('accessToken', signAccessToken(user), { ...cookieBase(), maxAge: toMs(env.accessTokenTtl) });
  res.cookie('refreshToken', signRefreshToken(user), {
    ...cookieBase(),
    path: '/api/auth',
    maxAge: toMs(env.refreshTokenTtl),
  });
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', cookieBase());
  res.clearCookie('refreshToken', { ...cookieBase(), path: '/api/auth' });
}

module.exports = { setAuthCookies, clearAuthCookies };
