const { z } = require('zod');
const Budget = require('../models/Budget');
const { CATEGORIES } = require('../models/Expense');
const AppError = require('../utils/AppError');
const { MONTH_RE, currentMonth, spendingByCategory, budgetStatus } = require('../services/spending');

const month = z.string().regex(MONTH_RE, 'Month must be YYYY-MM');

const monthQuerySchema = z.object({ month: month.optional() });

const upsertBudgetSchema = z.object({
  month,
  category: z.enum(['overall', ...CATEGORIES]),
  limit: z.number().int().positive().max(10_000_000_000), // paise
});

// Attaches spent / percent / status to each budget for the given month.
async function budgetsWithSpending(userId, forMonth) {
  const [budgets, byCategory] = await Promise.all([
    Budget.find({ user: userId, month: forMonth }).lean(),
    spendingByCategory(userId, forMonth),
  ]);
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

  return budgets
    .map((b) => {
      const spent = b.category === 'overall' ? total : byCategory[b.category] || 0;
      return { _id: b._id, month: b.month, category: b.category, limit: b.limit, ...budgetStatus(spent, b.limit) };
    })
    .sort((a, b) => (a.category === 'overall' ? -1 : b.category === 'overall' ? 1 : b.percent - a.percent));
}

async function listBudgets(req, res) {
  const forMonth = req.validated.query.month || currentMonth();
  res.json({ month: forMonth, budgets: await budgetsWithSpending(req.user._id, forMonth) });
}

async function upsertBudget(req, res) {
  const { month: forMonth, category, limit } = req.body;
  await Budget.findOneAndUpdate(
    { user: req.user._id, month: forMonth, category },
    { $set: { limit } },
    { upsert: true, runValidators: true }
  );
  const budgets = await budgetsWithSpending(req.user._id, forMonth);
  res.json({ budget: budgets.find((b) => b.category === category) });
}

async function deleteBudget(req, res) {
  const result = await Budget.deleteOne({ _id: req.params.budgetId, user: req.user._id });
  if (!result.deletedCount) throw new AppError(404, 'Budget not found');
  res.status(204).end();
}

module.exports = { monthQuerySchema, upsertBudgetSchema, budgetsWithSpending, listBudgets, upsertBudget, deleteBudget };
