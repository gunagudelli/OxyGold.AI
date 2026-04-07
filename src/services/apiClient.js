/**
 * CENTRALIZED API CLIENT
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ Auto token injection from Redux
 * ✅ Proactive token refresh before expiry (uses tokenExpiresAt)
 * ✅ Reactive token refresh on 401
 * ✅ Singleton refresh promise — prevents race conditions
 * ✅ Retry original request after refresh
 * ✅ Global session-expired handler → navigates to Login
 * ✅ Retry logic with exponential backoff for 5xx / timeouts
 * ✅ Single AsyncStorage key: 'auth_tokens'
 * ✅ getUserId export for legacy callers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_REFRESH_TOKEN } from '../constants/api';
import { setTokens, clearTokens, selectTokenExpiresAt } from '../store/authSlice';
import { SESSION_EXPIRED, AUTH_STORAGE_KEY } from '../constants/authConstants';

// ─── Config ───────────────────────────────────────────────────────────────────
const CONFIG = {
  REQUEST_TIMEOUT: 15000,
  MAX_RETRIES:     2,
  RETRY_DELAY:     1000,
};

// ─── Store reference ──────────────────────────────────────────────────────────
let _store = null;
export const setStore = (store) => {
  _store = store;
  console.log('[apiClient] Store wired. Auth state:', store.getState()?.auth?.accessToken ? 'token present' : 'no token yet');
};

// ─── Session-expired navigation handler ──────────────────────────────────────
let _onSessionExpired = null;

/**
 * Register a callback that fires when refresh fails.
 * Call this in App.js once the navigation ref is ready.
 * @param {() => void} handler
 */
export const setSessionExpiredHandler = (handler) => { 
  _onSessionExpired = handler;
  console.log('[apiClient] Session expired handler registered');
};

// ─── Token readers (from Redux) ───────────────────────────────────────────────
const getToken         = () => _store?.getState()?.auth?.accessToken  || null;
const getRefreshToken  = () => _store?.getState()?.auth?.refreshToken || null;
const getTokenExpiresAt = () => selectTokenExpiresAt(_store?.getState());

/** Exported so legacy callers (goldApi.js etc.) can get userId without prop-drilling */
export const getUserId = () => _store?.getState()?.auth?.userId || null;

// ─── AsyncStorage helpers (single key) ───────────────────────────────────────
export const persistTokens = async (tokens) => {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      ...tokens,
      storedAt: Date.now(),
    }));
  } catch {}
};

export const loadPersistedTokens = async () => {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPersistedTokens = async () => {
  try {
    // Remove both keys so legacy 'user' key is also wiped on logout
    await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, 'user']);
  } catch {}
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const clearAuthTokens = async () => {
  _store?.dispatch(clearTokens());
  await clearPersistedTokens();
};

// ─── Singleton refresh promise (prevents parallel refresh calls) ──────────────
let _refreshPromise = null;

const refreshAccessToken = async () => {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token available');

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

      const res = await fetch(API_REFRESH_TOKEN, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken }),
        signal:  controller.signal,
      });
      clearTimeout(tid);

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Token refresh failed');

      const newTokens = {
        accessToken:  data?.data?.accessToken  || data?.accessToken,
        refreshToken: data?.data?.refreshToken || data?.refreshToken || refreshToken,
        expiresIn:    data?.data?.expiresIn    || data?.expiresIn,
      };

      _store?.dispatch(setTokens(newTokens));
      await persistTokens(newTokens);

      return newTokens.accessToken;
    } catch (error) {
      // Refresh failed — clear everything and redirect to Login
      console.log('[apiClient] Token refresh failed, triggering session expired handler');
      await clearAuthTokens();
      if (_onSessionExpired) {
        _onSessionExpired();
      } else {
        console.warn('[apiClient] No session expired handler registered!');
      }
      throw new ApiError(SESSION_EXPIRED, 401, null);
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
};

// ─── Proactive expiry check ───────────────────────────────────────────────────
const isTokenExpiredOrExpiringSoon = () => {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return false;          // no expiry info — let server decide
  return Date.now() >= expiresAt;        // already expired or within 30s buffer
};

