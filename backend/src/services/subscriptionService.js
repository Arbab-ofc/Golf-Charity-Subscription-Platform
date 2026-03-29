import { stripe } from '../config/stripe.js';
import { env } from '../config/env.js';
import { queryBuilder } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';

const PLAN_MAP = {
  monthly: { priceId: env.STRIPE_MONTHLY_PRICE_ID, amount: 9.99 },
  yearly: { priceId: env.STRIPE_YEARLY_PRICE_ID, amount: 89.99 },
};
const BLOCKING_STATUSES = ['active', 'trialing', 'past_due', 'incomplete'];

const toIsoFromUnix = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return new Date(value * 1000).toISOString();
};

const getStripePeriodWindow = (subscription) => {
  const item = subscription?.items?.data?.[0] || {};
  const periodStart =
    toIsoFromUnix(subscription?.current_period_start) ||
    toIsoFromUnix(item?.current_period_start) ||
    null;
  const periodEnd =
    toIsoFromUnix(subscription?.current_period_end) ||
    toIsoFromUnix(item?.current_period_end) ||
    null;
  return { periodStart, periodEnd };
};

const getOrCreateCustomer = async (user) => {
  const existing = await queryBuilder('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (existing.data?.stripe_customer_id) return existing.data.stripe_customer_id;

  const customer = await stripe.customers.create({ email: user.email, name: user.full_name, metadata: { userId: user.id } });
  return customer.id;
};

export const createCheckoutSession = async (userId, planType) => {
  if (!PLAN_MAP[planType]) throw new ApiError(400, 'Invalid plan type');

  const existing = await queryBuilder('subscriptions')
    .select('id,status,plan_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data && BLOCKING_STATUSES.includes(existing.data.status)) {
    throw new ApiError(
      409,
      `You already have an ${existing.data.status} ${existing.data.plan_type || ''} subscription. Cancel it before creating a new one.`
    );
  }

  const userResult = await queryBuilder('users').select('id,email,full_name').eq('id', userId).single();
  if (userResult.error || !userResult.data) throw new ApiError(404, 'User not found');

  const customerId = await getOrCreateCustomer(userResult.data);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: PLAN_MAP[planType].priceId, quantity: 1 }],
    success_url: env.STRIPE_SUCCESS_URL,
    cancel_url: env.STRIPE_CANCEL_URL,
    metadata: { userId, planType },
    customer_update: {
      name: 'auto',
      address: 'auto',
    },
    subscription_data: {
      metadata: { userId, planType },
    },
  });

  return { checkoutUrl: session.url, sessionId: session.id };
};

export const createSubscription = async (userId, stripeCustomerId, stripeSubscriptionId, planType = 'monthly') => {
  const result = await queryBuilder('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      plan_type: planType,
      status: 'active',
      current_period_start: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (result.error) throw new ApiError(400, result.error.message);
  return result.data;
};

export const getUserSubscription = async (userId) => {
  const local = await queryBuilder('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (local.error || !local.data) return null;

  // Recovery path: if subscription id is missing, derive it from customer id.
  if (!local.data.stripe_subscription_id && local.data.stripe_customer_id) {
    const list = await stripe.subscriptions.list({
      customer: local.data.stripe_customer_id,
      status: 'all',
      limit: 5,
    });

    const candidate =
      list.data.find((s) => ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status)) ||
      list.data[0];

    if (candidate) {
      const { periodStart, periodEnd } = getStripePeriodWindow(candidate);
      const recovered = {
        stripe_subscription_id: candidate.id,
        status: candidate.status,
        current_period_start: periodStart || local.data.current_period_start,
        current_period_end: periodEnd || local.data.current_period_end,
        updated_at: new Date().toISOString(),
      };

      await queryBuilder('subscriptions').update(recovered).eq('id', local.data.id);
      local.data = { ...local.data, ...recovered };
    }
  }

  if (local.data.stripe_subscription_id) {
    const stripeSub = await stripe.subscriptions.retrieve(local.data.stripe_subscription_id, {
      expand: ['latest_invoice', 'latest_invoice.lines'],
    });
    const { periodStart, periodEnd } = getStripePeriodWindow(stripeSub);
    const nextState = {
      status: stripeSub.status,
      current_period_start: periodStart || local.data.current_period_start,
      current_period_end: periodEnd || local.data.current_period_end,
      updated_at: new Date().toISOString(),
    };

    const shouldSync =
      nextState.status !== local.data.status ||
      nextState.current_period_start !== local.data.current_period_start ||
      nextState.current_period_end !== local.data.current_period_end;

    if (shouldSync) {
      await queryBuilder('subscriptions').update(nextState).eq('id', local.data.id);
      local.data = { ...local.data, ...nextState };
    }
  }

  return local.data;
};

export const cancelSubscription = async (userId) => {
  const sub = await getUserSubscription(userId);
  if (!sub) throw new ApiError(404, 'Subscription not found');

  if (sub.stripe_subscription_id) await stripe.subscriptions.cancel(sub.stripe_subscription_id);

  await queryBuilder('subscriptions')
    .update({ status: 'cancelled', current_period_end: new Date().toISOString() })
    .eq('id', sub.id);

  return { message: 'Subscription cancelled', cancellationDate: new Date().toISOString() };
};

export const removeSubscription = async (userId) => {
  const sub = await queryBuilder('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sub.error || !sub.data) throw new ApiError(404, 'Subscription not found');

  if (BLOCKING_STATUSES.includes(sub.data.status)) {
    throw new ApiError(409, 'Cancel the subscription before removing it');
  }

  const del = await queryBuilder('subscriptions').delete().eq('id', sub.data.id).eq('user_id', userId).select('id').single();
  if (del.error || !del.data) throw new ApiError(400, 'Failed to remove subscription');

  return { message: 'Subscription record removed' };
};

export const updateSubscriptionPlan = async (userId, newPlanType) => {
  if (!PLAN_MAP[newPlanType]) throw new ApiError(400, 'Invalid plan type');
  const sub = await getUserSubscription(userId);
  if (!sub?.stripe_subscription_id) throw new ApiError(404, 'Subscription not found');

  const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  const itemId = stripeSub.items.data[0]?.id;

  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [{ id: itemId, price: PLAN_MAP[newPlanType].priceId }],
    proration_behavior: 'create_prorations',
  });

  const dbUpdate = await queryBuilder('subscriptions')
    .update({ plan_type: newPlanType, status: updated.status, updated_at: new Date().toISOString() })
    .eq('id', sub.id)
    .select('*')
    .single();

  if (dbUpdate.error) throw new ApiError(400, dbUpdate.error.message);
  return dbUpdate.data;
};

export const validateSubscriptionStatus = async (userId) => {
  const sub = await getUserSubscription(userId);
  if (!sub) return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
    await queryBuilder('subscriptions').update({ status: 'inactive' }).eq('id', sub.id);
    return false;
  }
  return ['active', 'trialing'].includes(sub.status);
};

export const getSubscriptionStatus = async (userId) => {
  const sub = await getUserSubscription(userId);
  if (!sub) return { isActive: false, status: null, planType: null, expiresAt: null, daysRemaining: 0 };

  const expiresAt = sub.current_period_end || null;
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    isActive: ['active', 'trialing'].includes(sub.status),
    status: sub.status,
    planType: sub.plan_type,
    expiresAt,
    daysRemaining,
  };
};
