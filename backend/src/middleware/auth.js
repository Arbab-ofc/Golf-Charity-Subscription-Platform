import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { queryBuilder } from '../config/supabase.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
};

export const verifyToken = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw new ApiError(401, 'Missing bearer token');

    const payload = jwt.verify(token, env.JWT_SECRET);

    const user = await queryBuilder('users').select('*').eq('id', payload.sub).single();
    if (user.error || !user.data) throw new ApiError(401, 'User not found');

    req.user = user.data;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

export const requireAuth = [verifyToken];

export const requireAdmin = [
  verifyToken,
  (req, _res, next) => {
    if (!req.user?.is_admin) return next(new ApiError(403, 'Admin access required'));
    next();
  },
];

export const requireSubscription = [
  verifyToken,
  async (req, _res, next) => {
    const result = await queryBuilder('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error || !result.data) return next(new ApiError(403, 'Active subscription required'));

    req.subscription = result.data;
    next();
  },
];
