import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import store from './src/store';
import { setTokens } from './src/store/authSlice';
import { setStore, loadPersistedTokens } from './src/services/apiClient';
import AppNavigator from './src/navigation/AppNavigator';

// Wire the store into apiClient so it can read the token synchronously
setStore(store);

const AppWithHydration = () => {
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const tokens = await loadPersistedTokens();
      if (tokens?.accessToken) {
        dispatch(setTokens(tokens));
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  return <AppNavigator />;
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
