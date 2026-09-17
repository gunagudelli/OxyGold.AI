import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  accessToken:     null,
  refreshToken:    null,
  userId:          null,
  userEmail:       null,
  // The mobile number used at login — the backend's own profile often
  // doesn't have this set yet (accounts created via OTP with no further
  // profile step), so this is the fallback Profile shows instead of blank.
  userPhone:       null,
  tokenType:       'Bearer',
  tokenExpiresAt:  null, // Unix ms timestamp — used for proactive refresh
  isLoggedIn:      false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action) {
      const { accessToken, refreshToken, userId, userEmail, userPhone, tokenType, expiresIn, tokenExpiresAt } = action.payload;

      state.accessToken    = accessToken    || state.accessToken;
      state.refreshToken   = refreshToken   || state.refreshToken;
      state.userId         = userId         || state.userId;
      state.userEmail      = userEmail      || state.userEmail;
      state.userPhone      = userPhone      || state.userPhone;
      state.tokenType      = tokenType      || 'Bearer';
      state.isLoggedIn     = !!accessToken;

      // Store absolute expiry timestamp (subtract 30s buffer for proactive refresh).
      // Callers rehydrating a persisted session (where "now" isn't when the token
      // was issued) must pass an already-computed absolute `tokenExpiresAt` —
      // recomputing from a stale relative `expiresIn` here would understate how
      // old the token actually is.
      if (tokenExpiresAt !== undefined) {
        state.tokenExpiresAt = tokenExpiresAt;
      } else if (expiresIn) {
        state.tokenExpiresAt = Date.now() + (expiresIn - 30) * 1000;
      } else {
        state.tokenExpiresAt = null;
      }
    },

    clearTokens(state) {
      Object.assign(state, initialState);
    },

    setUserInfo(state, action) {
      const { userId, userEmail } = action.payload;
      if (userId)    state.userId    = userId;
      if (userEmail) state.userEmail = userEmail;
    },
  },
});

export const { setTokens, clearTokens, setUserInfo } = authSlice.actions;
export default authSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectAccessToken    = (s) => s?.auth?.accessToken    || null;
export const selectRefreshToken   = (s) => s?.auth?.refreshToken   || null;
export const selectUserId         = (s) => s?.auth?.userId         || null;
export const selectUserEmail      = (s) => s?.auth?.userEmail      || null;
export const selectUserPhone      = (s) => s?.auth?.userPhone      || null;
export const selectIsLoggedIn     = (s) => s?.auth?.isLoggedIn     || false;
export const selectTokenExpiresAt = (s) => s?.auth?.tokenExpiresAt || null;
export const selectAuthState      = (s) => s?.auth                 || initialState;
