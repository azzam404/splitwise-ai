const { Router } = require('express');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/balanceController');
const activityCtrl = require('../controllers/activityController');

// Mounted at /api/groups/:id. Auth is per-route (not router.use) because this prefix
// also matches the group routes, which run their own auth.
const groupBalances = Router({ mergeParams: true });
groupBalances.get('/balances', requireAuth, ctrl.getBalances);
groupBalances.get('/settlements', requireAuth, ctrl.listSettlements);
groupBalances.post('/settlements', requireAuth, validate(ctrl.createSettlementSchema), ctrl.createSettlement);
groupBalances.get('/activity', requireAuth, validate(activityCtrl.listQuerySchema, 'query'), activityCtrl.listActivity);

// Mounted at /api/settlements
const settlements = Router();
settlements.use(requireAuth);
settlements.delete('/:settlementId', ctrl.deleteSettlement);

module.exports = { groupBalances, settlements };
