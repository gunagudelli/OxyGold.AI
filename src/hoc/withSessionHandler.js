/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WITH SESSION HANDLER - HOC
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Higher-Order Component that wraps screens with automatic session handling
 * 
 * Features:
 * ✅ Automatic token validation
 * ✅ Shows SessionExpired UI when needed
 * ✅ Handles API errors automatically
 * ✅ Provides session utilities to wrapped component
 * 
 * Usage:
 * export default withSessionHandler(MyScreen);
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectUserId } from '../store/authSlice';
import { useSession } from '../contexts/SessionContext';
import SessionExpired from '../components/SessionExpired';

/**
 * HOC to wrap screens with session handling
 * @param {React.Component} WrappedComponent - Component to wrap
 * @param {Object} options - Configuration options
 * @returns {React.Component} - Wrapped component with session handling
 */
const withSessionHandler = (WrappedComponent, options = {}) => {
  const {
    requireAuth = true,           // Require authentication
    showLoadingOnCheck = false,   // Show loading while checking session
    fallbackVariant = 'fullscreen', // 'fullscreen' | 'inline'
  } = options;

  return (props) => {
    const accessToken = useSelector(selectAccessToken);
    const userId = useSelector(selectUserId);
    const { handleAuthError, isSessionValid } = useSession();
    const [isChecking, setIsChecking] = useState(showLoadingOnCheck);

    useEffect(() => {
      if (showLoadingOnCheck) {
        // Simulate session check
        setTimeout(() => setIsChecking(false), 300);
      }
    }, []);

    // Check if session is valid
    const hasValidSession = accessToken && userId && isSessionValid();

    // Show loading during check
    if (isChecking) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      );
    }

    // Show session expired UI if auth required and session invalid
    if (requireAuth && !hasValidSession) {
      return (
        <SessionExpired
          variant={fallbackVariant}
          onLoginPress={() => {
            props.navigation?.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }}
        />
      );
    }

    // Provide session utilities to wrapped component
    const enhancedProps = {
      ...props,
      session: {
        handleAuthError,
        isSessionValid,
        hasValidSession,
      },
    };

    return <WrappedComponent {...enhancedProps} />;
  };
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F5F0',
  },
});

export default withSessionHandler;
