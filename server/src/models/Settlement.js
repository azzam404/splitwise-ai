const mongoose = require('mongoose');

// A repayment between two group members ("Rahul paid Azzam ₹500").
const settlementSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 }, // paise
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

settlementSchema.index({ group: 1, date: -1, createdAt: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
