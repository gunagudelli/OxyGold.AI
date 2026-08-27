/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SESSION CONTEXT - GLOBAL SESSION MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ Global session expired handler
 * ✅ Toast notifications for session events
 * ✅ Automatic redirect to Login
 * ✅ Session state tracking
 * ✅ Retry mechanism for failed requests
 * 
 * Usage:
 * - Wrap app with SessionProvider
 * - Use useSession() hook in components
 * - apiClient automatically triggers session expired
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { clearTokens } from '../store/authSlice';
import { clearPersistedTokens } from '../services/apiClient';

const SessionContext = createContext(null);

export const SessionProvider = ({ children, navigationRef }) => {
  const dispatch = useDispatch();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const sessionExpiredShown = useRef(false);

  /**
   * Handle session expiry
   * Called by apiClient when token refresh fails or 401 occurs
   */
  const handleSessionExpired = useCallback(async (options = {}) => {
    const {
      showAlert = false,  // Changed default to false - no alert by default
      autoRedirect = true,
    } = options;

    // Prevent multiple redirects
    if (sessionExpiredShown.current) return;
    sessionExpiredShown.current = true;

    console.log('[SessionContext] Session expired, clearing tokens and redirecting...');

    // Clear Redux and AsyncStorage
    dispatch(clearTokens());
    await clearPersistedTokens();

    // Update state
    setSessionExpired(true);

    // Show alert only if explicitly requested
    if (showAlert) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'Login Again',
            onPress: () => {
              sessionExpiredShown.current = false;
              setSessionExpired(false);
              if (autoRedirect && navigationRef?.current) {
                navigationRef.current.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            },
          },
        ],
        { cancelable: false }
      );
    } else if (autoRedirect && navigationRef?.current) {
      // Auto redirect without alert (default behavior)
      setTimeout(() => {
        sessionExpiredShown.current = false;
        setSessionExpired(false);
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 100);
    }
  }, [dispatch, navigationRef]);

  /**
   * Handle authentication errors
   * Called by components when API returns 401
   */
  const handleAuthError = useCallback((error) => {
    if (error?.status === 401 || error?.message === 'SESSION_EXPIRED') {
      handleSessionExpired();
      return true;
    }
    return false;
  }, [handleSessionExpired]);

  /**
   * Reset session state
   * Called after successful login
   */
  const resetSession = useCallback(() => {
    sessionExpiredShown.current = false;
    setSessionExpired(false);
    setShowSessionModal(false);
  }, []);

  /**
   * Check if session is valid
   */
  const isSessionValid = useCallback(() => {
    return !sessionExpired;
  }, [sessionExpired]);

  const value = {
    sessionExpired,
    showSessionModal,
    handleSessionExpired,
    handleAuthError,
    resetSession,
    isSessionValid,
    setShowSessionModal,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Hook to access session context
 */
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

export default SessionContext;
