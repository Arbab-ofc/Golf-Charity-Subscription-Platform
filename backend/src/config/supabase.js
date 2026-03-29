import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Get app-level Supabase client.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export const getSupabaseClient = () => anonClient;

/**
 * Get admin Supabase client.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export const getSupabaseAdmin = () => adminClient;

/**
 * Create a query builder for a table.
 * @param {string} table
 */
export const queryBuilder = (table) => {
  if (env.NODE_ENV !== 'production') logger.info('Supabase queryBuilder', { table });
  return adminClient.from(table);
};

/**
 * Execute prepared Supabase query and normalize error handling.
 * @template T
 * @param {Promise<{ data: T, error: any }>} query
 * @returns {Promise<T>}
 */
export const executeQuery = async (query) => {
  try {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Supabase query failed', { error: error.message });
    throw new Error('Database operation failed');
  }
};
