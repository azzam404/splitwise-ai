const { Router } = require('express');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const budgets = require('../controllers/budgetController');
const dashboard = require('../controllers/dashboardController');

// Mounted at /api/budgets
const budgetRouter = Router();
budgetRouter.use(requireAuth);
budgetRouter.get('/', validate(budgets.monthQuerySchema, 'query'), budgets.listBudgets);
budgetRouter.put('/', validate(budgets.upsertBudgetSchema), budgets.upsertBudget);
budgetRouter.delete('/:budgetId', budgets.deleteBudget);

// Mounted at /api/dashboard
const dashboardRouter = Router();
dashboardRouter.use(requireAuth);
dashboardRouter.get('/summary', validate(budgets.monthQuerySchema, 'query'), dashboard.getSummary);

module.exports = { budgetRouter, dashboardRouter };
