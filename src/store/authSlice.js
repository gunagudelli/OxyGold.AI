/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REDUX AUTH SLICE - PRODUCTION READY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Manages:
 * ✅ accessToken
 * ✅ refreshToken
 * ✅ userId
 * ✅ userEmail
 * ✅ Login state
 * 
 * Usage:
 * const userId = useSelector(selectUserId);
 * const token = useSelector(selectAccessToken);
 * dispatch(setTokens({ accessToken, refreshToken, userId }));
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  userEmail: null,
  tokenType: 'Bearer',
  expiresIn: null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set tokens after login
     * @param {Object} action.payload - { accessToken, refreshToken, userId, userEmail, tokenType, expiresIn }
     */
    setTokens(state, action) {
      const {
        accessToken,
        refreshToken,
        userId,
        userEmail,
        tokenType,
        expiresIn,
      } = action.payload;

      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.userId = userId || state.userId;
      state.userEmail = userEmail || state.userEmail;
      state.tokenType = tokenType || 'Bearer';
      state.expiresIn = expiresIn || null;
      state.isLoggedIn = !!accessToken;

      console.log('[Redux] Tokens updated');
    },

    /**
     * Clear tokens on logout
     */
    clearTokens(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.userId = null;
      state.userEmail = null;
      state.isLoggedIn = false;

      console.log('[Redux] Tokens cleared - user logged out');
    },

    /**
     * Update user info
     */
    setUserInfo(state, action) {
      const { userId, userEmail } = action.payload;
      state.userId = userId || state.userId;
      state.userEmail = userEmail || state.userEmail;
    },
  },
});

export const { setTokens, clearTokens, setUserInfo } = authSlice.actions;
export default authSlice.reducer;

// ─────────────────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get access token from Redux
 * @param {Object} state - Redux state
 * @returns {string|null} Access token or null
 */
export const selectAccessToken = (state) => state?.auth?.accessToken || null;

/**
 * Get refresh token from Redux
 * @param {Object} state - Redux state
 * @returns {string|null} Refresh token or null
 */
export const selectRefreshToken = (state) => state?.auth?.refreshToken || null;

/**
 * Get user ID from Redux
 * @param {Object} state - Redux state
 * @returns {number|null} User ID or null
 */
export const selectUserId = (state) => state?.auth?.userId || null;

/**
 * Get user email from Redux
 * @param {Object} state - Redux state
 * @returns {string|null} User email or null
 */
export const selectUserEmail = (state) => state?.auth?.userEmail || null;

/**
 * Get login status from Redux
 * @param {Object} state - Redux state
 * @returns {boolean} Is user logged in
 */
export const selectIsLoggedIn = (state) => state?.auth?.isLoggedIn || false;

/**
 * Get token type from Redux
 * @param {Object} state - Redux state
 * @returns {string} Token type (usually 'Bearer')
 */
export const selectTokenType = (state) => state?.auth?.tokenType || 'Bearer';

/**
 * Get token expiry time from Redux
 * @param {Object} state - Redux state
 * @returns {number|null} Expiry time in seconds or null
 */
export const selectExpiresIn = (state) => state?.auth?.expiresIn || null;

/**
 * Get all auth state
 * @param {Object} state - Redux state
 * @returns {Object} Complete auth state
 */
export const selectAuthState = (state) => state?.auth || initialState;
