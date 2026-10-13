const mongoose = require('mongoose');
const { SPLIT_TYPES } = require('../services/splitCalculator');

const CATEGORIES = [
  'food',
  'groceries',
  'travel',
  'transport',
  'rent',
  'utilities',
  'entertainment',
  'shopping',
  'health',
  'other',
];

const splitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 }, // paise
    percent: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    description: { type: String, required: true, trim: true, maxlength: 120 },
    // All money is stored as integer paise to avoid floating-point rounding errors.
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    category: { type: String, enum: CATEGORIES, default: 'other' },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    splitType: { type: String, enum: SPLIT_TYPES, required: true },
    splits: { type: [splitSchema], required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    receiptUrl: { type: String, default: '' },
    createdVia: { type: String, enum: ['manual', 'ai-text', 'ai-receipt'], default: 'manual' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

expenseSchema.index({ group: 1, date: -1, createdAt: -1 });
expenseSchema.index({ 'splits.user': 1, date: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
module.exports.CATEGORIES = CATEGORIES;
