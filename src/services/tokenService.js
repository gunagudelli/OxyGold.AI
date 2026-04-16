/**
 * TOKEN SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all token operations with AsyncStorage
 * - Get/Set tokens
 * - Check expiry
 * - Clear tokens
 * - Proper async/await handling
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "auth_tokens";
const TOKEN_BUFFER = 60 * 1000; // 1 minute buffer before expiry

// ─── Token Storage ────────────────────────────────────────────────────────────

/**
 * Get access token from AsyncStorage
 * @returns {Promise<string|null>}
 */
export const getAuthToken = async () => {
  try {
    const data = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed?.data?.accessToken || null;
  } catch (error) {
    console.error("[tokenService] Error getting auth token:", error);
    return null;
  }
};

/**
 * Get refresh token from AsyncStorage
 * @returns {Promise<string|null>}
 */
export const getRefreshToken = async () => {
  try {
    const data = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed?.data?.refreshToken || null;
  } catch (error) {
    console.error("[tokenService] Error getting refresh token:", error);
    return null;
  }
};

/**
 * Get both tokens
 * @returns {Promise<{accessToken: string|null, refreshToken: string|null}>}
 */
export const getTokens = async () => {
  try {
    const data = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return { accessToken: null, refreshToken: null };

    const parsed = JSON.parse(data);
    return {
      accessToken: parsed?.data?.accessToken || null,
      refreshToken: parsed?.data?.refreshToken || null,
    };
  } catch (error) {
    console.error("[tokenService] Error getting tokens:", error);
    return { accessToken: null, refreshToken: null };
  }
};

/**
 * Save tokens to AsyncStorage
 * @param {string} accessToken
 * @param {string} refreshToken
 * @param {number} expiresIn - seconds
 * @returns {Promise<void>}
 */
export const saveTokens = async (accessToken, refreshToken, expiresIn) => {
  try {
    const tokenExpiresAt = Date.now() + expiresIn * 1000;

    const data = {
      data: {
        accessToken,
        refreshToken,
      },
      expiresIn,
      tokenExpiresAt,
      savedAt: Date.now(),
    };

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    console.log("[tokenService] Tokens saved successfully");
  } catch (error) {
    console.error("[tokenService] Error saving tokens:", error);
    throw error;
  }
};

/**
 * Clear all tokens from AsyncStorage
 * @returns {Promise<void>}
 */
export const clearTokens = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    console.log("[tokenService] Tokens cleared");
  } catch (error) {
    console.error("[tokenService] Error clearing tokens:", error);
  }
};

/**
 * Check if token is expired or expiring soon (with 1-minute buffer)
 * @returns {Promise<boolean>}
 */
export const isTokenExpired = async () => {
  try {
    const data = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return true;

    const parsed = JSON.parse(data);
    const tokenExpiresAt = parsed?.tokenExpiresAt;

    if (!tokenExpiresAt) return false; // No expiry info, assume valid

    const isExpired = Date.now() >= tokenExpiresAt - TOKEN_BUFFER;

    if (isExpired) {
      console.log("[tokenService] Token expired or expiring soon");
    }

    return isExpired;
  } catch (error) {
    console.error("[tokenService] Error checking token expiry:", error);
    return true; // Assume expired on error
  }
};

/**
 * Get token expiry time
 * @returns {Promise<number|null>}
 */
export const getTokenExpiryTime = async () => {
  try {
    const data = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed?.tokenExpiresAt || null;
  } catch (error) {
    console.error("[tokenService] Error getting token expiry:", error);
    return null;
  }
};
