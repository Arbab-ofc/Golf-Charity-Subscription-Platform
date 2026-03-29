import { queryBuilder } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';

export const getWinnersByDraw = async (drawId) => {
  const result = await queryBuilder('winners')
    .select('*,users(id,email,full_name),draws(id,draw_number,draw_date,winning_numbers)')
    .eq('draw_id', drawId)
    .order('match_type', { ascending: false });

  if (result.error) throw new ApiError(400, result.error.message);
  return result.data || [];
};

export const getWinnerById = async (winnerId) => {
  const result = await queryBuilder('winners')
    .select('*,users(id,email,full_name,avatar_url),draws(id,draw_number,draw_date,winning_numbers)')
    .eq('id', winnerId)
    .single();

  if (result.error || !result.data) throw new ApiError(404, 'Winner not found');
  return result.data;
};

export const getUserWinnings = async (userId) => {
  const result = await queryBuilder('winners')
    .select('*,draws(id,draw_number,draw_date,winning_numbers)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (result.error) throw new ApiError(400, result.error.message);

  const wins = result.data || [];
  const total = wins.reduce((sum, item) => sum + Number(item.prize_amount || 0), 0);

  return {
    winnings: wins,
    totalWinnings: Number(total.toFixed(2)),
    count: wins.length,
  };
};

export const verifyWinner = async (winnerId, verificationStatus, proofUrl = null) => {
  if (!['pending', 'approved', 'rejected'].includes(verificationStatus)) {
    throw new ApiError(400, 'Invalid verification status');
  }

  const result = await queryBuilder('winners')
    .update({ verification_status: verificationStatus, proof_url: proofUrl, updated_at: new Date().toISOString() })
    .eq('id', winnerId)
    .select('*')
    .single();

  if (result.error || !result.data) throw new ApiError(404, 'Winner not found');
  return result.data;
};

export const markPayoutPaid = async (winnerId) => {
  const result = await queryBuilder('winners')
    .update({ payout_status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', winnerId)
    .select('*')
    .single();

  if (result.error || !result.data) throw new ApiError(404, 'Winner not found');
  return result.data;
};
