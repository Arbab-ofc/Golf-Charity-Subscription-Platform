import { apiClient, withAuth } from './apiClient.js';

export const subscriptionApi = {
  async status(token) {
    const { data } = await apiClient.get('/subscriptions/status', withAuth(token));
    return data;
  },
  async checkout(token, planType) {
    const { data } = await apiClient.post('/subscriptions/checkout', { planType }, withAuth(token));
    return data;
  },
  async cancel(token) {
    const { data } = await apiClient.post('/subscriptions/cancel', {}, withAuth(token));
    return data;
  },
  async remove(token) {
    const { data } = await apiClient.delete('/subscriptions/remove', withAuth(token));
    return data;
  },
};
