import { queryBuilder } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { matchScores } from '../utils/drawMatching.js';

const DRAW_RANGE_MIN = 1;
const DRAW_RANGE_MAX = 45;
const REQUIRED_SCORES = 5;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const validateDrawNumbers = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length !== 5) return false;
  const unique = new Set(numbers);
  if (unique.size !== 5) return false;
  return numbers.every((n) => Number.isInteger(n) && n >= DRAW_RANGE_MIN && n <= DRAW_RANGE_MAX);
};

const generateRandomNumbers = () => {
  const set = new Set();
  while (set.size < 5) set.add(randomInt(DRAW_RANGE_MIN, DRAW_RANGE_MAX));
  return [...set].sort((a, b) => a - b);
};

const generateWeightedNumbers = (freqMap) => {
  const weighted = [];
  for (let i = DRAW_RANGE_MIN; i <= DRAW_RANGE_MAX; i += 1) {
    const weight = Math.max(1, freqMap.get(i) || 1);
    for (let j = 0; j < weight; j += 1) weighted.push(i);
  }

  for (let i = weighted.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }

  const picked = new Set();
  for (const n of weighted) {
    picked.add(n);
    if (picked.size === 5) break;
  }
  if (picked.size < 5) return generateRandomNumbers();
  return [...picked].sort((a, b) => a - b);
};

export const generateDraw = async (drawLogic = 'random') => {
  if (drawLogic === 'random') return generateRandomNumbers();

  const since = new Date();
  since.setMonth(since.getMonth() - 2);

  const scores = await queryBuilder('scores').select('score').gte('played_at', since.toISOString());
  const freqMap = new Map();
  for (let i = DRAW_RANGE_MIN; i <= DRAW_RANGE_MAX; i += 1) freqMap.set(i, 1);
  for (const row of scores.data || []) freqMap.set(row.score, (freqMap.get(row.score) || 1) + 1);

  return generateWeightedNumbers(freqMap);
};

const getActiveSubscribers = async () => {
  const subs = await queryBuilder('subscriptions').select('user_id,plan_type,status').eq('status', 'active');
  return subs.data || [];
};

const getLatestScoresMap = async (userIds) => {
  const scoresResult = await queryBuilder('scores').select('user_id,score,played_at').in('user_id', userIds).order('played_at', { ascending: false });
  const grouped = new Map();
  for (const row of scoresResult.data || []) {
    const arr = grouped.get(row.user_id) || [];
    if (arr.length < 5) arr.push(row.score);
    grouped.set(row.user_id, arr);
  }
  return grouped;
};

const calculatePrizes = (totalPool, winnersByType) => {
  const breakdown = {
    5: totalPool * 0.4,
    4: totalPool * 0.35,
    3: totalPool * 0.25,
  };

  return {
    breakdown,
    individual: {
      5: winnersByType[5] ? breakdown[5] / winnersByType[5] : 0,
      4: winnersByType[4] ? breakdown[4] / winnersByType[4] : 0,
      3: winnersByType[3] ? breakdown[3] / winnersByType[3] : 0,
    },
  };
};

export const simulateDraw = async (drawLogic = 'random') => {
  const winningNumbers = await generateDraw(drawLogic);
  const subscribers = await getActiveSubscribers();
  if (!subscribers.length) throw new ApiError(400, 'No active subscribers');

  const userIds = subscribers.map((s) => s.user_id);
  const scoreMap = await getLatestScoresMap(userIds);

  const winners = [];
  const winnersByType = { 3: 0, 4: 0, 5: 0 };
  let eligibleParticipants = 0;

  for (const sub of subscribers) {
    const scores = scoreMap.get(sub.user_id) || [];
    if (scores.length < REQUIRED_SCORES) continue;
    eligibleParticipants += 1;

    const matches = matchScores(scores, winningNumbers);
    if (matches >= 3) {
      winners.push({ userId: sub.user_id, matchType: matches, scores });
      winnersByType[matches] += 1;
    }
  }

  const monthlyCount = subscribers.filter((x) => x.plan_type === 'monthly').length;
  const yearlyCount = subscribers.filter((x) => x.plan_type === 'yearly').length;
  const revenue = monthlyCount * 9.99 + (yearlyCount * 89.99) / 12;
  const totalPrizePool = revenue * 0.4;

  const prize = calculatePrizes(totalPrizePool, winnersByType);

  return {
    winningNumbers,
    winners,
    winnersByType,
    eligibleParticipants,
    skippedParticipants: subscribers.length - eligibleParticipants,
    prizeBreakdown: prize.breakdown,
    totalPrizePool,
  };
};

