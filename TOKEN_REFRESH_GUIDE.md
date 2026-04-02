/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN REFRESH IMPLEMENTATION GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This guide explains how token refresh works in the React Native app
 * when the access token expires.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═════════════════════════════════════════════════════════════════════════
// 1. ARCHITECTURE OVERVIEW
// ═════════════════════════════════════════════════════════════════════════

/*
┌─────────────────────────────────────────────────────────────────────────┐
│                         TOKEN REFRESH FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

User makes API call
        ↓
apiRequest() in apiClient.js
        ↓
Get accessToken from Redux
        ↓
Add Authorization: Bearer {token} header
        ↓
Send request to server
        ↓
Server responds
        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ IF Status 200 OK                                                        │
│ → Return data ✅                                                        │
└─────────────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ IF Status 401 Unauthorized (Token Expired)                              │
│ → Check if already retried (_retry flag)                                │
│   → YES: Force logout ❌                                                │
│   → NO: Proceed to refresh                                              │
└─────────────────────────────────────────────────────────────────────────┘
        ↓
Check if refresh already in progress
        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ IF Refresh in progress (singleton pattern)                              │
│ → Wait for existing refresh promise                                     │
│ → Prevents duplicate refresh calls                                      │
└─────────────────────────────────────────────────────────────────────────┘
        ↓
POST /api/auth/refresh { refreshToken }
        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ IF Refresh Success                                                      │
│ → Save new accessToken to Redux (setTokens)                             │
│ → Save new tokens to AsyncStorage (persistTokens)                       │
│ → Retry original request with new token                                 │
│ → Return data ✅                                                        │
└─────────────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ IF Refresh Fails                                                        │
│ → Clear all tokens from Redux (clearTokens)                             │
│ → Clear all tokens from AsyncStorage (clearPersistedTokens)             │
│ → Throw SESSION_EXPIRED error                                           │
│ → User redirected to Login screen ❌                                    │
└─────────────────────────────────────────────────────────────────────────┘
*/

// ═════════════════════════════════════════════════════════════════════════
// 2. KEY COMPONENTS
// ═════════════════════════════════════════════════════════════════════════

/*
┌─────────────────────────────────────────────────────────────────────────┐
│ A. apiClient.js (src/services/apiClient.js)                             │
├─────────────────────────────────────────────────────────────────────────┤
│ • apiRequest() - Main function that handles all API calls               │
│ • refreshAccessToken() - Handles token refresh with singleton pattern   │
│ • getToken() - Reads accessToken from Redux                             │
│ • getRefreshToken() - Reads refreshToken from Redux                     │
│ • persistTokens() - Saves tokens to AsyncStorage                        │
│ • clearAuthTokens() - Clears all tokens on logout                       │
│ • setStore() - Initializes Redux store reference                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ B. authSlice.js (src/store/authSlice.js)                                │
├─────────────────────────────────────────────────────────────────────────┤
│ • setTokens() - Redux action to update tokens                           │
│ • clearTokens() - Redux action to clear tokens                          │
│ • selectAccessToken - Selector to get accessToken from Redux            │
│ • selectRefreshToken - Selector to get refreshToken from Redux          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ C. App.js (src/App.js)                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ • Calls setStore(store) to initialize apiClient                         │
│ • Loads persisted tokens on app start                                   │
│ • Restores user session if tokens exist                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ D. api.js constants (src/constants/api.js)                              │
├─────────────────────────────────────────────────────────────────────────┤
│ • API_REFRESH_TOKEN = /api/auth/refresh                                 │
│ • BASE_URL = http://65.0.147.157:9900/api                               │
└─────────────────────────────────────────────────────────────────────────┘
*/

// ═════════════════════════════════════════════════════════════════════════
// 3. REFRESH TOKEN API ENDPOINT
// ═════════════════════════════════════════════════════════════════════════

/*
Endpoint: POST /api/auth/refresh

Request:
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiI1IiwicGhvbmUiOiI4ODg2NzUxNjU3IiwidmVyIjoxLCJpYXQiOjE3NzUwNTEyOTMsImV4cCI6MTc3NTA1MjE5M30.5yKM-ck_kq7wF97bEwP1ZXd5REwXiyjCbdVwgCPBpa3FJnK7vk7fS4dYdUxfpthL_bDPcf4MlOQkXOd0Yo50QQ"
}

Response (Success):
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiI1IiwicGhvbmUiOiI4ODg2NzUxNjU3IiwidmVyIjoxLCJpYXQiOjE3NzUwNTEyOTMsImV4cCI6MTc3NTA1MjE5M30.NEW_TOKEN_HERE",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiI1IiwicGhvbmUiOiI4ODg2NzUxNjU3IiwidmVyIjoxLCJpYXQiOjE3NzUwNTEyOTMsImV4cCI6MTc3NTA1MjE5M30.NEW_REFRESH_TOKEN_HERE",
    "expiresIn": 3600
  }
}

Response (Failure):
{
  "success": false,
  "message": "Invalid refresh token"
}
*/

