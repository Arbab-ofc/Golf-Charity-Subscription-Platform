import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import authRoutes from './authRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import scoreRoutes from './scoreRoutes.js';
import charityRoutes from './charityRoutes.js';
import drawRoutes from './drawRoutes.js';
import winnerRoutes from './winnerRoutes.js';
import adminRoutes from './adminRoutes.js';
import donationRoutes from './donationRoutes.js';
import { processStripeEvent, verifyWebhookSignature } from '../middleware/stripeWebhook.js';

const router = Router();

// Backward-compatible Stripe webhook alias.
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const event = verifyWebhookSignature(req);
    await processStripeEvent(event);
    res.status(200).json({ received: true });
  })
);

router.use('/auth', authRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/scores', scoreRoutes);
router.use('/charities', charityRoutes);
router.use('/draws', drawRoutes);
router.use('/winners', winnerRoutes);
router.use('/donations', donationRoutes);
router.use('/admin', adminRoutes);

export default router;
