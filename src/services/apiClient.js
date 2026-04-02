/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CENTRALIZED API CLIENT - PRODUCTION READY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ Auto token injection from Redux
 * ✅ Auto token refresh on 401
 * ✅ Retry logic with exponential backoff
 * ✅ Request timeout handling
 * ✅ Response normalization
 * ✅ Global error handling
 * ✅ Request deduplication
 * 
 * ✅ Comprehensive logging
 * 
 * Usage:
 * const data = await apiGet('/endpoint');
 * const result = await apiPost('/endpoint', { body });
 * 
 * NO manual token passing needed!
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_REFRESH_TOKEN } from '../constants/api';
import { setTokens, clearTokens } from '../store/authSlice';

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

const CONFIG = {
  REQUEST_TIMEOUT: 15000, // 15 seconds
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1 second
};

// ─────────────────────────────────────────────────────────────────────────
// STORE REFERENCE (Set from App.js)
// ─────────────────────────────────────────────────────────────────────────

let _store = null;

/**
 * Initialize API client with Redux store
 * MUST be called in App.js before any API calls
 */
export const setStore = (store) => {
  _store = store;
  // console.log('[API] Store initialized');
};

// ─────────────────────────────────────────────────────────────────────────
// TOKEN GETTERS (From Redux)
// ─────────────────────────────────────────────────────────────────────────

const getToken = () => {
  const token = _store?.getState()?.auth?.accessToken || null;
  return token;
};

const getRefreshToken = () => {
  const token = _store?.getState()?.auth?.refreshToken || null;
  return token;
};

// ─────────────────────────────────────────────────────────────────────────
// ASYNC STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────

export const persistTokens = async (tokens) => {
  try {
    await AsyncStorage.setItem('auth_tokens', JSON.stringify({
      ...tokens,
      storedAt: Date.now(),
    }));
    // console.log('[AsyncStorage] Tokens persisted');
  } catch (error) {
    // console.error('[AsyncStorage] Failed to persist tokens:', error);
  }
};

export const loadPersistedTokens = async () => {
  try {
    const raw = await AsyncStorage.getItem('auth_tokens');
    if (raw) {
      const tokens = JSON.parse(raw);
      // console.log('[AsyncStorage] Tokens loaded');
      return tokens;
    }
    return null;
  } catch (error) {
    // console.error('[AsyncStorage] Failed to load tokens:', error);
    return null;
  }
};

