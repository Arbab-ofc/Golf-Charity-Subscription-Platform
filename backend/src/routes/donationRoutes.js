import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { createIndependentDonation, getUserDonations } from '../services/donationService.js';

const router = Router();

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await getUserDonations(req.user.id);
    res.status(200).json(data);
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const donation = await createIndependentDonation(req.user.id, req.body);
    res.status(201).json({ donation, message: 'Donation recorded' });
  })
);

export default router;
