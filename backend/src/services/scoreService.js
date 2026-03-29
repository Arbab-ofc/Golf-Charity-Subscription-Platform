import { queryBuilder } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';

const ensureScoreInRange = (value) => {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 45) throw new ApiError(400, 'Score must be an integer between 1 and 45');
  return score;
};

const ensureDateNotFuture = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Invalid playedAt date');
  if (date > new Date()) throw new ApiError(400, 'playedAt cannot be in the future');
  return date.toISOString();
};

export const addScore = async (userId, score, playedAt) => {
  const validScore = ensureScoreInRange(score);
  const validPlayedAt = ensureDateNotFuture(playedAt || new Date().toISOString());

  const existing = await queryBuilder('scores')
    .select('id')
    .eq('user_id', userId)
    .eq('played_at', validPlayedAt)
    .limit(1)
    .maybeSingle();

  if (existing.data) throw new ApiError(409, 'Score already exists for this playedAt timestamp');

  const insert = await queryBuilder('scores')
    .insert({ user_id: userId, score: validScore, played_at: validPlayedAt })
    .select('*')
    .single();

  if (insert.error) throw new ApiError(400, insert.error.message);

  const allScores = await queryBuilder('scores')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false });

  const rows = allScores.data || [];
  if (rows.length > 5) {
    const toDelete = rows.slice(5).map((row) => row.id);
    await queryBuilder('scores').delete().in('id', toDelete);
  }

  return getUserScores(userId, 5);
};

export const getUserScores = async (userId, limit = 5) => {
  const scoresResult = await queryBuilder('scores')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (scoresResult.error) throw new ApiError(400, scoresResult.error.message);

  const scores = scoresResult.data || [];
  const total = scores.reduce((acc, item) => acc + item.score, 0);
  const average = scores.length ? Number((total / scores.length).toFixed(2)) : 0;

  return {
    scores,
    statistics: {
      average,
      best: scores.length ? Math.max(...scores.map((x) => x.score)) : null,
      worst: scores.length ? Math.min(...scores.map((x) => x.score)) : null,
      totalRounds: scores.length,
    },
    count: scores.length,
  };
};

export const updateScore = async (userId, scoreId, newScore, playedAt) => {
  const validScore = ensureScoreInRange(newScore);
  const patch = { score: validScore };
  if (playedAt) patch.played_at = ensureDateNotFuture(playedAt);

  const result = await queryBuilder('scores')
    .update(patch)
    .eq('id', scoreId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (result.error || !result.data) throw new ApiError(404, 'Score not found');
  return result.data;
};

export const deleteScore = async (userId, scoreId) => {
  const result = await queryBuilder('scores').delete().eq('id', scoreId).eq('user_id', userId).select('id').single();
  if (result.error || !result.data) throw new ApiError(404, 'Score not found');
  return { message: 'Score deleted' };
};

export const getScoreStatistics = async (userId) => {
  const data = await getUserScores(userId, 5);
  return { ...data.statistics, scores: data.scores };
};

export const getScoresForDraw = async (userId) => {
  const result = await queryBuilder('scores').select('score').eq('user_id', userId).order('played_at', { ascending: false }).limit(5);
  return (result.data || []).map((x) => x.score);
};
