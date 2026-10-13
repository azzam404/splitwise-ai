const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Settlement = require('../models/Settlement');
const { computeBalances } = require('../services/debtSimplifier');
const { currentMonth, spendingByCategory, monthlyTrend } = require('../services/spending');
const { budgetsWithSpending } = require('./budgetController');

// Net balance per group for one user, plus the totals owed to / by them.
async function balancesAcrossGroups(userId) {
  const groups = await Group.find({ members: userId }).select('name members').lean();
  const groupIds = groups.map((g) => g._id);
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: { $in: groupIds } }).select('group amount paidBy splits').lean(),
    Settlement.find({ group: { $in: groupIds } }).select('group from to amount').lean(),
  ]);

  const me = String(userId);
  const perGroup = groups.map((g) => {
    const inGroup = (doc) => String(doc.group) === String(g._id);
    const balances = computeBalances(g.members, expenses.filter(inGroup), settlements.filter(inGroup));
    return { group: { _id: g._id, name: g.name }, net: balances.get(me)?.net ?? 0 };
  });

  return {
    owedToYou: perGroup.reduce((t, g) => t + Math.max(0, g.net), 0),
    youOwe: perGroup.reduce((t, g) => t + Math.max(0, -g.net), 0),
    groups: perGroup.filter((g) => g.net !== 0).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
  };
}

async function getSummary(req, res) {
  const userId = req.user._id;
  const month = req.validated.query.month || currentMonth();

  const [byCategory, trend, budgets, balances, recent] = await Promise.all([
    spendingByCategory(userId, month),
    monthlyTrend(userId, month, 6),
    budgetsWithSpending(userId, month),
    balancesAcrossGroups(userId),
    Expense.find({ 'splits.user': userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .select('description amount category date group paidBy splits')
      .populate('group', 'name')
      .populate('paidBy', 'name')
      .lean(),
  ]);

  const totalSpent = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const previous = trend.at(-2)?.amount ?? 0;

  res.json({
    month,
    totalSpent,
    previousMonthSpent: previous,
    byCategory: Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    trend,
    budgets,
    alerts: budgets.filter((b) => b.status !== 'ok'),
    balances,
    recentExpenses: recent.map((e) => ({
      _id: e._id,
      description: e.description,
      category: e.category,
      date: e.date,
      amount: e.amount,
      yourShare: e.splits.find((s) => String(s.user) === String(userId))?.amount ?? 0,
      group: e.group,
      paidBy: { id: e.paidBy._id, name: e.paidBy.name },
    })),
  });
}

module.exports = { getSummary, balancesAcrossGroups };
