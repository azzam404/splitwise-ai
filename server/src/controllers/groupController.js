const { z } = require('zod');
const Group = require('../models/Group');
const AppError = require('../utils/AppError');
const { logActivity } = require('../services/activityLog');

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
});

const memberFields = 'name email avatar';

async function loadGroupForMember(groupId, userId) {
  const group = await Group.findById(groupId).populate('members', memberFields);
  if (!group || !group.hasMember(userId)) throw new AppError(404, 'Group not found');
  return group;
}

async function listGroups(req, res) {
  const groups = await Group.find({ members: req.user._id })
    .populate('members', memberFields)
    .sort({ updatedAt: -1 });
  res.json({ groups });
}

async function createGroup(req, res) {
  const group = await Group.create({ ...req.body, members: [req.user._id], createdBy: req.user._id });
  await group.populate('members', memberFields);
  await logActivity({ group: group._id, actor: req.user._id, type: 'group.created' });
  res.status(201).json({ group });
}

async function getGroup(req, res) {
  const group = await loadGroupForMember(req.params.id, req.user._id);
  res.json({ group });
}

async function joinGroup(req, res) {
  const inviteCode = req.params.code.toUpperCase();
  // The filter only matches non-members, so a repeat join is a no-op and is not logged twice.
  const joined = await Group.findOneAndUpdate(
    { inviteCode, members: { $ne: req.user._id } },
    { $push: { members: req.user._id } },
    { returnDocument: 'after' }
  ).populate('members', memberFields);
  if (joined) {
    await logActivity({ group: joined._id, actor: req.user._id, type: 'member.joined' });
    return res.json({ group: joined });
  }

  const group = await Group.findOne({ inviteCode }).populate('members', memberFields);
  if (!group) throw new AppError(404, 'Invalid invite code');
  res.json({ group });
}

module.exports = { createGroupSchema, loadGroupForMember, listGroups, createGroup, getGroup, joinGroup };
