import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/authApi.js';

const AuthContext = createContext(null);
const readStoredToken = () => {
  const raw = localStorage.getItem('auth_token');
  if (!raw || raw === 'null' || raw === 'undefined') {
    localStorage.removeItem('auth_token');
    return null;
  }
  if (raw.split('.').length !== 3) {
    localStorage.removeItem('auth_token');
    return null;
  }
  return raw;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(readStoredToken);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me(token)
      .then((response) => setUser(response.user))
      .catch((error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
          return;
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      async login(email, password) {
        const result = await authApi.login(email, password);
        localStorage.setItem('auth_token', result.token);
        setToken(result.token);
        setUser(result.user);
        return result;
      },
      async signup(email, password, fullName, charityId = null, charityPercentage = null) {
        const result = await authApi.signup(email, password, fullName, charityId, charityPercentage);
        localStorage.setItem('auth_token', result.token);
        setToken(result.token);
        setUser(result.user);
        return result;
      },
      logout() {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
