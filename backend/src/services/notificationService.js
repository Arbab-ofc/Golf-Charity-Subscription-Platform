import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const notificationsEnabled = () => String(process.env.ENABLE_EMAIL_NOTIFICATIONS || 'false') === 'true';

export const sendEmailNotification = async ({ to, subject, html, type = 'generic' }) => {
  if (!notificationsEnabled()) {
    logger.info('Email notification skipped (disabled)', { to, subject, type });
    return { delivered: false, reason: 'disabled' };
  }

  // Placeholder adapter: wire a provider (SES/SendGrid/Resend) in production.
  logger.info('Email notification dispatched', { to, subject, type, app: 'golf-charity-platform', env: env.NODE_ENV });
  logger.info('Email body preview', { html: String(html || '').slice(0, 2000) });
  return { delivered: true };
};

export const sendSignupWelcomeEmail = async (email, fullName) =>
  sendEmailNotification({
    to: email,
    subject: 'Welcome to Golf Charity Subscription Platform',
    type: 'signup',
    html: `<p>Hi ${fullName || 'Golfer'}, your account is ready.</p>`,
  });

export const sendWinnerStatusEmail = async (email, status) =>
  sendEmailNotification({
    to: email,
    subject: `Winner status updated: ${status}`,
    type: 'winner-status',
    html: `<p>Your winner verification status is now <strong>${status}</strong>.</p>`,
  });

export const sendWinnerPayoutEmail = async (email, amount) =>
  sendEmailNotification({
    to: email,
    subject: 'Winner payout marked as paid',
    type: 'winner-payout',
    html: `<p>Your payout has been marked as paid. Amount: ${Number(amount || 0).toFixed(2)}</p>`,
  });
