import { Router } from 'express';
import { requireSubscription } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  addScore,
  deleteScore,
  getScoreStatistics,
  getUserScores,
  updateScore,
} from '../services/scoreService.js';

const router = Router();

router.post(
  '/',
  requireSubscription,
  asyncHandler(async (req, res) => {
    const { score, playedAt } = req.body;
    const data = await addScore(req.user.id, score, playedAt);
    res.status(201).json({ message: 'Score added', ...data });
  })
);

router.get(
  '/',
  requireSubscription,
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit || 5);
    const data = await getUserScores(req.user.id, limit);
    res.status(200).json(data);
  })
);

router.get(
  '/statistics',
  requireSubscription,
  asyncHandler(async (req, res) => {
    const stats = await getScoreStatistics(req.user.id);
    res.status(200).json(stats);
  })
);

router.patch(
  '/:scoreId',
  requireSubscription,
  asyncHandler(async (req, res) => {
    const { score, playedAt } = req.body;
    const updated = await updateScore(req.user.id, req.params.scoreId, score, playedAt);
    const allScores = await getUserScores(req.user.id, 5);
    res.status(200).json({ score: updated, ...allScores });
  })
);

router.delete(
  '/:scoreId',
  requireSubscription,
  asyncHandler(async (req, res) => {
    await deleteScore(req.user.id, req.params.scoreId);
    const remainingScores = await getUserScores(req.user.id, 5);
    res.status(200).json({ message: 'Score deleted', remainingScores });
  })
);

export default router;
