const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { setAuthCookies, clearAuthCookies } = require('../utils/tokens');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

async function register(req, res) {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError(409, 'Email is already registered');

  const user = await User.create({ name, email, passwordHash: await User.hashPassword(password) });
  setAuthCookies(res, user);
  res.status(201).json({ user });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  if (!user || !(await user.comparePassword(password))) throw new AppError(401, 'Invalid email or password');

  setAuthCookies(res, user);
  res.json({ user });
}

async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError(401, 'No refresh token');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw new AppError(401, 'Refresh token invalid or expired');
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.tokenVersion !== payload.v) throw new AppError(401, 'Refresh token revoked');

  setAuthCookies(res, user);
  res.json({ user });
}

async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const { sub } = jwt.verify(token, env.jwtRefreshSecret);
      await User.updateOne({ _id: sub }, { $inc: { tokenVersion: 1 } });
    } catch {
      // Token already invalid, so there is nothing to revoke.
    }
  }
  clearAuthCookies(res);
  res.status(204).end();
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { registerSchema, loginSchema, register, login, refresh, logout, me };
