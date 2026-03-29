import { apiClient, withAuth } from './apiClient.js';

export const adminApi = {
  async overview(token) {
    const { data } = await apiClient.get('/admin/overview', withAuth(token));
    return data;
  },
  async users(token) {
    const { data } = await apiClient.get('/admin/users', withAuth(token));
    return data;
  },
  async subscriptions(token) {
    const { data } = await apiClient.get('/admin/subscriptions', withAuth(token));
    return data;
  },
  async updateUser(token, userId, payload) {
    const { data } = await apiClient.patch(`/admin/users/${userId}`, payload, withAuth(token));
    return data;
  },
  async updateSubscription(token, subscriptionId, payload) {
    const { data } = await apiClient.patch(`/admin/subscriptions/${subscriptionId}`, payload, withAuth(token));
    return data;
  },
};
