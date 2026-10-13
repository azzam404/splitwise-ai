const mongoose = require('mongoose');
const { CATEGORIES } = require('./Expense');

// A personal monthly spending limit, either overall or for one category.
const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    category: { type: String, enum: ['overall', ...CATEGORIES], required: true },
    limit: { type: Number, required: true, min: 1 }, // paise
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
