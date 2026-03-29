import { queryBuilder } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';

const cache = { value: null, expiresAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

const validatePercentage = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 10 || n > 100) throw new ApiError(400, 'Percentage must be 10-100');
  return n;
};

export const createCharity = async (charityData) => {
  const exists = await queryBuilder('charities').select('id').eq('name', charityData.name).maybeSingle();
  if (exists.data) throw new ApiError(409, 'Charity name already exists');

  const result = await queryBuilder('charities').insert({
    name: charityData.name,
    description: charityData.description,
    image_url: charityData.imageUrl,
    website_url: charityData.websiteUrl,
    email: charityData.email,
  }).select('*').single();

  if (result.error) throw new ApiError(400, result.error.message);
  cache.value = null;
  return result.data;
};

export const getAllCharities = async ({ page = 1, featured = false, search = '' } = {}) => {
  const now = Date.now();
  if (!featured && !search && cache.value && cache.expiresAt > now) return cache.value;

  let query = queryBuilder('charities').select('*', { count: 'exact' });
  if (featured) query = query.eq('featured', true);
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const result = await query.order('featured', { ascending: false }).order('created_at', { ascending: false }).range(from, to);
  if (result.error) throw new ApiError(400, result.error.message);

  const payload = {
    charities: result.data || [],
    totalCount: result.count || 0,
    page,
    pageSize,
  };

  if (!featured && !search) {
    cache.value = payload;
    cache.expiresAt = now + CACHE_TTL_MS;
  }

  return payload;
};

export const getCharityById = async (charityId) => {
  const charity = await queryBuilder('charities').select('*').eq('id', charityId).single();
  if (charity.error || !charity.data) throw new ApiError(404, 'Charity not found');

  const supporters = await queryBuilder('user_charities').select('id', { count: 'exact', head: true }).eq('charity_id', charityId);
  return {
    charity: charity.data,
    stats: {
      supporterCount: supporters.count || 0,
      totalFunded: 0,
      monthlyTotal: 0,
    },
  };
};

export const updateCharity = async (charityId, charityData) => {
  const result = await queryBuilder('charities').update({
    name: charityData.name,
    description: charityData.description,
    image_url: charityData.imageUrl,
    website_url: charityData.websiteUrl,
    email: charityData.email,
    updated_at: new Date().toISOString(),
  }).eq('id', charityId).select('*').single();

  if (result.error || !result.data) throw new ApiError(404, 'Charity not found');
  cache.value = null;
  return result.data;
};

export const deleteCharity = async (charityId) => {
  const support = await queryBuilder('user_charities').select('id').eq('charity_id', charityId).limit(1).maybeSingle();
  if (support.data) throw new ApiError(409, 'Cannot delete charity with active supporters');

  const result = await queryBuilder('charities').delete().eq('id', charityId).select('id').single();
  if (result.error || !result.data) throw new ApiError(404, 'Charity not found');
  cache.value = null;
  return { message: 'Charity deleted' };
};

export const setFeaturedCharity = async (charityId, featured) => {
  const result = await queryBuilder('charities').update({ featured, updated_at: new Date().toISOString() }).eq('id', charityId).select('*').single();
  if (result.error || !result.data) throw new ApiError(404, 'Charity not found');
  cache.value = null;
  return result.data;
};

export const getUserCharity = async (userId) => {
  const result = await queryBuilder('user_charities')
    .select('contribution_percentage,charities(*)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!result.data) return { charity: null, percentage: null };
  return { charity: result.data.charities, percentage: result.data.contribution_percentage };
};

export const setUserCharity = async (userId, charityId, percentage) => {
  const validPercentage = validatePercentage(percentage);

  const subscription = await queryBuilder('subscriptions')
    .select('id,status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (!subscription.data) throw new ApiError(403, 'Active subscription required');

  const result = await queryBuilder('user_charities').upsert({
    user_id: userId,
    charity_id: charityId,
    contribution_percentage: validPercentage,
    updated_at: new Date().toISOString(),
  }).select('contribution_percentage,charities(*)').single();

  if (result.error) throw new ApiError(400, result.error.message);
  return { charity: result.data.charities, percentage: result.data.contribution_percentage };
};

export const getCharityContributions = async (charityId) => {
  const users = await queryBuilder('user_charities').select('id', { count: 'exact', head: true }).eq('charity_id', charityId);
  return { totalFunded: 0, userCount: users.count || 0, monthlyTotal: 0 };
};

export const searchCharities = async (query) => getAllCharities({ search: query });
