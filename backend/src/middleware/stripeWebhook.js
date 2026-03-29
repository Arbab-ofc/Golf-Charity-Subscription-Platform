import { stripe } from '../config/stripe.js';
import { env } from '../config/env.js';
import { queryBuilder } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const processedEvents = new Set();

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

export const verifyWebhookSignature = (req) => {
  const signature = req.headers['stripe-signature'];
  return stripe.webhooks.constructEvent(req.rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
};

export const handleCheckoutComplete = async (event) => {
  const session = event.data.object;
  const resolvedUserId =
    session?.metadata?.userId || session?.client_reference_id || null;
  if (!resolvedUserId) return;

  await queryBuilder('subscriptions').upsert({
    user_id: resolvedUserId,
    stripe_customer_id: session.customer,
    stripe_subscription_id: session.subscription,
    plan_type: session.metadata?.planType || 'monthly',
    status: 'active',
    current_period_start: new Date().toISOString(),
  });
};

export const handleSubscriptionUpdate = async (event) => {
  const subscription = event.data.object;
  const { periodStart, periodEnd } = getStripePeriodWindow(subscription);
  const patch = {
    status: subscription.status,
    updated_at: new Date().toISOString(),
  };
  if (periodStart) patch.current_period_start = periodStart;
  if (periodEnd) patch.current_period_end = periodEnd;

  await queryBuilder('subscriptions')
    .update(patch)
    .eq('stripe_subscription_id', subscription.id);
};

export const handleSubscriptionDelete = async (event) => {
  const subscription = event.data.object;
  await queryBuilder('subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);
};

export const handlePaymentFailed = async (event) => {
  const invoice = event.data.object;
  await queryBuilder('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', invoice.customer);
};

const normalizePlanTypeFromPrice = (priceId) => {
  if (priceId === env.STRIPE_YEARLY_PRICE_ID) return 'yearly';
  return 'monthly';
};

export const handlePaymentSucceeded = async (event) => {
  const object = event.data.object;
  let invoice = object;

  // For newer event payloads like invoice_payment.paid, retrieve invoice explicitly.
  if (event.type === 'invoice_payment.paid' && object.invoice) {
    invoice = await stripe.invoices.retrieve(object.invoice);
  }

  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  const customerId = invoice.customer;

  if (!subscriptionId && !customerId) return;

  let subscription = null;
  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'latest_invoice.lines'],
    });
  }

  const updatePayload = {
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  if (subscription) {
    const { periodStart, periodEnd } = getStripePeriodWindow(subscription);
    if (periodStart) updatePayload.current_period_start = periodStart;
    if (periodEnd) updatePayload.current_period_end = periodEnd;
    updatePayload.plan_type = normalizePlanTypeFromPrice(subscription.items.data[0]?.price?.id);
    updatePayload.stripe_subscription_id = subscription.id;
    updatePayload.stripe_customer_id = subscription.customer;
  }

  let query = queryBuilder('subscriptions').update(updatePayload);
  if (subscriptionId) {
    query = query.eq('stripe_subscription_id', subscriptionId);
  } else {
    query = query.eq('stripe_customer_id', customerId);
  }

  const result = await query.select('id').limit(1);

  // If no local row exists yet, attempt to resolve userId from subscription/customer metadata.
  let resolvedUserId = subscription?.metadata?.userId || null;
  if (!resolvedUserId && customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      resolvedUserId = customer.metadata?.userId || null;
    }
  }

  if (!result.data?.length && resolvedUserId) {
    logger.info('Creating local subscription from invoice-paid webhook', {
      eventType: event.type,
      subscriptionId,
      customerId,
      resolvedUserId,
    });
    await queryBuilder('subscriptions').upsert({
      user_id: resolvedUserId,
      stripe_customer_id: subscription?.customer || customerId,
      stripe_subscription_id: subscription?.id || subscriptionId,
      plan_type: updatePayload.plan_type || 'monthly',
      status: 'active',
      current_period_start: updatePayload.current_period_start || new Date().toISOString(),
      current_period_end: updatePayload.current_period_end || null,
    });
  }
};

export const processStripeEvent = async (event) => {
  if (processedEvents.has(event.id)) return;
  processedEvents.add(event.id);

  try {
    logger.info('Stripe webhook received', { type: event.type, id: event.id });
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDelete(event);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
      case 'invoice_payment.paid':
        await handlePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
      default:
        logger.info('Unhandled Stripe event', { type: event.type });
    }
  } catch (error) {
    processedEvents.delete(event.id);
    throw error;
  }
};
