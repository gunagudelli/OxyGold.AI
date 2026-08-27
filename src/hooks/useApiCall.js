import { useState, useCallback } from 'react';

const DEFAULT_TIMEOUT = 15000; // 15 seconds
const DEFAULT_RETRIES = 2;

export const useApiCall = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callApi = useCallback(async (apiFunction, options = {}) => {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      onSuccess,
      onError,
    } = options;

    setLoading(true);
    setError(null);

    let lastError = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );

        const result = await Promise.race([
          apiFunction(),
          timeoutPromise,
        ]);

        setLoading(false);
        if (onSuccess) onSuccess(result);
        return { success: true, data: result };
      } catch (err) {
        lastError = err;
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
    }

    setLoading(false);
    setError(lastError);
    if (onError) onError(lastError);
    return { success: false, error: lastError };
  }, []);

  return { loading, error, callApi };
};
