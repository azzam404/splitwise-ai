const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeSplits } = require('../src/services/splitCalculator');

const sum = (splits) => splits.reduce((t, s) => t + s.amount, 0);
const amounts = (splits) => splits.map((s) => s.amount);
const users = (...ids) => ids.map((user) => ({ user }));

describe('computeSplits', () => {
  describe('equal', () => {
    it('splits evenly when divisible', () => {
      assert.deepEqual(amounts(computeSplits(30000, 'equal', users('a', 'b', 'c'))), [10000, 10000, 10000]);
    });

    it('hands leftover paise to the first participants and keeps the total exact', () => {
      const splits = computeSplits(10000, 'equal', users('a', 'b', 'c'));
      assert.deepEqual(amounts(splits), [3334, 3333, 3333]);
      assert.equal(sum(splits), 10000);
    });

    it('handles more people than paise', () => {
      const splits = computeSplits(2, 'equal', users('a', 'b', 'c'));
      assert.deepEqual(amounts(splits), [1, 1, 0]);
    });
  });

  describe('exact', () => {
    it('accepts amounts that add up to the total', () => {
      const splits = computeSplits(5000, 'exact', [
        { user: 'a', amount: 3000 },
        { user: 'b', amount: 2000 },
      ]);
      assert.deepEqual(amounts(splits), [3000, 2000]);
    });

    it('rejects amounts that do not add up', () => {
      assert.throws(
        () => computeSplits(5000, 'exact', [{ user: 'a', amount: 3000 }, { user: 'b', amount: 1000 }]),
        /add up to 4000/
      );
    });

    it('rejects fractional or negative amounts', () => {
      assert.throws(() => computeSplits(100, 'exact', [{ user: 'a', amount: 50.5 }, { user: 'b', amount: 49.5 }]));
      assert.throws(() => computeSplits(100, 'exact', [{ user: 'a', amount: 150 }, { user: 'b', amount: -50 }]));
    });
  });

  describe('percentage', () => {
    it('splits by percentage and keeps the percent on each share', () => {
      const splits = computeSplits(20000, 'percentage', [
        { user: 'a', percent: 50 },
        { user: 'b', percent: 30 },
        { user: 'c', percent: 20 },
      ]);
      assert.deepEqual(amounts(splits), [10000, 6000, 4000]);
      assert.equal(splits[1].percent, 30);
    });

    it('uses largest-remainder rounding so the total is exact', () => {
      const splits = computeSplits(100, 'percentage', [
        { user: 'a', percent: 33.33 },
        { user: 'b', percent: 33.33 },
        { user: 'c', percent: 33.34 },
      ]);
      assert.equal(sum(splits), 100);
      assert.deepEqual(amounts(splits), [33, 33, 34]);
    });

    it('rejects percentages that do not total 100', () => {
      assert.throws(
        () => computeSplits(100, 'percentage', [{ user: 'a', percent: 50 }, { user: 'b', percent: 40 }]),
        /not 100/
      );
    });
  });

  it('validates common inputs', () => {
    assert.throws(() => computeSplits(0, 'equal', users('a')), /positive/);
    assert.throws(() => computeSplits(10.5, 'equal', users('a')), /positive/);
    assert.throws(() => computeSplits(100, 'weird', users('a')), /Unknown split type/);
    assert.throws(() => computeSplits(100, 'equal', []), /At least one/);
    assert.throws(() => computeSplits(100, 'equal', users('a', 'a')), /only once/);
  });

  it('always sums to the amount across many random equal and percentage splits', () => {
    for (let i = 0; i < 500; i += 1) {
      const amount = 1 + Math.floor(Math.random() * 1_000_000);
      const n = 1 + Math.floor(Math.random() * 8);
      const ids = Array.from({ length: n }, (_, k) => `u${k}`);
      assert.equal(sum(computeSplits(amount, 'equal', users(...ids))), amount);

      const weights = ids.map(() => Math.random() + 0.01);
      const total = weights.reduce((a, b) => a + b, 0);
      const percents = weights.map((w) => (w / total) * 100);
      const splits = computeSplits(amount, 'percentage', ids.map((user, k) => ({ user, percent: percents[k] })));
      assert.equal(sum(splits), amount);
    }
  });
});
