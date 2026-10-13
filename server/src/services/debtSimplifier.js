// Balance maths for a group. All amounts are integer paise.
// A positive net balance means the group owes that user money; negative means they owe.

class MaxHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].amount >= a[i].amount) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }

  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let largest = i;
        if (l < a.length && a[l].amount > a[largest].amount) largest = l;
        if (r < a.length && a[r].amount > a[largest].amount) largest = r;
        if (largest === i) break;
        [a[largest], a[i]] = [a[i], a[largest]];
        i = largest;
      }
    }
    return top;
  }
}

const id = (v) => String(v?._id ?? v);

/**
 * Net balance per user from expenses and recorded settlements.
 * @returns {Map<string, {paid: number, share: number, sent: number, received: number, net: number}>}
 */
function computeBalances(memberIds, expenses, settlements = []) {
  const balances = new Map(memberIds.map((m) => [id(m), { paid: 0, share: 0, sent: 0, received: 0, net: 0 }]));
  const entry = (user) => {
    const key = id(user);
    if (!balances.has(key)) balances.set(key, { paid: 0, share: 0, sent: 0, received: 0, net: 0 });
    return balances.get(key);
  };

  for (const e of expenses) {
    entry(e.paidBy).paid += e.amount;
    for (const s of e.splits) entry(s.user).share += s.amount;
  }
  // Paying someone back reduces what you owe (your net goes up) and what they're owed.
  for (const s of settlements) {
    entry(s.from).sent += s.amount;
    entry(s.to).received += s.amount;
  }
  for (const b of balances.values()) b.net = b.paid - b.share + b.sent - b.received;
  return balances;
}

/**
 * Payments as they'd happen with no simplification: every participant pays back
 * each payer directly, netted per pair of people.
 */
function pairwiseDebts(expenses, settlements = []) {
  const owed = new Map(); // "debtor|creditor" -> paise
  const add = (from, to, amount) => {
    if (from === to || amount === 0) return;
    const key = `${from}|${to}`;
    owed.set(key, (owed.get(key) || 0) + amount);
  };
  for (const e of expenses) for (const s of e.splits) add(id(s.user), id(e.paidBy), s.amount);
  for (const s of settlements) add(id(s.to), id(s.from), s.amount);

  const debts = [];
  for (const [key, amount] of owed) {
    const [from, to] = key.split('|');
    const net = amount - (owed.get(`${to}|${from}`) || 0);
    if (net > 0) debts.push({ from, to, amount: net });
  }
  return debts;
}

/**
 * Settles everyone exactly in at most (people with a non-zero balance - 1) payments:
 *   1. pair up debtors and creditors whose amounts match exactly (one payment each), then
 *   2. greedily match the largest remaining debtor with the largest remaining creditor.
 * Finding the true minimum is NP-hard; this is the standard practical approach.
 * @param {Map<string, {net: number}>|Array<[string, number]>} balances
 * @returns {{from: string, to: string, amount: number}[]}
 */
function simplifyDebts(balances) {
  const credits = [];
  const debts = [];
  for (const [user, value] of balances) {
    const net = typeof value === 'number' ? value : value.net;
    if (net > 0) credits.push({ user, amount: net });
    else if (net < 0) debts.push({ user, amount: -net });
  }

  const payments = [];

  // Step 1: exact matches.
  const creditorsByAmount = new Map();
  for (const c of credits) {
    if (!creditorsByAmount.has(c.amount)) creditorsByAmount.set(c.amount, []);
    creditorsByAmount.get(c.amount).push(c);
  }
  const matched = new Set();
  for (const d of debts) {
    const creditor = creditorsByAmount.get(d.amount)?.pop();
    if (creditor) {
      payments.push({ from: d.user, to: creditor.user, amount: d.amount });
      matched.add(d).add(creditor);
    }
  }

  // Step 2: greedy on whatever is left.
  const creditors = new MaxHeap();
  const debtors = new MaxHeap();
  for (const c of credits) if (!matched.has(c)) creditors.push(c);
  for (const d of debts) if (!matched.has(d)) debtors.push(d);

  while (creditors.size && debtors.size) {
    const creditor = creditors.pop();
    const debtor = debtors.pop();
    const amount = Math.min(creditor.amount, debtor.amount);
    payments.push({ from: debtor.user, to: creditor.user, amount });

    if (creditor.amount > amount) creditors.push({ user: creditor.user, amount: creditor.amount - amount });
    if (debtor.amount > amount) debtors.push({ user: debtor.user, amount: debtor.amount - amount });
  }
  return payments;
}

module.exports = { computeBalances, pairwiseDebts, simplifyDebts, MaxHeap };
