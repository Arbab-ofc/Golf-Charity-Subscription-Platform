import { apiClient, withAuth } from './apiClient.js';

export const authApi = {
  async login(email, password) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data;
  },
  async signup(email, password, fullName) {
    const { data } = await apiClient.post('/auth/signup', { email, password, fullName });
    return data;
  },
  async me(token) {
    const { data } = await apiClient.get('/auth/me', withAuth(token));
    return data;
  },
};
