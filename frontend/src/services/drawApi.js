import { apiClient, withAuth } from './apiClient.js';

export const drawApi = {
  async current() {
    const { data } = await apiClient.get('/draws/current');
    return data;
  },
  async history(limit = 12) {
    const { data } = await apiClient.get(`/draws/history?limit=${limit}`);
    return data;
  },
  async myDraws(token) {
    const { data } = await apiClient.get('/draws/my-draws', withAuth(token));
    return data;
  },
  async simulate(token, drawLogic = 'random') {
    const { data } = await apiClient.post('/draws/simulate', { drawLogic }, withAuth(token));
    return data;
  },
  async publish(token, drawLogic = 'random') {
    const { data } = await apiClient.post('/draws/publish', { drawLogic }, withAuth(token));
    return data;
  },
  async statistics(token) {
    const { data } = await apiClient.get('/draws/statistics', withAuth(token));
    return data;
  },
};
