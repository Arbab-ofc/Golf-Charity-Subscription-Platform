import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireSubscription } from '../middleware/auth.js';
import {
  checkUserMatches,
  getCurrentDraw,
  getDrawStatistics,
  getPreviousDraws,
  getUserDrawHistory,
  publishDraw,
  rolloverJackpot,
  simulateDraw,
} from '../services/drawService.js';

const router = Router();

router.post('/simulate', requireAdmin, asyncHandler(async (req, res) => {
  const { drawLogic = 'random' } = req.body;
  const simulation = await simulateDraw(drawLogic);
  res.status(200).json(simulation);
}));

router.post('/publish', requireAdmin, asyncHandler(async (req, res) => {
  const { drawLogic = 'random' } = req.body;
  const result = await publishDraw(drawLogic);
  res.status(201).json(result);
}));

router.get('/current', asyncHandler(async (_req, res) => {
  const result = await getCurrentDraw();
  res.status(200).json(result || { draw: null, winnersByType: { 3: 0, 4: 0, 5: 0 }, totalPrizePool: 0 });
}));

router.get('/history', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 12);
  const page = Number(req.query.page || 1);
  const result = await getPreviousDraws(limit, page);
  res.status(200).json(result);
}));

router.get('/statistics', requireAdmin, asyncHandler(async (_req, res) => {
  const stats = await getDrawStatistics();
  res.status(200).json(stats);
}));

router.get('/my-draws', requireSubscription, asyncHandler(async (req, res) => {
  const history = await getUserDrawHistory(req.user.id);
  res.status(200).json({ participationHistory: history });
}));

router.get('/my-draws/:drawId', requireSubscription, asyncHandler(async (req, res) => {
  const data = await checkUserMatches(req.user.id, req.params.drawId);
  res.status(200).json(data);
}));

router.post('/:drawId/rollover-jackpot', requireAdmin, asyncHandler(async (req, res) => {
  const { toDrawId } = req.body;
  const result = await rolloverJackpot(req.params.drawId, toDrawId);
  res.status(200).json(result);
}));

export default router;
