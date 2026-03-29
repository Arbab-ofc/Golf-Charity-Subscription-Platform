import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  getUserWinnings,
  getWinnerById,
  getWinnersByDraw,
  markPayoutPaid,
  verifyWinner,
} from '../services/winnerService.js';

const router = Router();

router.get('/draw/:drawId', asyncHandler(async (req, res) => {
  const winners = await getWinnersByDraw(req.params.drawId);
  res.status(200).json({ winners, count: winners.length });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const data = await getUserWinnings(req.user.id);
  res.status(200).json(data);
}));

router.get('/:winnerId', asyncHandler(async (req, res) => {
  const winner = await getWinnerById(req.params.winnerId);
  res.status(200).json({ winner });
}));

router.patch('/:winnerId/verify', requireAdmin, asyncHandler(async (req, res) => {
  const { verificationStatus, proofUrl } = req.body;
  const winner = await verifyWinner(req.params.winnerId, verificationStatus, proofUrl);
  res.status(200).json({ winner, message: 'Winner verification updated' });
}));

router.patch('/:winnerId/payout', requireAdmin, asyncHandler(async (req, res) => {
  const winner = await markPayoutPaid(req.params.winnerId);
  res.status(200).json({ winner, message: 'Winner marked as paid' });
}));

export default router;
