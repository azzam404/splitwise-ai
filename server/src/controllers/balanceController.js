const { z } = require('zod');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const AppError = require('../utils/AppError');
const { computeBalances, pairwiseDebts, simplifyDebts } = require('../services/debtSimplifier');
const { loadGroupForMember } = require('./groupController');

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id');

const createSettlementSchema = z
  .object({
    from: objectId,
    to: objectId,
    amount: z.number().int().positive().max(10_000_000_000), // paise
    date: z.coerce.date().optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.from !== v.to, { message: 'Payer and receiver must be different people', path: ['to'] });

const userFields = 'name email avatar';

async function getBalances(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: group._id }).select('amount paidBy splits').lean(),
    Settlement.find({ group: group._id }).select('from to amount').lean(),
  ]);

  const members = new Map(group.members.map((m) => [String(m._id), m.toJSON()]));
  const userInfo = (userId) => members.get(userId) || { id: userId, name: 'Former member' };
  const withUsers = (payments) =>
    payments.map((p) => ({ from: userInfo(p.from), to: userInfo(p.to), amount: p.amount }));

  const balances = computeBalances([...members.keys()], expenses, settlements);

  res.json({
    balances: [...balances].map(([userId, b]) => ({ user: userInfo(userId), ...b })),
    simplified: withUsers(simplifyDebts(balances)),
    pairwise: withUsers(pairwiseDebts(expenses, settlements)),
    totalSpent: expenses.reduce((t, e) => t + e.amount, 0),
  });
}

async function listSettlements(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  const settlements = await Settlement.find({ group: group._id })
    .sort({ date: -1, createdAt: -1 })
    .populate('from', userFields)
    .populate('to', userFields);
  res.json({ settlements });
}

async function createSettlement(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  const { from, to } = req.body;
  if (!group.hasMember(from) || !group.hasMember(to)) {
    throw new AppError(400, 'Both people must be members of the group');
  }

  const settlement = await Settlement.create({ ...req.body, group: group._id, createdBy: req.user._id });
  await Group.updateOne({ _id: group._id }, { $set: { updatedAt: new Date() } }, { timestamps: false });
  await settlement.populate([
    { path: 'from', select: userFields },
    { path: 'to', select: userFields },
  ]);
  res.status(201).json({ settlement });
}

async function deleteSettlement(req, res) {
  const settlement = await Settlement.findById(req.params.settlementId);
  if (!settlement) throw new AppError(404, 'Payment not found');
  await loadGroupForMember(settlement.group, req.user._id).catch(() => {
    throw new AppError(404, 'Payment not found');
  });
  await settlement.deleteOne();
  res.status(204).end();
}

module.exports = { createSettlementSchema, getBalances, listSettlements, createSettlement, deleteSettlement };
