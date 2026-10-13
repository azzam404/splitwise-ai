// Turns a split request into per-user shares. All amounts are integer paise,
// and the returned shares always sum exactly to the expense amount.
const AppError = require('../utils/AppError');

const SPLIT_TYPES = ['equal', 'exact', 'percentage'];

// Spreads leftover paise one at a time, so no share differs from its ideal value by more than 1 paisa.
function distributeRemainder(shares, remainder, order) {
  for (let i = 0; i < remainder; i += 1) shares[order[i % order.length]] += 1;
  return shares;
}

function splitEqual(amount, participants) {
  const base = Math.floor(amount / participants.length);
  const shares = participants.map(() => base);
  const order = participants.map((_, i) => i);
  return distributeRemainder(shares, amount - base * participants.length, order);
}

function splitExact(amount, participants) {
  const shares = participants.map((p) => p.amount);
  if (shares.some((s) => !Number.isInteger(s) || s < 0)) {
    throw new AppError(400, 'Exact split amounts must be non-negative whole paise');
  }
  const total = shares.reduce((a, b) => a + b, 0);
  if (total !== amount) {
    throw new AppError(400, `Exact split amounts add up to ${total}, but the expense is ${amount}`);
  }
  return shares;
}

function splitPercentage(amount, participants) {
  const percents = participants.map((p) => p.percent);
  if (percents.some((p) => typeof p !== 'number' || p < 0 || p > 100)) {
    throw new AppError(400, 'Percentages must be between 0 and 100');
  }
  const total = percents.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new AppError(400, `Percentages add up to ${Number(total.toFixed(2))}, not 100`);
  }

  const exact = percents.map((p) => (amount * p) / 100);
  const shares = exact.map(Math.floor);
  const remainder = amount - shares.reduce((a, b) => a + b, 0);
  // Largest-remainder method: leftover paise go to whoever lost the most to rounding.
  const order = exact.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
  return distributeRemainder(shares, remainder, order);
}

/**
 * @param {number} amount total in paise (positive integer)
 * @param {'equal'|'exact'|'percentage'} splitType
 * @param {{user: string, amount?: number, percent?: number}[]} participants
 * @returns {{user: string, amount: number, percent?: number}[]}
 */
function computeSplits(amount, splitType, participants) {
  if (!Number.isInteger(amount) || amount <= 0) throw new AppError(400, 'Amount must be a positive number of paise');
  if (!SPLIT_TYPES.includes(splitType)) throw new AppError(400, `Unknown split type: ${splitType}`);
  if (!participants?.length) throw new AppError(400, 'At least one participant is required');

  const ids = participants.map((p) => String(p.user));
  if (new Set(ids).size !== ids.length) throw new AppError(400, 'Each participant can appear only once');

  const calculators = { equal: splitEqual, exact: splitExact, percentage: splitPercentage };
  const shares = calculators[splitType](amount, participants);

  return participants.map((p, i) => ({
    user: String(p.user),
    amount: shares[i],
    ...(splitType === 'percentage' && { percent: p.percent }),
  }));
}

module.exports = { SPLIT_TYPES, computeSplits };