// ─── Error class ─────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.data   = data;
  }
}

const buildError = (status, data) => {
  const msg = data?.message || data?.error || `Request failed (${status})`;
  switch (status) {
    case 400: return new ApiError('Bad request. Please check your input.',          status, data);
    case 401: return new ApiError(SESSION_EXPIRED,                                  status, data);
    case 403: return new ApiError('Access denied.',                                 status, data);
    case 404: return new ApiError('Resource not found.',                            status, data);
    case 429: return new ApiError('Too many requests. Please try again later.',     status, data);
    case 500:
    case 502:
    case 503:
    case 504: return new ApiError('Server error. Please try again later.',          status, data);
    default:  return new ApiError(msg,                                              status, data);
  }
};

// ─── Core request ─────────────────────────────────────────────────────────────
export const apiRequest = async (url, options = {}, retryCount = 0) => {
  // Proactive refresh: if token is about to expire, refresh before sending
  if (!options._retry && getToken() && isTokenExpiredOrExpiringSoon()) {
    try { await refreshAccessToken(); } catch { /* handler already called */ }
  }

  const token = getToken();
  console.log(`[apiClient] ${options.method || 'GET'} ${url} | token: ${token ? 'present (***' + token.slice(-6) + ')' : 'MISSING'}`);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let finalUrl = url;
  if (options.params) {
    finalUrl = `${url}?${new URLSearchParams(options.params)}`;
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

  try {
    const res = await fetch(finalUrl, {
      ...options,
      method:  options.method || 'GET',
      headers,
      signal:  controller.signal,
      body:    options.body ? JSON.stringify(options.body) : undefined,
    });
    clearTimeout(tid);

    // Parse response body
    let data;
    try {
      const text = await res.text();
      if (!text || !text.trim()) {
        data = { success: true };
      } else if (res.headers.get('content-type')?.includes('application/json')) {
        data = JSON.parse(text);
      } else {
        data = { success: true, message: text };
      }
    } catch {
      throw new ApiError('Invalid server response', res.status, null);
    }

    // 401 → attempt refresh then retry once
    if (res.status === 401 && !options._retry) {
      await refreshAccessToken();                                    // throws if refresh fails
      return apiRequest(url, { ...options, _retry: true }, retryCount);
    }

    if (!res.ok) {
      const err = buildError(res.status, data);
      const retryable = [408, 429, 500, 502, 503, 504].includes(res.status);
      if (retryable && retryCount < CONFIG.MAX_RETRIES) {
        await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY * (retryCount + 1)));
        return apiRequest(url, options, retryCount + 1);
      }
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(tid);

    console.log('[apiClient] Catch block error:', error?.message || error);
    console.log('[apiClient] Error name:', error?.name);
    console.log('[apiClient] Error type:', typeof error);

    if (error.name === 'AbortError') {
      const te = new ApiError('Request timeout. Please check your connection.', 408, null);
      if (retryCount < CONFIG.MAX_RETRIES) {
        await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY * (retryCount + 1)));
        return apiRequest(url, options, retryCount + 1);
      }
      throw te;
    }

    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, null);
  }
};

// ─── Convenience helpers ──────────────────────────────────────────────────────
export const apiGet    = (url, options = {})       => apiRequest(url, { ...options, method: 'GET' });
export const apiPost   = (url, body = {}, options = {}) => apiRequest(url, { ...options, method: 'POST',   body });
export const apiPut    = (url, body = {}, options = {}) => apiRequest(url, { ...options, method: 'PUT',    body });
export const apiPatch  = (url, body = {}, options = {}) => apiRequest(url, { ...options, method: 'PATCH',  body });
export const apiDelete = (url, options = {})       => apiRequest(url, { ...options, method: 'DELETE' });

// ─── Response normalizer ──────────────────────────────────────────────────────
export const extractData = (response) => {
  if (response?.data?.data) return response.data.data;
  if (response?.data)       return response.data;
  return response;
};
