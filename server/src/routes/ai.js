const { Router } = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/aiController');

// Each AI call costs money, so cap it per user (runs after requireAuth, so req.user is set).
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => String(req.user._id),
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_AI_RATE_LIMIT,
  message: { error: { message: 'Too many AI requests. Try again in a few minutes.' } },
});

// Receipts are kept in memory only long enough to send to the model; nothing is stored.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

// Mounted at /api/ai
const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.get('/status', ctrl.status);
aiRouter.get('/insights', validate(ctrl.insightsQuerySchema, 'query'), aiLimiter, ctrl.insights);

// Mounted at /api/groups/:id/ai
const groupAi = Router({ mergeParams: true });
groupAi.use(requireAuth);
groupAi.post('/parse-expense', aiLimiter, validate(ctrl.parseExpenseSchema), ctrl.parseExpense);
groupAi.post('/scan-receipt', aiLimiter, upload.single('receipt'), ctrl.scanReceipt);

module.exports = { aiRouter, groupAi };
