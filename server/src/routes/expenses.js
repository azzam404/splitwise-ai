const { Router } = require('express');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/expenseController');

// Mounted at /api/groups/:id/expenses
const groupExpenses = Router({ mergeParams: true });
groupExpenses.use(requireAuth);
groupExpenses.get('/', validate(ctrl.listQuerySchema, 'query'), ctrl.listExpenses);
groupExpenses.post('/', validate(ctrl.createExpenseSchema), ctrl.createExpense);

// Mounted at /api/expenses
const expenses = Router();
expenses.use(requireAuth);
expenses.get('/:expenseId', ctrl.getExpense);
expenses.patch('/:expenseId', validate(ctrl.updateExpenseSchema), ctrl.updateExpense);
expenses.delete('/:expenseId', ctrl.deleteExpense);

module.exports = { groupExpenses, expenses };
