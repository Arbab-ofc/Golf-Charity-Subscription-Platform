import { queryBuilder } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { donationSchema, parseOrThrow } from '../utils/validators.js';

export const createIndependentDonation = async (userId, payload) => {
  const data = parseOrThrow(donationSchema, payload);

  const charity = await queryBuilder('charities').select('id,name').eq('id', data.charityId).maybeSingle();
  if (!charity.data) throw new ApiError(404, 'Charity not found');

  const result = await queryBuilder('donations')
    .insert({
      user_id: userId,
      charity_id: data.charityId,
      amount: Number(data.amount.toFixed(2)),
      currency: data.currency.toUpperCase(),
      note: data.note || null,
      source: 'independent',
      status: 'recorded',
    })
    .select('*,charities(id,name)')
    .single();

  if (result.error || !result.data) throw new ApiError(400, result.error?.message || 'Unable to record donation');
  return result.data;
};

export const getUserDonations = async (userId) => {
  const result = await queryBuilder('donations')
    .select('*,charities(id,name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (result.error) throw new ApiError(400, result.error.message);
  const list = result.data || [];
  const total = list.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { donations: list, count: list.length, totalAmount: Number(total.toFixed(2)) };
};
