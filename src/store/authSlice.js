import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  accessToken:     null,
  refreshToken:    null,
  userId:          null,
  userEmail:       null,
  tokenType:       'Bearer',
  tokenExpiresAt:  null, // Unix ms timestamp — used for proactive refresh
  isLoggedIn:      false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action) {
      const { accessToken, refreshToken, userId, userEmail, tokenType, expiresIn } = action.payload;

      state.accessToken    = accessToken    || state.accessToken;
      state.refreshToken   = refreshToken   || state.refreshToken;
      state.userId         = userId         || state.userId;
      state.userEmail      = userEmail      || state.userEmail;
      state.tokenType      = tokenType      || 'Bearer';
      state.isLoggedIn     = !!accessToken;

      // Store absolute expiry timestamp (subtract 30s buffer for proactive refresh)
      state.tokenExpiresAt = expiresIn
        ? Date.now() + (expiresIn - 30) * 1000
        : null;
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
export const selectIsLoggedIn     = (s) => s?.auth?.isLoggedIn     || false;
export const selectTokenExpiresAt = (s) => s?.auth?.tokenExpiresAt || null;
export const selectAuthState      = (s) => s?.auth                 || initialState;
