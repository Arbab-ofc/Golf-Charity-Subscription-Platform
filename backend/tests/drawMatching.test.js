import test from 'node:test';
import assert from 'node:assert/strict';
import { matchScores, normalizeDrawScores } from '../src/utils/drawMatching.js';

test('normalizeDrawScores removes duplicates and out-of-range values', () => {
  const normalized = normalizeDrawScores([45, 45, 22, 0, 99, 22, 13]);
  assert.deepEqual(normalized, [45, 22, 13]);
});

test('matchScores counts unique overlaps only', () => {
  const matches = matchScores([45, 45, 45, 22, 42], [45, 3, 10, 22, 11]);
  assert.equal(matches, 2);
});
