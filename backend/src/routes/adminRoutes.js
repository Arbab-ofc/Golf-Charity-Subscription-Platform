import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { queryBuilder } from '../config/supabase.js';

const router = Router();

router.get('/overview', requireAdmin, asyncHandler(async (_req, res) => {
  const [users, subscriptions, winners, charities] = await Promise.all([
    queryBuilder('users').select('id', { count: 'exact', head: true }),
    queryBuilder('subscriptions').select('id,status'),
    queryBuilder('winners').select('prize_amount'),
    queryBuilder('charities').select('id', { count: 'exact', head: true }),
  ]);

  const activeSubscriptions = (subscriptions.data || []).filter((s) => ['active', 'trialing'].includes(s.status)).length;
  const totalPrizes = (winners.data || []).reduce((sum, row) => sum + Number(row.prize_amount || 0), 0);

  res.status(200).json({
    totalUsers: users.count || 0,
    activeSubscriptions,
    totalPrizes: Number(totalPrizes.toFixed(2)),
    totalCharities: charities.count || 0,
  });
}));

router.get('/users', requireAdmin, asyncHandler(async (_req, res) => {
  const users = await queryBuilder('users')
    .select('id,email,full_name,is_admin,created_at,subscriptions(status,plan_type,current_period_end)')
    .order('created_at', { ascending: false });
  res.status(200).json({ users: users.data || [] });
}));

router.patch('/users/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const { fullName, isAdmin } = req.body;
  const patch = {};
  if (typeof fullName === 'string') patch.full_name = fullName;
  if (typeof isAdmin === 'boolean') patch.is_admin = isAdmin;

  const result = await queryBuilder('users').update(patch).eq('id', req.params.userId).select('*').single();
  res.status(200).json({ user: result.data, message: 'User updated' });
}));

router.get('/subscriptions', requireAdmin, asyncHandler(async (_req, res) => {
  const subs = await queryBuilder('subscriptions')
    .select('id,user_id,plan_type,status,current_period_start,current_period_end,created_at,users(email,full_name)')
    .order('created_at', { ascending: false });
  res.status(200).json({ subscriptions: subs.data || [] });
}));

router.patch('/subscriptions/:subscriptionId', requireAdmin, asyncHandler(async (req, res) => {
  const { status, planType, currentPeriodEnd } = req.body;
  const patch = {};
  if (typeof status === 'string') patch.status = status;
  if (typeof planType === 'string') patch.plan_type = planType;
  if (typeof currentPeriodEnd === 'string') patch.current_period_end = currentPeriodEnd;

  const result = await queryBuilder('subscriptions')
    .update(patch)
    .eq('id', req.params.subscriptionId)
    .select('*')
    .single();

  res.status(200).json({ subscription: result.data, message: 'Subscription updated' });
}));

export default router;
