import { apiClient, withAuth } from './apiClient.js';

export const scoreApi = {
  async list(token, limit = 5) {
    const { data } = await apiClient.get(`/scores?limit=${limit}`, withAuth(token));
    return data;
  },
  async add(token, score, playedAt) {
    const { data } = await apiClient.post('/scores', { score, playedAt }, withAuth(token));
    return data;
  },
  async update(token, scoreId, score, playedAt) {
    const { data } = await apiClient.patch(`/scores/${scoreId}`, { score, playedAt }, withAuth(token));
    return data;
  },
  async remove(token, scoreId) {
    const { data } = await apiClient.delete(`/scores/${scoreId}`, withAuth(token));
    return data;
  },
};
