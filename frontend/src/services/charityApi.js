import { apiClient, withAuth } from './apiClient.js';

export const charityApi = {
  async list(featured = false, search = '') {
    const params = new URLSearchParams();
    if (featured) params.set('featured', 'true');
    if (search) params.set('search', search);
    const { data } = await apiClient.get(`/charities?${params.toString()}`);
    return data;
  },
  async myCharity(token) {
    const { data } = await apiClient.get('/charities/my-charity', withAuth(token));
    return data;
  },
  async setMyCharity(token, charityId, percentage) {
    const { data } = await apiClient.post('/charities/my-charity', { charityId, percentage }, withAuth(token));
    return data;
  },
  async create(token, payload) {
    const { data } = await apiClient.post('/charities', payload, withAuth(token));
    return data;
  },
  async setFeatured(token, charityId, featured) {
    const { data } = await apiClient.patch(`/charities/${charityId}/featured`, { featured }, withAuth(token));
    return data;
  },
  async remove(token, charityId) {
    const { data } = await apiClient.delete(`/charities/${charityId}`, withAuth(token));
    return data;
  },
};
