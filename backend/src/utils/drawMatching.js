const DRAW_RANGE_MIN = 1;
const DRAW_RANGE_MAX = 45;

const inRangeScore = (value) => Number.isInteger(value) && value >= DRAW_RANGE_MIN && value <= DRAW_RANGE_MAX;

export const normalizeDrawScores = (scores = []) =>
  [...new Set(scores.filter((value) => inRangeScore(value)))];

export const matchScores = (userScores, winningNumbers) => {
  const uniqueUserScores = normalizeDrawScores(userScores);
  const winningSet = new Set(normalizeDrawScores(winningNumbers));
  return uniqueUserScores.filter((score) => winningSet.has(score)).length;
};
