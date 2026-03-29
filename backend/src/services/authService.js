import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getSupabaseAdmin, queryBuilder } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { parseOrThrow, signupSchema, loginSchema } from '../utils/validators.js';

const issueToken = (userId, email, isAdmin) =>
  jwt.sign({ email, isAdmin }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN,
  });

export const signupUser = async (email, password, fullName) => {
  const payload = parseOrThrow(signupSchema, { email, password, fullName });
  const supabase = getSupabaseAdmin();

  const existing = await queryBuilder('users').select('id').eq('email', payload.email).maybeSingle();
  if (existing.data) throw new ApiError(409, 'Email already in use');

  const hashedPassword = await bcrypt.hash(payload.password, 12);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName },
  });
  if (authError) throw new ApiError(400, authError.message);

  const { data: profile, error: profileError } = await queryBuilder('users')
    .insert({
      id: authData.user.id,
      email: payload.email,
      full_name: payload.fullName,
      password_hash: hashedPassword,
      is_admin: false,
    })
    .select('id,email,full_name,is_admin,created_at')
    .single();

  if (profileError) throw new ApiError(400, profileError.message);

  const token = issueToken(profile.id, profile.email, profile.is_admin);
  return { user: profile, token };
};

export const loginUser = async (email, password) => {
  const payload = parseOrThrow(loginSchema, { email, password });

  const { data: user, error } = await queryBuilder('users')
    .select('*')
    .eq('email', payload.email)
    .single();

  if (error || !user) throw new ApiError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(payload.password, user.password_hash || '');
  if (!ok) throw new ApiError(401, 'Invalid credentials');

  const token = issueToken(user.id, user.email, user.is_admin);
  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_admin: user.is_admin,
    },
    token,
  };
};

export const refreshToken = async (token) => {
  const payload = jwt.verify(token, env.JWT_SECRET);
  const { data: user, error } = await queryBuilder('users').select('*').eq('id', payload.sub).single();
  if (error || !user) throw new ApiError(401, 'Invalid refresh token');
  return issueToken(user.id, user.email, user.is_admin);
};

export const getCurrentUser = async (userId) => {
  const userResult = await queryBuilder('users')
    .select('id,email,full_name,avatar_url,is_admin,created_at')
    .eq('id', userId)
    .single();
  if (userResult.error || !userResult.data) throw new ApiError(404, 'User not found');

  const subscriptionResult = await queryBuilder('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const scoresResult = await queryBuilder('scores')
    .select('id,score,played_at,created_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(5);

  return {
    user: userResult.data,
    subscription: subscriptionResult.data || null,
    recentScores: scoresResult.data || [],
  };
};

export const logoutUser = async () => ({ message: 'Logged out successfully' });

export const sendPasswordReset = async (email) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new ApiError(400, error.message);
  return { message: 'Password reset email sent if account exists' };
};
