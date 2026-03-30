import bcrypt from 'bcryptjs';
import { getSupabaseAdmin, queryBuilder } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const DEFAULT_ADMIN = {
  email: 'admin@gmail.com',
  password: 'admin@123',
  fullName: 'Admin User',
};

const findAuthUserByEmail = async (supabase, email) => {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const target = email.toLowerCase();
  return (data.users || []).find((user) => (user.email || '').toLowerCase() === target) || null;
};

export const ensureDefaultAdmin = async () => {
  const supabase = getSupabaseAdmin();
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 12);

  const existingProfile = await queryBuilder('users').select('id,email,full_name').eq('email', DEFAULT_ADMIN.email).maybeSingle();
  if (existingProfile.error) {
    logger.error('Failed checking default admin profile', { error: existingProfile.error.message });
    return;
  }

  if (existingProfile.data) {
    const userId = existingProfile.data.id;
    const authUpdate = await supabase.auth.admin.updateUserById(userId, {
      password: DEFAULT_ADMIN.password,
      email_confirm: true,
      user_metadata: { full_name: existingProfile.data.full_name || DEFAULT_ADMIN.fullName },
    });
    if (authUpdate.error) {
      logger.warn('Default admin auth update failed; continuing with profile update', { error: authUpdate.error.message });
    }

    const profileUpdate = await queryBuilder('users')
      .update({
        is_admin: true,
        password_hash: hashedPassword,
        full_name: existingProfile.data.full_name || DEFAULT_ADMIN.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileUpdate.error) {
      logger.error('Failed updating default admin profile', { error: profileUpdate.error.message });
      return;
    }

    logger.info('Default admin account synced', { email: DEFAULT_ADMIN.email });
    return;
  }

  let authUserId = null;
  const created = await supabase.auth.admin.createUser({
    email: DEFAULT_ADMIN.email,
    password: DEFAULT_ADMIN.password,
    email_confirm: true,
    user_metadata: { full_name: DEFAULT_ADMIN.fullName },
  });

  if (created.error) {
    const existingAuth = await findAuthUserByEmail(supabase, DEFAULT_ADMIN.email);
    if (!existingAuth) {
      logger.error('Failed creating default admin auth user', { error: created.error.message });
      return;
    }
    authUserId = existingAuth.id;
  } else {
    authUserId = created.data.user?.id || null;
  }

  if (!authUserId) {
    logger.error('Default admin auth user id missing');
    return;
  }

  const profileInsert = await queryBuilder('users')
    .insert({
      id: authUserId,
      email: DEFAULT_ADMIN.email,
      full_name: DEFAULT_ADMIN.fullName,
      password_hash: hashedPassword,
      is_admin: true,
    })
    .select('id')
    .single();

  if (profileInsert.error) {
    logger.error('Failed creating default admin profile', { error: profileInsert.error.message });
    return;
  }

  logger.info('Default admin account created', { email: DEFAULT_ADMIN.email });
};
