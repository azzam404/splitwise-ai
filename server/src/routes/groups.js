const { Router } = require('express');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/groupController');

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listGroups);
router.post('/', validate(ctrl.createGroupSchema), ctrl.createGroup);
router.post('/join/:code', ctrl.joinGroup);
router.get('/:id', ctrl.getGroup);

module.exports = router;
