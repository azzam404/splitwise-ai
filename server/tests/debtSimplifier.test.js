const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeBalances, pairwiseDebts, simplifyDebts, MaxHeap } = require('../src/services/debtSimplifier');

const expense = (paidBy, shares) => ({
  paidBy,
  amount: Object.values(shares).reduce((a, b) => a + b, 0),
  splits: Object.entries(shares).map(([user, amount]) => ({ user, amount })),
});

const nets = (balances) => Object.fromEntries([...balances].map(([u, b]) => [u, b.net]));

// Applies payments to balances and returns what's left; everyone should end at zero.
function settle(netMap, payments) {
  const left = { ...netMap };
  for (const p of payments) {
    left[p.from] += p.amount;
    left[p.to] -= p.amount;
  }
  return left;
}

describe('MaxHeap', () => {
  it('pops items in descending order', () => {
    const heap = new MaxHeap();
    for (const amount of [5, 1, 9, 3, 7, 9, 2]) heap.push({ amount });
    const out = [];
    while (heap.size) out.push(heap.pop().amount);
    assert.deepEqual(out, [9, 9, 7, 5, 3, 2, 1]);
  });
});

describe('computeBalances', () => {
  it('nets what each person paid against their share', () => {
    const balances = computeBalances(['a', 'b', 'c'], [expense('a', { a: 100, b: 100, c: 100 })]);
    assert.deepEqual(nets(balances), { a: 200, b: -100, c: -100 });
    assert.deepEqual(balances.get('a'), { paid: 300, share: 100, sent: 0, received: 0, net: 200 });
  });

  it('applies settlements and includes members with no activity', () => {
    const balances = computeBalances(
      ['a', 'b', 'c', 'd'],
      [expense('a', { a: 100, b: 100, c: 100 })],
      [{ from: 'b', to: 'a', amount: 100 }]
    );
    assert.deepEqual(nets(balances), { a: 100, b: 0, c: -100, d: 0 });
  });

  it('always sums to zero', () => {
    const balances = computeBalances(
      ['a', 'b', 'c'],
      [expense('a', { a: 333, b: 333, c: 334 }), expense('c', { a: 50, b: 450 })],
      [{ from: 'b', to: 'c', amount: 120 }]
    );
    assert.equal([...balances.values()].reduce((t, b) => t + b.net, 0), 0);
  });
});

describe('pairwiseDebts', () => {
  it('nets debts between each pair of people', () => {
    const debts = pairwiseDebts([expense('a', { a: 50, b: 50 }), expense('b', { a: 30, b: 30 })]);
    assert.deepEqual(debts, [{ from: 'b', to: 'a', amount: 20 }]);
  });
});

describe('simplifyDebts', () => {
  it('returns nothing when everyone is settled', () => {
    assert.deepEqual(simplifyDebts(new Map([['a', { net: 0 }], ['b', { net: 0 }]])), []);
  });

  it('collapses a chain of debts into one payment', () => {
    // a owes b 100, b owes c 100  =>  a pays c directly.
    const balances = computeBalances(['a', 'b', 'c'], [expense('b', { a: 100 }), expense('c', { b: 100 })]);
    assert.equal(pairwiseDebts([expense('b', { a: 100 }), expense('c', { b: 100 })]).length, 2);
    assert.deepEqual(simplifyDebts(balances), [{ from: 'a', to: 'c', amount: 100 }]);
  });

  it('matches the largest debtor with the largest creditor', () => {
    const payments = simplifyDebts([
      ['a', 500],
      ['b', 300],
      ['c', -600],
      ['d', -200],
    ]);
    assert.deepEqual(payments, [
      { from: 'c', to: 'a', amount: 500 },
      { from: 'd', to: 'b', amount: 200 },
      { from: 'c', to: 'b', amount: 100 },
    ]);
  });

  it('settles exact matches first so it does not over-split', () => {
    // Pure greedy would make 4 payments here; matching 3 with -3 first needs only 3.
    const payments = simplifyDebts([
      ['a', 400],
      ['b', 300],
      ['c', -300],
      ['d', -200],
      ['e', -200],
    ]);
    assert.equal(payments.length, 3);
    assert.deepEqual(payments[0], { from: 'c', to: 'b', amount: 300 });
  });

  it('settles random groups exactly in at most n-1 payments', () => {
    for (let round = 0; round < 300; round += 1) {
      const people = Array.from({ length: 2 + Math.floor(Math.random() * 8) }, (_, i) => `u${i}`);
      const expenses = Array.from({ length: 1 + Math.floor(Math.random() * 15) }, () => {
        const payer = people[Math.floor(Math.random() * people.length)];
        const shares = {};
        for (const p of people) if (Math.random() < 0.7) shares[p] = 1 + Math.floor(Math.random() * 100_000);
        if (!Object.keys(shares).length) shares[payer] = 100;
        return expense(payer, shares);
      });

      const balances = computeBalances(people, expenses);
      const payments = simplifyDebts(balances);
      const left = settle(nets(balances), payments);
      const nonZero = [...balances.values()].filter((b) => b.net !== 0).length;

      assert.ok(Object.values(left).every((v) => v === 0), 'every balance must end at zero');
      assert.ok(payments.length <= Math.max(0, nonZero - 1), 'at most n-1 payments');
      assert.ok(payments.every((p) => p.amount > 0 && Number.isInteger(p.amount)));
      assert.deepEqual(settle(nets(balances), pairwiseDebts(expenses)), left, 'pairwise debts settle too');
    }
  });
});
