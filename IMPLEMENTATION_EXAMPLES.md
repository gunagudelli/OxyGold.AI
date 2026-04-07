/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXAMPLE IMPLEMENTATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file shows practical examples of using the token handling system
 * in your React Native screens.
 */

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { apiPost } from '../services/apiClient';
import { setTokens } from '../store/authSlice';
import { persistTokens } from '../services/apiClient';
import { BASE_URL } from '../constants/api';

export function LoginScreenExample({ navigation }) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      // Call login API
      const response = await apiPost(`${BASE_URL}/auth/userLoginOrRegister`, {
        email,
        password,
      });

      // Extract tokens from response
      const { accessToken, refreshToken, userId, userEmail, expiresIn } = response?.data || response;

      if (!accessToken) {
        throw new Error('No access token in response');
      }

      // Store tokens in Redux
      dispatch(setTokens({
        accessToken,
        refreshToken,
        userId,
        userEmail,
        expiresIn,
      }));

      // Persist tokens to AsyncStorage
      await persistTokens({
        accessToken,
        refreshToken,
        userId,
        userEmail,
        expiresIn,
      });

      console.log('[LoginScreen] Login successful, tokens stored');

      // Navigation will happen automatically via RootNavigator
      // because isLoggedIn changed in Redux
    } catch (error) {
      console.error('[LoginScreen] Login failed:', error);
      Alert.alert('Login Failed', error?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{ backgroundColor: '#B8891A', padding: 15, borderRadius: 8 }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
            Login
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: PROFILE SCREEN (PROTECTED)
// ═══════════════════════════════════════════════════════════════════════════

import { useSelector } from 'react-redux';
import { selectAccessToken, selectUserId, selectUserEmail } from '../store/authSlice';
import { logoutUser } from '../services/apiClient';

export function ProfileScreenExample({ navigation }) {
  const userId = useSelector(selectUserId);
  const userEmail = useSelector(selectUserEmail);
  const token = useSelector(selectAccessToken);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // This will automatically inject the token
      const response = await apiGet(`${BASE_URL}/auth/profile`);
      setProfile(response?.data || response);
    } catch (error) {
      console.error('[ProfileScreen] Failed to fetch profile:', error);
      // If error is SESSION_EXPIRED, apiClient will handle it
      // and redirect to login automatically
      if (error.message !== 'SESSION_EXPIRED') {
        Alert.alert('Error', error?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            // This calls logout API + clears tokens
            await logoutUser();
            // RootNavigator will automatically show auth stack
          } catch (error) {
            console.error('[ProfileScreen] Logout failed:', error);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B8891A" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Profile
      </Text>
      <Text>User ID: {userId}</Text>
      <Text>Email: {userEmail}</Text>
      <Text>Token: {token ? 'Present' : 'Missing'}</Text>
      {profile && (
        <Text>Name: {profile.name}</Text>
      )}
      <TouchableOpacity
        onPress={handleLogout}
        style={{ backgroundColor: '#C0392B', padding: 15, borderRadius: 8, marginTop: 20 }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: DASHBOARD SCREEN (PROTECTED)
// ═══════════════════════════════════════════════════════════════════════════

export function DashboardScreenExample({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Make API request - token is automatically injected
      const response = await apiGet(`${BASE_URL}/digital-gold/portfolio`);
      setData(response?.data || response);
    } catch (error) {
      console.error('[Dashboard] Error:', error);

      // Check if it's a session expired error
      if (error.message === 'SESSION_EXPIRED') {
        // apiClient will handle this automatically
        // and redirect to login
        console.log('[Dashboard] Session expired, will be redirected');
      } else {
        setError(error?.message || 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B8891A" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#C0392B', marginBottom: 10 }}>Error: {error}</Text>
        <TouchableOpacity
          onPress={loadDashboard}
          style={{ backgroundColor: '#B8891A', padding: 10, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Dashboard
      </Text>
      {data && (
        <View>
          <Text>Portfolio Value: {data.totalValue}</Text>
          <Text>Gold Holdings: {data.goldAmount}g</Text>
        </View>
      )}
      <TouchableOpacity
        onPress={loadDashboard}
        style={{ backgroundColor: '#B8891A', padding: 10, borderRadius: 8, marginTop: 20 }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: CUSTOM HOOK FOR API CALLS
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback } from 'react';

/**
 * Custom hook for making API calls with loading/error states
 * Automatically handles token injection and session expiration
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const call = useCallback(async (apiFunction, onSuccess) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFunction();
      
      if (onSuccess) {
        onSuccess(response);
      }

      return response;
    } catch (err) {
      console.error('[useApiCall] Error:', err);

      // Don't set error if it's session expired
      // (apiClient will handle it)
      if (err.message !== 'SESSION_EXPIRED') {
        setError(err?.message || 'An error occurred');
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { call, loading, error };
}

// Usage:
function MyScreenWithHook() {
  const { call, loading, error } = useApiCall();

  const handleFetchData = async () => {
    await call(
      () => apiGet(`${BASE_URL}/api/data`),
      (response) => {
        console.log('Data:', response);
      }
    );
  };

  return (
    <View>
      <TouchableOpacity onPress={handleFetchData} disabled={loading}>
        <Text>{loading ? 'Loading...' : 'Fetch Data'}</Text>
      </TouchableOpacity>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: HANDLING DIFFERENT ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

async function handleApiCall() {
  try {
    const response = await apiPost(`${BASE_URL}/api/endpoint`, { data: 'value' });
    console.log('Success:', response);
  } catch (error) {
    // error is an ApiError instance with status and data properties

    if (error.status === 401) {
      // Session expired - apiClient handles this automatically
      console.log('Session expired');
    } else if (error.status === 400) {
      // Bad request - validation error
      console.log('Validation error:', error.data);
      Alert.alert('Validation Error', error.message);
    } else if (error.status === 403) {
      // Access denied
      console.log('Access denied');
      Alert.alert('Access Denied', error.message);
    } else if (error.status === 404) {
      // Not found
      console.log('Resource not found');
      Alert.alert('Not Found', error.message);
    } else if (error.status === 429) {
      // Rate limited
      console.log('Too many requests');
      Alert.alert('Rate Limited', 'Please try again later');
    } else if (error.status >= 500) {
      // Server error
      console.log('Server error');
      Alert.alert('Server Error', 'Please try again later');
    } else if (error.status === 0) {
      // Network error
      console.log('Network error');
      Alert.alert('Network Error', 'Please check your connection');
    } else {
      // Other error
      console.log('Error:', error.message);
      Alert.alert('Error', error.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 6: TESTING TOKEN REFRESH
// ═══════════════════════════════════════════════════════════════════════════

/*
To test token refresh:

1. Set a short token expiry time (e.g., 10 seconds)
   In your login response, set expiresIn: 10

2. Make an API call after 10 seconds
   The apiClient will:
   - Detect token is expired
   - Call refresh endpoint proactively
   - Get new token
   - Send original request with new token

3. To test failed refresh:
   - Invalidate refresh token on server
   - Make an API call
   - apiClient will:
     - Get 401 response
     - Try to refresh
     - Refresh fails
     - Clear tokens
     - Show alert
     - Redirect to login

4. Monitor console logs:
   [apiClient] Token refresh failed, triggering session expired handler
   [RootNavigator] Session expired, redirecting to Login
*/

// ═══════════════════════════════════════════════════════════════════════════
// END OF EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════
