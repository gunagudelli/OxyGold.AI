/**
 * ═══════════════════════════════════════════════════════════════════════════
 * APP.JS - INITIALIZATION & SETUP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file shows how to:
 * ✅ Initialize Redux store
 * ✅ Pass store to apiClient
 * ✅ Load persisted tokens on app start
 * ✅ Setup navigation
 * 
 * IMPORTANT: setStore() MUST be called before any API calls!
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import store from './src/store';

// Import API client initialization
import { setStore, loadPersistedTokens } from './src/services/apiClient';
import { setTokens } from './src/store/authSlice';

// Import navigation
import RootNavigator from './src/navigation/RootNavigator';

/**
 * Main App Component
 * Handles initialization and token loading
 */
function AppContent() {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize app:
   * 1. Pass Redux store to apiClient
   * 2. Load persisted tokens from AsyncStorage
   * 3. Restore user session if tokens exist
   */
  const initializeApp = async () => {
    try {
      console.log('[App] Initializing...');

      // ✅ STEP 1: Pass Redux store to apiClient
      // This allows apiClient to read token from Redux
      setStore(store);
      console.log('[App] API client initialized with Redux store');

      // ✅ STEP 2: Load persisted tokens from AsyncStorage
      const persistedTokens = await loadPersistedTokens();

      if (persistedTokens?.accessToken) {
        console.log('[App] Persisted tokens found, restoring session...');

        // ✅ STEP 3: Restore tokens to Redux
        dispatch(setTokens({
          accessToken: persistedTokens.accessToken,
          refreshToken: persistedTokens.refreshToken,
          userId: persistedTokens.userId,
          userEmail: persistedTokens.userEmail,
        }));

        console.log('[App] User session restored');
      } else {
        console.log('[App] No persisted tokens found, user needs to login');
      }
    } catch (error) {
      console.error('[App] Initialization failed:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <RootNavigator />;
}

/**
 * Root App Component
 * Wraps everything with Redux Provider
 */
export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STORE SETUP (src/store/index.js)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add other reducers here
  },
});

export default store;
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NAVIGATION SETUP (src/navigation/RootNavigator.js)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from '../store/authSlice';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import DigitalGoldScreen from '../screens/digitalGold/DigitalGoldScreen';
import PhysicalGoldScreen from '../screens/physicalGold/PhysicalGoldScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const isLoggedIn = useSelector(selectIsLoggedIn);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isLoggedIn ? (
          // Auth Stack
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // App Stack
          <>
            <Stack.Screen
              name="DigitalGold"
              component={DigitalGoldScreen}
              options={{ title: 'Digital Gold' }}
            />
            <Stack.Screen
              name="PhysicalGold"
              component={PhysicalGoldScreen}
              options={{ title: 'Physical Gold' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
*/
