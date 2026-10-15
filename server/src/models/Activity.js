const mongoose = require('mongoose');

const ACTIVITY_TYPES = [
  'group.created',
  'member.joined',
  'expense.created',
  'expense.updated',
  'expense.deleted',
  'settlement.created',
  'settlement.deleted',
];

// An append-only log entry for a group's activity feed. Details are snapshotted at write
// time so entries still read correctly after the expense or payment is edited or deleted.
const activitySchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement' },
    details: {
      description: String,
      amount: Number, // paise
      previousAmount: Number, // paise, on expense.updated when the amount changed
      createdVia: String,
      fromName: String,
      toName: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
