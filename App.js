import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import store from './src/store';
import { setTokens } from './src/store/authSlice';
import { setStore, loadPersistedTokens, setSessionExpiredHandler } from './src/services/apiClient';
import { SessionProvider } from './src/contexts/SessionContext';
import AppNavigator from './src/navigation/AppNavigator';

// Wire Redux store into apiClient at module load time — before any component renders.
// This ensures getToken() works from the very first API call.
setStore(store);

const AppWithHydration = () => {
  const dispatch    = useDispatch();
  const navRef      = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Register the global session-expired handler.
    // When refresh token fails anywhere in the app, this resets the stack to Login.
    const handleSessionExpired = () => {
      console.log('[App] Session expired handler called, resetting to Login');
      navRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
    };
    
    setSessionExpiredHandler(handleSessionExpired);

    // Hydrate Redux from persisted tokens on cold start
    (async () => {
      const tokens = await loadPersistedTokens();
      if (tokens?.accessToken) {
        console.log('[App] Hydrating Redux with persisted token: present (***' + tokens.accessToken.slice(-6) + ')');
        dispatch(setTokens(tokens));
      } else {
        console.log('[App] No persisted tokens found in AsyncStorage');
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <SessionProvider navigationRef={navRef}>
      <AppNavigator navigationRef={navRef} />
    </SessionProvider>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#080810" />
        <AppWithHydration />
      </SafeAreaProvider>
    </Provider>
  );
}
