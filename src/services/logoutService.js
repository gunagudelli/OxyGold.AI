/**
 * LOGOUT SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 * ✅ Logout API call with refreshToken
 * ✅ Redux state clearing
 * ✅ AsyncStorage cleanup
 * ✅ Navigation reset to Home/Login
 * ✅ Error handling with fallback logout
 * ✅ Loading state management
 */

import { apiPost } from './apiClient';
import { clearTokens } from '../store/authSlice';
import { BASE_URL } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Logout user
 * @param {Object} params
 * @param {string} params.refreshToken - Refresh token from Redux
 * @param {Object} params.store - Redux store instance
 * @param {Object} params.navigationRef - React Navigation ref
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const performLogout = async ({
  refreshToken,
  store,
  navigationRef,
}) => {
  try {
    // Step 1: Call logout API
    if (refreshToken) {
      try {
        await apiPost(`${BASE_URL}/auth/logout`, {
          refreshToken,
        });
        console.log('[logout] API call successful');
      } catch (apiError) {
        // API failed but we still logout locally (safety fallback)
        console.log('[logout] API call failed, proceeding with local logout:', apiError?.message);
      }
    }

    // Step 2: Clear Redux state
    store?.dispatch(clearTokens());
    console.log('[logout] Redux state cleared');

    // Step 3: Clear AsyncStorage
    await AsyncStorage.multiRemove(['auth_tokens', 'user']);
    console.log('[logout] AsyncStorage cleared');

    // Step 4: Reset navigation stack
    if (navigationRef?.isReady?.()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      console.log('[logout] Navigation reset to Home');
    }

    return { success: true };
  } catch (error) {
    console.log('[logout] Unexpected error:', error?.message);
    
    // Even if something fails, try to clear local state and navigate
    try {
      store?.dispatch(clearTokens());
      await AsyncStorage.multiRemove(['auth_tokens', 'user']);
      if (navigationRef?.isReady?.()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    } catch (fallbackError) {
      console.log('[logout] Fallback cleanup failed:', fallbackError?.message);
    }

    return {
      success: false,
      error: error?.message || 'Logout failed',
    };
  }
};

/**
 * Hook-friendly logout function
 * Use this in your Profile screen
 * @param {Object} params
 * @param {string} params.refreshToken - From Redux selector
 * @param {string} params.userId - From Redux selector
 * @param {Object} params.store - Redux store
 * @param {Object} params.navigationRef - Navigation ref
 * @param {Function} params.onSuccess - Callback on success
 * @param {Function} params.onError - Callback on error
 * @returns {Promise<void>}
 */
export const handleLogout = async ({
  refreshToken,
  userId,
  store,
  navigationRef,
  onSuccess,
  onError,
}) => {
  // Only bail out when there's truly nothing to clear. A missing userId with a
  // refreshToken still present (e.g. a corrupted stored session) must still be
  // logoutable — this used to block that, trapping the user in that state.
  if (!userId && !refreshToken) {
    console.log('[logout] No user logged in');
    onError?.('No user session found');
    return;
  }

  const result = await performLogout({
    refreshToken,
    store,
    navigationRef,
  });

  if (result.success) {
    onSuccess?.();
  } else {
    onError?.(result.error);
  }
};
