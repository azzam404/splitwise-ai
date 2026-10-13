const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = req.cookies?.accessToken || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return next(new AppError(401, 'Not authenticated'));

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch {
    return next(new AppError(401, 'Session expired'));
  }

  const user = await User.findById(payload.sub);
  if (!user) return next(new AppError(401, 'User no longer exists'));
  req.user = user;
  next();
}

module.exports = requireAuth;
