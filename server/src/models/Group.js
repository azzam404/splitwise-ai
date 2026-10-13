const crypto = require('crypto');
const mongoose = require('mongoose');

const generateInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    inviteCode: { type: String, unique: true, default: generateInviteCode },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

groupSchema.index({ members: 1 });

groupSchema.methods.hasMember = function hasMember(userId) {
  return this.members.some((m) => String(m._id || m) === String(userId));
};

module.exports = mongoose.model('Group', groupSchema);