// ═════════════════════════════════════════════════════════════════════════
// 4. SINGLETON PATTERN (Prevents Race Conditions)
// ═════════════════════════════════════════════════════════════════════════

/*
Problem: Multiple API calls fail with 401 at the same time
         → All try to refresh token simultaneously
         → Duplicate refresh requests sent to server
         → Potential token conflicts

Solution: Singleton Pattern
         → Only one refresh can happen at a time
         → Other requests wait for the same refresh promise
         → All requests retry with new token

Implementation in apiClient.js:

let _refreshPromise = null;

const refreshAccessToken = async () => {
  // If refresh already in progress, return existing promise
  if (_refreshPromise) {
    console.log('[API] Token refresh already in progress, waiting...');
    return _refreshPromise;  // ← Wait for existing refresh
  }

  _refreshPromise = (async () => {
    try {
      // ... perform refresh ...
      return newAccessToken;
    } finally {
      _refreshPromise = null;  // ← Reset for next time
    }
  })();

  return _refreshPromise;
};

Example Timeline:
─────────────────────────────────────────────────────────────────────────
Time  Request 1          Request 2          Request 3
─────────────────────────────────────────────────────────────────────────
T0    GET /orders        GET /profile       GET /wallet
      ↓                  ↓                  ↓
T1    401 Unauthorized   401 Unauthorized   401 Unauthorized
      ↓                  ↓                  ↓
T2    Start refresh      Wait for refresh   Wait for refresh
      ↓                  ↓                  ↓
T3    POST /refresh      (waiting...)       (waiting...)
      ↓                  ↓                  ↓
T4    Refresh success    Refresh done       Refresh done
      ↓                  ↓                  ↓
T5    Retry GET /orders  Retry GET /profile Retry GET /wallet
      ↓                  ↓                  ↓
T6    200 OK ✅          200 OK ✅          200 OK ✅
─────────────────────────────────────────────────────────────────────────
*/

// ═════════════════════════════════════════════════════════════════════════
// 5. TOKEN STORAGE STRATEGY
// ═════════════════════════════════════════════════════════════════════════

/*
Tokens are stored in TWO places:

1. Redux (In-Memory)
   ├─ Fast access during app runtime
   ├─ Lost when app is closed
   └─ Used by apiClient for every request

2. AsyncStorage (Persistent)
   ├─ Survives app restart
   ├─ Slower access (async)
   └─ Used to restore session on app start

Flow:
─────────────────────────────────────────────────────────────────────────
User logs in
  ↓
Server returns accessToken + refreshToken
  ↓
Save to Redux (setTokens)
  ↓
Save to AsyncStorage (persistTokens)
  ↓
User closes app
  ↓
App restarts
  ↓
Load from AsyncStorage (loadPersistedTokens)
  ↓
Restore to Redux (setTokens)
  ↓
User is logged in again ✅
─────────────────────────────────────────────────────────────────────────

Token expires during API call
  ↓
Server returns 401
  ↓
Refresh token using refreshToken from Redux
  ↓
Server returns new accessToken + refreshToken
  ↓
Update Redux (setTokens)
  ↓
Update AsyncStorage (persistTokens)
  ↓
Retry original request with new token ✅
─────────────────────────────────────────────────────────────────────────
*/

// ═════════════════════════════════════════════════════════════════════════
// 6. AUTOMATIC RETRY LOGIC
// ═════════════════════════════════════════════════════════════════════════

/*
The apiClient automatically retries failed requests:

Retryable Errors:
  • 408 Request Timeout
  • 429 Too Many Requests
  • 500 Internal Server Error
  • 502 Bad Gateway
  • 503 Service Unavailable
  • 504 Gateway Timeout

Non-Retryable Errors:
  • 400 Bad Request
  • 401 Unauthorized (after refresh fails)
  • 403 Forbidden
  • 404 Not Found

Retry Configuration (in apiClient.js):
  • MAX_RETRIES: 2 (max 2 retry attempts)
  • RETRY_DELAY: 1000ms (1 second)
  • Exponential backoff: delay * (retryCount + 1)

Example:
  Request fails with 503
  ↓
  Wait 1000ms (1 * 1)
  ↓
  Retry 1/2
  ↓
  Still fails with 503
  ↓
  Wait 2000ms (1 * 2)
  ↓
  Retry 2/2
  ↓
  Still fails with 503
  ↓
  Throw error ❌
*/

