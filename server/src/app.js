const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const balanceRoutes = require('./routes/balances');
const { budgetRouter, dashboardRouter } = require('./routes/budgets');
const aiRoutes = require('./routes/ai');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', env.trustProxy);

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (env.nodeEnv === 'development') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/groups/:id/expenses', expenseRoutes.groupExpenses);
app.use('/api/groups/:id/ai', aiRoutes.groupAi);
app.use('/api/groups/:id', balanceRoutes.groupBalances);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes.expenses);
app.use('/api/settlements', balanceRoutes.settlements);
app.use('/api/budgets', budgetRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/ai', aiRoutes.aiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
