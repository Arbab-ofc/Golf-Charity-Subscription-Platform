import bcrypt from 'bcryptjs';
import { getSupabaseAdmin, queryBuilder } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const DEFAULT_USER = {
  email: 'user@gmail.com',
  password: 'User@123',
  fullName: 'Demo User',
};

const findAuthUserByEmail = async (supabase, email) => {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const target = email.toLowerCase();
  return (data.users || []).find((user) => (user.email || '').toLowerCase() === target) || null;
};

const ensureTestSubscription = async (userId) => {
  const latest = await queryBuilder('subscriptions')
    .select('id,status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) {
    logger.warn('Default user subscription lookup failed', { error: latest.error.message });
    return;
  }

  if (latest.data) return;

  const now = new Date();
  const start = now.toISOString();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const insert = await queryBuilder('subscriptions').insert({
    user_id: userId,
    plan_type: 'monthly',
    status: 'active',
    current_period_start: start,
    current_period_end: end,
  });

  if (insert.error) {
    logger.warn('Default user test subscription create failed', { error: insert.error.message });
    return;
  }

  logger.info('Default user test subscription created', { userId });
};

export const ensureDefaultUser = async () => {
  const supabase = getSupabaseAdmin();
  const hashedPassword = await bcrypt.hash(DEFAULT_USER.password, 12);

  const existingProfile = await queryBuilder('users').select('id,email,full_name').eq('email', DEFAULT_USER.email).maybeSingle();
  if (existingProfile.error) {
    logger.error('Failed checking default user profile', { error: existingProfile.error.message });
    return;
  }

  if (existingProfile.data) {
    const userId = existingProfile.data.id;
    const authUpdate = await supabase.auth.admin.updateUserById(userId, {
      password: DEFAULT_USER.password,
      email_confirm: true,
      user_metadata: { full_name: existingProfile.data.full_name || DEFAULT_USER.fullName },
    });
    if (authUpdate.error) {
      logger.warn('Default user auth update failed; continuing with profile update', { error: authUpdate.error.message });
    }

    const profileUpdate = await queryBuilder('users')
      .update({
        is_admin: false,
        password_hash: hashedPassword,
        full_name: existingProfile.data.full_name || DEFAULT_USER.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileUpdate.error) {
      logger.error('Failed updating default user profile', { error: profileUpdate.error.message });
      return;
    }

    await ensureTestSubscription(userId);
    logger.info('Default user account synced', { email: DEFAULT_USER.email });
    return;
  }

  let authUserId = null;
  const created = await supabase.auth.admin.createUser({
    email: DEFAULT_USER.email,
    password: DEFAULT_USER.password,
    email_confirm: true,
    user_metadata: { full_name: DEFAULT_USER.fullName },
  });

  if (created.error) {
    const existingAuth = await findAuthUserByEmail(supabase, DEFAULT_USER.email);
    if (!existingAuth) {
      logger.error('Failed creating default user auth account', { error: created.error.message });
      return;
    }
    authUserId = existingAuth.id;
  } else {
    authUserId = created.data.user?.id || null;
  }

  if (!authUserId) {
    logger.error('Default user auth id missing');
    return;
  }

  const profileInsert = await queryBuilder('users')
    .insert({
      id: authUserId,
      email: DEFAULT_USER.email,
      full_name: DEFAULT_USER.fullName,
      password_hash: hashedPassword,
      is_admin: false,
    })
    .select('id')
    .single();

  if (profileInsert.error) {
    logger.error('Failed creating default user profile', { error: profileInsert.error.message });
    return;
  }

  await ensureTestSubscription(authUserId);
  logger.info('Default user account created', { email: DEFAULT_USER.email });
};
