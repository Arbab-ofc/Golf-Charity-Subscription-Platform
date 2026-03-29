import { useEffect, useState } from 'react';
import { subscriptionApi } from '../services/subscriptionApi.js';

export function useSubscription(token) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    subscriptionApi
      .status(token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  return { data, loading };
}