export const publishDraw = async (drawLogic = 'random') => {
  const simulation = await simulateDraw(drawLogic);

  const latest = await queryBuilder('draws').select('draw_number').order('draw_number', { ascending: false }).limit(1).maybeSingle();
  const drawNumber = (latest.data?.draw_number || 0) + 1;

  const drawInsert = await queryBuilder('draws').insert({
    draw_number: drawNumber,
    draw_date: new Date().toISOString(),
    winning_numbers: simulation.winningNumbers,
    draw_logic: drawLogic,
    status: 'published',
  }).select('*').single();

  if (drawInsert.error) throw new ApiError(400, drawInsert.error.message);

  const byType = simulation.winnersByType;
  const indiv = {
    5: byType[5] ? simulation.prizeBreakdown[5] / byType[5] : 0,
    4: byType[4] ? simulation.prizeBreakdown[4] / byType[4] : 0,
    3: byType[3] ? simulation.prizeBreakdown[3] / byType[3] : 0,
  };

  if (simulation.winners.length) {
    const rows = simulation.winners.map((winner) => ({
      user_id: winner.userId,
      draw_id: drawInsert.data.id,
      match_type: winner.matchType,
      prize_amount: Number(indiv[winner.matchType].toFixed(2)),
      verification_status: 'pending',
      payout_status: 'pending',
    }));

    await queryBuilder('winners').insert(rows);
  }

  return {
    draw: drawInsert.data,
    winners: simulation.winners,
    message: 'Draw published successfully',
  };
};

export const getCurrentDraw = async () => {
  const draw = await queryBuilder('draws').select('*').eq('status', 'published').order('draw_date', { ascending: false }).limit(1).maybeSingle();
  if (!draw.data) return null;

  const winners = await queryBuilder('winners').select('match_type').eq('draw_id', draw.data.id);
  const winnersByType = { 3: 0, 4: 0, 5: 0 };
  for (const row of winners.data || []) winnersByType[row.match_type] += 1;

  return { draw: draw.data, winnersByType };
};

export const getPreviousDraws = async (limit = 12, page = 1) => {
  const pageSize = Math.min(limit, 50);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const draws = await queryBuilder('draws').select('*', { count: 'exact' }).eq('status', 'published').order('draw_date', { ascending: false }).range(from, to);
  return { draws: draws.data || [], totalCount: draws.count || 0 };
};

export const checkUserMatches = async (userId, drawId) => {
  const draw = await queryBuilder('draws').select('*').eq('id', drawId).single();
  if (draw.error || !draw.data) throw new ApiError(404, 'Draw not found');

  const scores = await queryBuilder('scores').select('score').eq('user_id', userId).order('played_at', { ascending: false }).limit(5);
  const userScores = (scores.data || []).map((x) => x.score);
  const eligibleForDraw = userScores.length >= REQUIRED_SCORES;

  const matchCount = eligibleForDraw ? matchScores(userScores, draw.data.winning_numbers || []) : 0;
  const win = await queryBuilder('winners').select('*').eq('user_id', userId).eq('draw_id', drawId).maybeSingle();

  return {
    eligibleForDraw,
    matchCount,
    prize: win.data?.prize_amount || 0,
    userScores,
    winningNumbers: draw.data.winning_numbers,
  };
};

export const getUserDrawHistory = async (userId) => {
  const wins = await queryBuilder('winners').select('*,draws(*)').eq('user_id', userId).order('created_at', { ascending: false });
  return wins.data || [];
};

export const rolloverJackpot = async (fromDrawId, toDrawId) => {
  const winners = await queryBuilder('winners').select('id,prize_amount').eq('draw_id', fromDrawId).eq('match_type', 5);
  if ((winners.data || []).length) throw new ApiError(409, 'Source draw has jackpot winners; rollover not allowed');

  const from = await queryBuilder('draws').select('*').eq('id', fromDrawId).single();
  const to = await queryBuilder('draws').select('*').eq('id', toDrawId).single();
  if (!from.data || !to.data) throw new ApiError(404, 'Draw not found');

  const previousPool = Number(from.data.rollover_amount || 0);
  const newPool = previousPool + Number(from.data.jackpot_amount || 0);

  await queryBuilder('draws').update({ rollover_amount: newPool }).eq('id', toDrawId);
  await queryBuilder('draws').update({ status: 'rolled_over' }).eq('id', fromDrawId);

  return { message: 'Jackpot rolled over', previousPool, newPool };
};

export const getDrawStatistics = async () => {
  const draws = await queryBuilder('draws').select('id,winning_numbers');
  const winners = await queryBuilder('winners').select('draw_id,prize_amount');

  const numberFreq = new Map();
  for (let i = 1; i <= 45; i += 1) numberFreq.set(i, 0);

  for (const draw of draws.data || []) {
    for (const n of draw.winning_numbers || []) numberFreq.set(n, (numberFreq.get(n) || 0) + 1);
  }

  const commonNumbers = [...numberFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([num]) => num);

  const totalPrizes = (winners.data || []).reduce((sum, row) => sum + Number(row.prize_amount || 0), 0);
  const drawCount = (draws.data || []).length;
  const avgWinners = drawCount ? Number(((winners.data || []).length / drawCount).toFixed(2)) : 0;

  return {
    totalDraws: drawCount,
    totalPrizes: Number(totalPrizes.toFixed(2)),
    commonNumbers,
    avgWinners,
  };
};
