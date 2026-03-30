import { apiClient, withAuth } from './apiClient.js';

export const winnerApi = {
  async me(token) {
    const { data } = await apiClient.get('/winners/me', withAuth(token));
    return data;
  },
  async byDraw(drawId) {
    const { data } = await apiClient.get(`/winners/draw/${drawId}`);
    return data;
  },
  async verify(token, winnerId, verificationStatus, proofUrl = null) {
    const { data } = await apiClient.patch(`/winners/${winnerId}/verify`, { verificationStatus, proofUrl }, withAuth(token));
    return data;
  },
  async payout(token, winnerId) {
    const { data } = await apiClient.patch(`/winners/${winnerId}/payout`, {}, withAuth(token));
    return data;
  },
  async submitProof(token, winnerId, proofUrl) {
    const { data } = await apiClient.patch(`/winners/${winnerId}/proof`, { proofUrl }, withAuth(token));
    return data;
  },
};
