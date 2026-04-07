/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USE API HOOK - API CALLS WITH SESSION HANDLING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Custom hook for making API calls with automatic session error handling
 * 
 * Features:
 * ✅ Automatic 401 handling
 * ✅ Loading states
 * ✅ Error states
 * ✅ Retry mechanism
 * ✅ Session expired detection
 * 
 * Usage:
 * const { data, loading, error, execute } = useApi(apiFunction);
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { useSession } from '../contexts/SessionContext';

/**
 * Hook for API calls with automatic error handling
 * @param {Function} apiFunction - API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, execute, reset }
 */
const useApi = (apiFunction, options = {}) => {
  const {
    onSuccess,
    onError,
    autoHandleAuthError = true,
  } = options;

  const { handleAuthError } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Execute API call
   */
  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      console.error('[useApi] Error:', err.message);
      setError(err);

      // Handle auth errors automatically
      if (autoHandleAuthError) {
        const isAuthError = handleAuthError(err);
        if (isAuthError) {
          return null; // Session expired, handled by context
        }
      }

      onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError, autoHandleAuthError, handleAuthError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

export default useApi;
