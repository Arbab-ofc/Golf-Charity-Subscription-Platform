import { apiClient, withAuth } from './apiClient.js';

export const donationApi = {
  async mine(token) {
    const { data } = await apiClient.get('/donations/me', withAuth(token));
    return data;
  },
  async create(token, payload) {
    const { data } = await apiClient.post('/donations', payload, withAuth(token));
    return data;
  },
};
