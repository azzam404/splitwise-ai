// Personal spending maths. "Spending" means the user's own share of expenses,
// not what they paid on behalf of others. Months are 'YYYY-MM' in UTC, matching how
// expense dates are stored.
const mongoose = require('mongoose');
const Expense = require('../models/Expense');

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const currentMonth = () => new Date().toISOString().slice(0, 7);

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

// The `count` months ending with `month`, oldest first.
function previousMonths(month, count) {
  const [y, m] = month.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

const myShares = (userId, start, end) => [
  { $match: { 'splits.user': new mongoose.Types.ObjectId(String(userId)), date: { $gte: start, $lt: end } } },
  { $unwind: '$splits' },
  { $match: { 'splits.user': new mongoose.Types.ObjectId(String(userId)) } },
];

/** @returns {Promise<Record<string, number>>} category -> paise */
async function spendingByCategory(userId, month) {
  const { start, end } = monthRange(month);
  const rows = await Expense.aggregate([
    ...myShares(userId, start, end),
    { $group: { _id: '$category', amount: { $sum: '$splits.amount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.amount]));
}

/** @returns {Promise<{month: string, amount: number}[]>} oldest first, zero-filled */
async function monthlyTrend(userId, month, count = 6) {
  const months = previousMonths(month, count);
  const { start } = monthRange(months[0]);
  const { end } = monthRange(month);
  const rows = await Expense.aggregate([
    ...myShares(userId, start, end),
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
        amount: { $sum: '$splits.amount' },
      },
    },
  ]);
  const byMonth = Object.fromEntries(rows.map((r) => [r._id, r.amount]));
  return months.map((m) => ({ month: m, amount: byMonth[m] || 0 }));
}

// Budget health: 'ok' below 80%, 'warning' from 80% to 100%, 'over' past the limit.
function budgetStatus(spent, limit) {
  const percent = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
  const status = spent > limit ? 'over' : percent >= 80 ? 'warning' : 'ok';
  return { spent, percent, status, remaining: limit - spent };
}

module.exports = { MONTH_RE, currentMonth, monthRange, previousMonths, spendingByCategory, monthlyTrend, budgetStatus };
