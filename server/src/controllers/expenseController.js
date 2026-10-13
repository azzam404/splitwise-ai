const { z } = require('zod');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const AppError = require('../utils/AppError');
const { SPLIT_TYPES, computeSplits } = require('../services/splitCalculator');
const { loadGroupForMember } = require('./groupController');

const { CATEGORIES } = Expense;
const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id');

const participantSchema = z.object({
  user: objectId,
  amount: z.number().int().nonnegative().optional(),
  percent: z.number().min(0).max(100).optional(),
});

const expenseFields = {
  description: z.string().trim().min(1).max(120),
  amount: z.number().int().positive().max(10_000_000_000), // paise; up to ₹10 crore
  category: z.enum(CATEGORIES),
  paidBy: objectId,
  splitType: z.enum(SPLIT_TYPES),
  participants: z.array(participantSchema).min(1).max(50),
  date: z.coerce.date(),
  notes: z.string().trim().max(500),
};

const createExpenseSchema = z.object({
  ...expenseFields,
  createdVia: z.enum(['manual', 'ai-text', 'ai-receipt']).optional(),
  category: expenseFields.category.default('other'),
  date: expenseFields.date.optional(),
  notes: expenseFields.notes.optional(),
});
const updateExpenseSchema = z
  .object(expenseFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const userFields = 'name email avatar';
const populateExpense = (query) => query.populate('paidBy', userFields).populate('splits.user', userFields);

function assertMembers(group, userIds) {
  const outsider = userIds.find((id) => !group.hasMember(id));
  if (outsider) throw new AppError(400, 'Payer and participants must all be members of the group');
}

// Validates membership and computes splits for a create or update payload.
function buildSplits(group, { amount, splitType, paidBy, participants }) {
  assertMembers(group, [paidBy, ...participants.map((p) => p.user)]);
  return computeSplits(amount, splitType, participants);
}

const touchGroup = (groupId) =>
  Group.updateOne({ _id: groupId }, { $set: { updatedAt: new Date() } }, { timestamps: false });

async function loadExpenseForMember(expenseId, userId) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw new AppError(404, 'Expense not found');
  const group = await loadGroupForMember(expense.group, userId).catch(() => {
    throw new AppError(404, 'Expense not found');
  });
  return { expense, group };
}

async function listExpenses(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  const { page, limit } = req.validated.query;

  const [expenses, total] = await Promise.all([
    populateExpense(
      Expense.find({ group: group._id })
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    ),
    Expense.countDocuments({ group: group._id }),
  ]);

  res.json({ expenses, total, page, pages: Math.ceil(total / limit) });
}

async function createExpense(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  const { participants, ...fields } = req.body;
  const splits = buildSplits(group, req.body);

  const expense = await Expense.create({
    ...fields,
    splits,
    group: group._id,
    createdBy: req.user._id,
  });
  await touchGroup(group._id);
  res.status(201).json({ expense: await populateExpense(Expense.findById(expense._id)) });
}

async function getExpense(req, res) {
  const { expense } = await loadExpenseForMember(req.params.expenseId, req.user._id);
  res.json({ expense: await populateExpense(Expense.findById(expense._id)) });
}

async function updateExpense(req, res) {
  const { expense, group } = await loadExpenseForMember(req.params.expenseId, req.user._id);
  const { participants, ...fields } = req.body;

  const next = {
    amount: fields.amount ?? expense.amount,
    splitType: fields.splitType ?? expense.splitType,
    paidBy: fields.paidBy ?? String(expense.paidBy),
    // Without new participants, keep the current ones (and their exact amounts / percents).
    participants:
      participants ??
      expense.splits.map((s) => ({ user: String(s.user), amount: s.amount, percent: s.percent ?? undefined })),
  };
  const splits = buildSplits(group, next);

  Object.assign(expense, fields, { splits, updatedBy: req.user._id });
  await expense.save();
  await touchGroup(group._id);
  res.json({ expense: await populateExpense(Expense.findById(expense._id)) });
}

async function deleteExpense(req, res) {
  const { expense, group } = await loadExpenseForMember(req.params.expenseId, req.user._id);
  await expense.deleteOne();
  await touchGroup(group._id);
  res.status(204).end();
}

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  listQuerySchema,
  listExpenses,
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
};