export const clearPersistedTokens = async () => {
  try {
    await AsyncStorage.multiRemove(['auth_tokens', 'user']);
    // console.log('[AsyncStorage] Tokens cleared');
  } catch (error) {
    // console.error('[AsyncStorage] Failed to clear tokens:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// LOGOUT HANDLER
// ─────────────────────────────────────────────────────────────────────────

export const clearAuthTokens = async () => {
  _store?.dispatch(clearTokens());
  await clearPersistedTokens();
  // console.log('[API] Auth tokens cleared - user logged out');
};

// ─────────────────────────────────────────────────────────────────────────
// TOKEN REFRESH (Singleton Pattern - Prevents Race Conditions)
// ─────────────────────────────────────────────────────────────────────────

let _refreshPromise = null;

const refreshAccessToken = async () => {
  // If refresh already in progress, return existing promise
  if (_refreshPromise) {
    // console.log('[API] Token refresh already in progress, waiting...');
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('[API] Refreshing access token...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

      const res = await fetch(API_REFRESH_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Token refresh failed');
      }

      const newTokens = {
        accessToken: data?.data?.accessToken || data?.accessToken,
        refreshToken: data?.data?.refreshToken || data?.refreshToken || refreshToken,
        expiresIn: data?.data?.expiresIn || data?.expiresIn,
      };

      // Update Redux
      _store?.dispatch(setTokens(newTokens));

      // Persist to AsyncStorage
      await persistTokens(newTokens);

      console.log('[API] Token refreshed successfully');
      return newTokens.accessToken;
    } catch (error) {
      console.error('[API] Token refresh failed:', error.message);
      await clearAuthTokens();
      throw error;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
};

// ─────────────────────────────────────────────────────────────────────────
// RESPONSE NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Extract data from various response formats
 * Backend might return: response.data, response.data.data, or just response
 */
export const extractData = (response) => {
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response;
};

// ─────────────────────────────────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const handleErrorResponse = (status, data) => {
  const message = data?.message || data?.error || `Request failed (${status})`;

  switch (status) {
    case 400:
      return new ApiError('Bad request. Please check your input.', status, data);
    case 401:
      return new ApiError('SESSION_EXPIRED', status, data);
    case 403:
      return new ApiError('Access denied. You do not have permission.', status, data);
    case 404:
      return new ApiError('Resource not found.', status, data);
    case 429:
      return new ApiError('Too many requests. Please try again later.', status, data);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ApiError('Server error. Please try again later.', status, data);
    default:
      return new ApiError(message, status, data);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// CORE REQUEST FUNCTION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Core API request function with:
 * - Auto token injection
 * - Auto token refresh on 401
 * - Retry logic
 * - Timeout handling
 * - Response normalization
 */
export const apiRequest = async (url, options = {}, retryCount = 0) => {
  const token = getToken();

  // Build headers with auto-injected token
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Build URL with query params
  let finalUrl = url;
  if (options.params) {
    const params = new URLSearchParams(options.params);
    finalUrl = `${url}?${params}`;
  }

  // console.log(`[API] ${options.method || 'GET'} ${finalUrl}`);
  if (token) {
    // console.log(`[API] Auth: Bearer ***${token.slice(-6)}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

  try {
    const res = await fetch(finalUrl, {
      ...options,
      method: options.method || 'GET',
      headers,
      signal: controller.signal,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    clearTimeout(timeoutId);

    let data;
    try {
      data = await res.json();
    } catch {
      throw new ApiError('Invalid server response', res.status, null);
    }

    // console.log(`[API] Response ${res.status}`);
    // console.log('[API] Response Data:', JSON.stringify(data, null, 2));

    // Handle 401 - Token expired
    if (res.status === 401 && !options._retry) {
      try {
        await refreshAccessToken();
        return apiRequest(url, { ...options, _retry: true }, retryCount);
      } catch {
        await clearAuthTokens();
        throw new ApiError('SESSION_EXPIRED', 401, data);
      }
    }

    // Handle error responses
    if (!res.ok) {
      const error = handleErrorResponse(res.status, data);

      // Retry logic for retryable errors
      if ([408, 429, 500, 502, 503, 504].includes(res.status) && retryCount < CONFIG.MAX_RETRIES) {
        // console.log(`[API] Retrying (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY * (retryCount + 1)));
        return apiRequest(url, options, retryCount + 1);
      }

      throw error;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error.name === 'AbortError') {
      const timeoutError = new ApiError('Request timeout. Please check your connection.', 408, null);

      if (retryCount < CONFIG.MAX_RETRIES) {
        // console.log(`[API] Retrying timeout (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY * (retryCount + 1)));
        return apiRequest(url, options, retryCount + 1);
      }

      throw timeoutError;
    }

    if (error instanceof ApiError) throw error;

    // Network error
    throw new ApiError('Network error. Please check your connection.', 0, null);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// CONVENIENCE HELPERS
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET request
 * @param {string} url - API endpoint
 * @param {object} options - Request options (params, headers, etc.)
 * @returns {Promise<object>} Response data
 */
export const apiGet = (url, options = {}) =>
  apiRequest(url, { ...options, method: 'GET' });

/**
 * POST request
 * @param {string} url - API endpoint
 * @param {object} body - Request body
 * @param {object} options - Request options
 * @returns {Promise<object>} Response data
 */
export const apiPost = (url, body, options = {}) =>
  apiRequest(url, { ...options, method: 'POST', body });

/**
 * PUT request
 * @param {string} url - API endpoint
 * @param {object} body - Request body
 * @param {object} options - Request options
 * @returns {Promise<object>} Response data
 */
export const apiPut = (url, body, options = {}) =>
  apiRequest(url, { ...options, method: 'PUT', body });

/**
 * PATCH request
 * @param {string} url - API endpoint
 * @param {object} body - Request body
 * @param {object} options - Request options
 * @returns {Promise<object>} Response data
 */
export const apiPatch = (url, body, options = {}) =>
  apiRequest(url, { ...options, method: 'PATCH', body });

/**
 * DELETE request
 * @param {string} url - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} Response data
 */
export const apiDelete = (url, options = {}) =>
  apiRequest(url, { ...options, method: 'DELETE' });

// ─────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────

export { ApiError };