// ═════════════════════════════════════════════════════════════════════════
// 7. ERROR HANDLING
// ═════════════════════════════════════════════════════════════════════════

/*
When token refresh fails:

1. Clear all tokens from Redux
   dispatch(clearTokens())

2. Clear all tokens from AsyncStorage
   await clearPersistedTokens()

3. Throw SESSION_EXPIRED error
   throw new ApiError('SESSION_EXPIRED', 401, data)

4. Navigation automatically redirects to Login
   (Handled in RootNavigator based on isLoggedIn selector)

This ensures:
  • User cannot make API calls without valid token
  • User is forced to login again
  • No stale tokens remain in storage
*/

// ═════════════════════════════════════════════════════════════════════════
// 8. USAGE IN COMPONENTS
// ═════════════════════════════════════════════════════════════════════════

/*
Example: Fetching orders with automatic token refresh

import { getUserOrders } from './physicalGoldApi';

const PgOrdersScreen = ({ navigation, route }) => {
  const userId = route?.params?.userId;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // This automatically handles token refresh if needed
      const orders = await getUserOrders(userId);
      setOrders(orders);
    } catch (error) {
      if (error.message === 'SESSION_EXPIRED') {
        // User will be redirected to Login by RootNavigator
        Alert.alert('Session Expired', 'Please login again');
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
};

What happens behind the scenes:
1. getUserOrders() calls apiGet()
2. apiGet() calls apiRequest()
3. apiRequest() adds Authorization header with current token
4. If server returns 401:
   - refreshAccessToken() is called
   - New token is fetched from server
   - Redux is updated with new token
   - AsyncStorage is updated with new token
   - Original request is retried with new token
5. If refresh fails:
   - All tokens are cleared
   - SESSION_EXPIRED error is thrown
   - Component catches error and shows message
   - RootNavigator redirects to Login
*/

// ═════════════════════════════════════════════════════════════════════════
// 9. DEBUGGING TOKEN REFRESH
// ═════════════════════════════════════════════════════════════════════════

/*
Enable detailed logging in apiClient.js:

Look for these logs in console:

[API] GET /api/order/user/5
[API] Auth: Bearer ***pa3FJnK7  ← Last 6 chars of token
[API] Response 200
[API] Response Data: { ... }

When token expires:
[API] GET /api/order/user/5
[API] Auth: Bearer ***pa3FJnK7
[API] Response 401
[API] Refreshing access token...
[API] Token refresh already in progress, waiting...  ← Singleton pattern
[API] Token refreshed successfully
[API] GET /api/order/user/5  ← Retry with new token
[API] Auth: Bearer ***newToken
[API] Response 200

When refresh fails:
[API] Refreshing access token...
[API] Token refresh failed: Invalid refresh token
[API] Auth tokens cleared - user logged out
*/

// ═════════════════════════════════════════════════════════════════════════
// 10. CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════

/*
In apiClient.js:

const CONFIG = {
  REQUEST_TIMEOUT: 15000,  // 15 seconds - timeout for any request
  MAX_RETRIES: 2,          // Max 2 retry attempts for retryable errors
  RETRY_DELAY: 1000,       // 1 second - base delay for retries
};

In api.js constants:

export const API_REFRESH_TOKEN = `${BASE_URL}/auth/refresh`;
// Full URL: http://65.0.147.157:9900/api/auth/refresh

Adjust these values based on your needs:
  • Increase REQUEST_TIMEOUT if network is slow
  • Increase MAX_RETRIES for unreliable networks
  • Increase RETRY_DELAY to reduce server load
*/

// ═════════════════════════════════════════════════════════════════════════
// 11. SUMMARY
// ═════════════════════════════════════════════════════════════════════════

/*
✅ What's Implemented:

1. Automatic token refresh on 401
2. Singleton pattern to prevent race conditions
3. Dual storage (Redux + AsyncStorage)
4. Automatic retry logic for transient errors
5. Session restoration on app restart
6. Comprehensive error handling
7. Detailed logging for debugging

✅ How It Works:

1. User makes API call
2. Token is automatically injected from Redux
3. If server returns 401:
   - Check if refresh already in progress
   - If yes: wait for existing refresh
   - If no: start new refresh
4. Refresh token using refreshToken
5. Save new tokens to Redux and AsyncStorage
6. Retry original request with new token
7. If refresh fails: clear tokens and force logout

✅ No Manual Token Handling Needed:

Just use the API functions:
  • apiGet(url)
  • apiPost(url, body)
  • apiPut(url, body)
  • apiPatch(url, body)
  • apiDelete(url)

Token refresh happens automatically!
*/
