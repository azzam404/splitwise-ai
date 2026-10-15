const { z } = require('zod');
const Activity = require('../models/Activity');
const { loadGroupForMember } = require('./groupController');

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

async function listActivity(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  const { page, limit } = req.validated.query;

  const [activity, total] = await Promise.all([
    Activity.find({ group: group._id })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'name email avatar'),
    Activity.countDocuments({ group: group._id }),
  ]);

  res.json({ activity, total, page, pages: Math.ceil(total / limit) });
}

module.exports = { listQuerySchema, listActivity };
