const Activity = require('../models/Activity');

// Records a feed entry. The feed is secondary to the action itself, so a failed write is
// logged rather than failing the request that triggered it.
async function logActivity(entry) {
  try {
    await Activity.create(entry);
  } catch (err) {
    console.error('Failed to record activity:', err.message);
  }
}

module.exports = { logActivity };
