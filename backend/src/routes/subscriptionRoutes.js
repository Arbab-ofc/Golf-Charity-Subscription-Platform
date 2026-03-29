import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createCheckoutSession,
  getSubscriptionStatus,
  cancelSubscription,
  removeSubscription,
  updateSubscriptionPlan,
} from '../services/subscriptionService.js';
import { processStripeEvent, verifyWebhookSignature } from '../middleware/stripeWebhook.js';

const router = Router();

router.post(
  '/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { planType } = req.body;
    const result = await createCheckoutSession(req.user.id, planType);
    res.status(200).json(result);
  })
);

router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await getSubscriptionStatus(req.user.id);
    res.status(200).json(status);
  })
);

router.post(
  '/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await cancelSubscription(req.user.id);
    res.status(200).json(result);
  })
);

router.delete(
  '/remove',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await removeSubscription(req.user.id);
    res.status(200).json(result);
  })
);

router.post(
  '/upgrade',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { planType } = req.body;
    const subscription = await updateSubscriptionPlan(req.user.id, planType);
    res.status(200).json({ subscription, message: 'Subscription updated' });
  })
);

router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const event = verifyWebhookSignature(req);
    await processStripeEvent(event);
    res.status(200).json({ received: true });
  })
);

export default router;
