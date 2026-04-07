/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN HANDLING & SESSION EXPIRATION GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This guide explains the complete token handling system including:
 * - Axios interceptors (via apiClient)
 * - Refresh token logic with retry
 * - Logout fallback handling
 * - Redux integration
 * - Navigation reset on session expiry
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. ARCHITECTURE OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TOKEN HANDLING FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. API Request                                                             │
│     ↓                                                                        │
│  2. Check if token expired (proactive)                                      │
│     ├─ YES → Refresh token before sending request                           │
│     └─ NO → Continue                                                        │
│     ↓                                                                        │
│  3. Send request with Authorization header                                  │
│     ↓                                                                        │
│  4. Server responds                                                         │
│     ├─ 401 (Unauthorized) → Attempt refresh token                           │
│     │  ├─ Refresh succeeds → Update Redux + AsyncStorage                    │
│     │  │  └─ Retry original request                                         │
│     │  └─ Refresh fails → Logout + Show alert + Navigate to Login           │
│     ├─ 5xx / Timeout → Retry with exponential backoff                       │
│     └─ Other → Return error                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
*/

// ═══════════════════════════════════════════════════════════════════════════
// 2. FILE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

/*
src/
├── services/
│   ├── apiClient.js              ← Axios interceptors, token refresh, logout
│   └── navigationService.js       ← Global navigation ref
├── store/
│   ├── authSlice.js              ← Redux auth state (tokens, user info)
│   └── index.js                  ← Redux store configuration
├── navigation/
│   ├── RootNavigator.js          ← Conditional auth/app stack + session handler
│   └── AppNavigator.js           ← App stack (all authenticated screens)
├── screens/
│   ├── LoginScreen.js            ← Login flow
│   └── ... (other screens)
├── constants/
│   ├── api.js                    ← API endpoints
│   └── authConstants.js          ← Auth constants
└── App.js                        ← App initialization + Redux setup
*/

// ═══════════════════════════════════════════════════════════════════════════
// 3. REDUX AUTH SLICE (src/store/authSlice.js)
// ═══════════════════════════════════════════════════════════════════════════

/*
State structure:
{
  auth: {
    accessToken: "eyJhbGc...",
    refreshToken: "eyJhbGc...",
    userId: 123,
    userEmail: "user@example.com",
    tokenType: "Bearer",
    tokenExpiresAt: 1704067200000,  // Unix ms timestamp
    isLoggedIn: true,
  }
}

Actions:
- setTokens(payload)     → Store tokens + calculate expiry
- clearTokens()          → Clear all auth data
- setUserInfo(payload)   → Update user info

Selectors:
- selectAccessToken()    → Get current access token
- selectRefreshToken()   → Get current refresh token
- selectUserId()         → Get user ID
- selectIsLoggedIn()     → Check if user is logged in
- selectTokenExpiresAt() → Get token expiry timestamp
*/

// ═══════════════════════════════════════════════════════════════════════════
// 4. API CLIENT (src/services/apiClient.js)
// ═══════════════════════════════════════════════════════════════════════════

/*
Key Functions:

1. setStore(store)
   - Wire Redux store to apiClient
   - MUST be called in App.js before any API calls
   - Usage: setStore(store)

2. setSessionExpiredHandler(handler)
   - Register callback for session expiration
   - Called when token refresh fails
   - Usage: setSessionExpiredHandler(() => { /* redirect to login */ })

3. apiRequest(url, options, retryCount)
   - Core request function with interceptors
   - Handles token injection, refresh, retry logic
   - Usage: apiRequest('/api/endpoint', { method: 'GET' })

4. apiGet(url, options)
   - GET request helper
   - Usage: apiGet('/api/users/profile')

5. apiPost(url, body, options)
   - POST request helper
   - Usage: apiPost('/api/orders', { amount: 100 })

6. apiPut(url, body, options)
   - PUT request helper
   - Usage: apiPut('/api/users/profile', { name: 'John' })

7. apiPatch(url, body, options)
   - PATCH request helper
   - Usage: apiPatch('/api/users/profile', { name: 'John' })

8. apiDelete(url, options)
   - DELETE request helper
   - Usage: apiDelete('/api/users/123')

9. logoutUser()
   - Call logout API + clear tokens
   - Best-effort: clears tokens even if API fails
   - Usage: await logoutUser()

10. clearAuthTokens()
    - Clear tokens from Redux + AsyncStorage
    - Usage: await clearAuthTokens()

11. persistTokens(tokens)
    - Save tokens to AsyncStorage
    - Usage: await persistTokens({ accessToken, refreshToken })

12. loadPersistedTokens()
    - Load tokens from AsyncStorage
    - Usage: const tokens = await loadPersistedTokens()

13. getUserId()
    - Get current user ID from Redux
    - Usage: const userId = getUserId()

14. triggerSessionExpired()
    - Manually trigger session expired handler
    - Usage: triggerSessionExpired()
*/

// ═══════════════════════════════════════════════════════════════════════════
// 5. NAVIGATION SERVICE (src/services/navigationService.js)
// ═══════════════════════════════════════════════════════════════════════════

/*
Global navigation ref to navigate outside React components.

Functions:

1. navigate(name, params)
   - Navigate to a screen
   - Usage: navigate('Dashboard', { tab: 'portfolio' })

2. resetAndNavigate(name, params)
   - Reset navigation stack and navigate
   - Prevents user from going back
   - Usage: resetAndNavigate('Login')

3. goBack()
   - Go back to previous screen
   - Usage: goBack()
*/

// ═══════════════════════════════════════════════════════════════════════════
// 6. ROOT NAVIGATOR (src/navigation/RootNavigator.js)
// ═══════════════════════════════════════════════════════════════════════════

/*
Conditional navigation based on login state:
- If logged in → Show AppNavigator (all authenticated screens)
- If not logged in → Show AuthStack (login, register, home)

Session Expiration Handler:
- Registered in useEffect
- Called by apiClient when token refresh fails
- Shows alert: "Session expired, please login again"
- Resets navigation stack to prevent going back
- Navigates to Login screen
*/

// ═══════════════════════════════════════════════════════════════════════════
// 7. APP INITIALIZATION (App.js)
// ═══════════════════════════════════════════════════════════════════════════

/*
Initialization Steps:

1. Wrap app with Redux Provider
   <Provider store={store}>
     <AppContent />
   </Provider>

2. In AppContent:
   a. Call setStore(store) to wire Redux to apiClient
   b. Load persisted tokens from AsyncStorage
   c. If tokens exist, restore them to Redux
   d. Render RootNavigator

3. RootNavigator:
   a. Register session expired handler
   b. Conditionally show auth or app stack
   c. Handle session expiration with alert + navigation reset
*/

// ═══════════════════════════════════════════════════════════════════════════
// 8. USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

// Example 1: Making an API request
import { apiGet, apiPost } from './src/services/apiClient';

const fetchUserProfile = async () => {
  try {
    const response = await apiGet('/api/auth/profile');
    console.log('Profile:', response);
  } catch (error) {
    if (error.status === 401) {
      console.log('Session expired');
    } else {
      console.log('Error:', error.message);
    }
  }
};

// Example 2: Logout
import { logoutUser } from './src/services/apiClient';

const handleLogout = async () => {
  await logoutUser();
  // User will be redirected to Login by RootNavigator
};

// Example 3: Using in a screen
import { useSelector } from 'react-redux';
import { selectAccessToken, selectUserId } from './src/store/authSlice';

function MyScreen() {
  const token = useSelector(selectAccessToken);
  const userId = useSelector(selectUserId);

  return (
    <View>
      <Text>User ID: {userId}</Text>
      <Text>Token: {token ? 'Present' : 'Missing'}</Text>
    </View>
  );
}

// Example 4: Manual session expiration trigger
import { triggerSessionExpired } from './src/services/apiClient';

const handleManualLogout = () => {
  triggerSessionExpired();
};

// ═══════════════════════════════════════════════════════════════════════════
// 9. API ENDPOINTS REQUIRED
// ═══════════════════════════════════════════════════════════════════════════

/*
1. POST /api/auth/refresh
   Request:
   {
     "refreshToken": "<stored_refresh_token>"
   }
   
   Response (success):
   {
     "data": {
       "accessToken": "new_access_token",
       "refreshToken": "new_refresh_token",
       "expiresIn": 3600
     }
   }
   
   Response (failure):
   {
     "message": "Invalid refresh token"
   }

2. POST /api/auth/logout
   Request:
   {
     "refreshToken": "<stored_refresh_token>"
   }
   
   Response:
   {
     "message": "Logged out successfully"
   }
   
   Note: This is called before clearing tokens (best-effort).
         If it fails, tokens are still cleared locally.

3. Any protected endpoint
   Request:
   GET /api/endpoint
   Authorization: Bearer <access_token>
   
   Response (401):
   {
     "message": "Unauthorized"
   }
   
   When 401 is received:
   1. apiClient calls POST /api/auth/refresh
   2. If refresh succeeds, retries original request
   3. If refresh fails, clears tokens + shows alert + navigates to Login
*/

// ═══════════════════════════════════════════════════════════════════════════
// 10. FLOW DIAGRAMS
// ═══════════════════════════════════════════════════════════════════════════

/*
SUCCESSFUL TOKEN REFRESH:
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. API request returns 401                                              │
│ 2. apiClient calls POST /api/auth/refresh with refreshToken             │
│ 3. Server returns new accessToken + refreshToken                        │
│ 4. apiClient updates Redux store with new tokens                        │
│ 5. apiClient persists tokens to AsyncStorage                            │
│ 6. apiClient retries original request with new token                    │
│ 7. Original request succeeds                                            │
│ 8. User continues using app without interruption                        │
└──────────────────────────────────────────────────────────────────────────┘

FAILED TOKEN REFRESH:
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. API request returns 401                                              │
│ 2. apiClient calls POST /api/auth/refresh with refreshToken             │
│ 3. Server returns 401 (invalid refresh token)                           │
│ 4. apiClient calls logoutUser()                                         │
│ 5. logoutUser() calls POST /api/auth/logout (best-effort)               │
│ 6. logoutUser() clears tokens from Redux + AsyncStorage                 │
│ 7. apiClient calls session expired handler                              │
│ 8. Handler shows alert: "Session expired, please login again"           │
│ 9. Handler resets navigation stack                                      │
│ 10. Handler navigates to Login screen                                   │
│ 11. User must log in again                                              │
└──────────────────────────────────────────────────────────────────────────┘

PROACTIVE TOKEN REFRESH:
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. User makes API request                                               │
│ 2. apiClient checks if token is expired or expiring soon (30s buffer)   │
│ 3. If yes, apiClient calls POST /api/auth/refresh proactively           │
│ 4. Server returns new tokens                                            │
│ 5. apiClient updates Redux + AsyncStorage                               │
│ 6. apiClient sends original request with new token                      │
│ 7. Request succeeds                                                     │
│ 8. User never sees 401 error                                            │
└──────────────────────────────────────────────────────────────────────────┘
*/

// ═══════════════════════════════════════════════════════════════════════════
// 11. DEBUGGING & LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/*
All major operations are logged with [apiClient] prefix:

[apiClient] Store wired. Auth state: token present
[apiClient] Session expired handler registered
[apiClient] GET /api/endpoint | token: present (***abc123)
[apiClient] Token refresh failed, triggering session expired handler
[apiClient] Logout API call failed (non-blocking): Network error
[apiClient] Catch block error: Request timeout

Enable logging in console to debug token issues.
*/

// ═══════════════════════════════════════════════════════════════════════════
// 12. BEST PRACTICES
// ═══════════════════════════════════════════════════════════════════════════

/*
1. Always call setStore(store) in App.js before rendering
2. Use apiGet/apiPost/etc. instead of fetch() for all API calls
3. Handle ApiError in try-catch blocks
4. Don't manually clear tokens; use logoutUser() instead
5. Don't navigate manually on 401; let apiClient handle it
6. Use Redux selectors to access auth state in components
7. Test token refresh by setting a short expiry time
8. Test logout by invalidating refresh token on server
9. Monitor console logs for [apiClient] messages
10. Ensure logout API is called before clearing tokens (best-effort)
*/

// ═══════════════════════════════════════════════════════════════════════════
// 13. TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════════════════════

/*
Issue: "Session expired handler not registered"
Solution: Ensure RootNavigator is rendered and useEffect runs

Issue: Token not being injected in requests
Solution: Ensure setStore(store) is called in App.js

Issue: Infinite refresh loop
Solution: Check if refresh endpoint is returning valid tokens

Issue: User can go back after session expires
Solution: Ensure resetAndNavigate() is used, not navigate()

Issue: Logout API not being called
Solution: Check if logoutUser() is being called before clearAuthTokens()

Issue: Tokens not persisting after app restart
Solution: Ensure persistTokens() is called after token update

Issue: 401 errors not triggering refresh
Solution: Check if apiClient is wired to Redux store
*/

// ═══════════════════════════════════════════════════════════════════════════
// 14. CONSTANTS (src/constants/authConstants.js)
// ═══════════════════════════════════════════════════════════════════════════

/*
export const SESSION_EXPIRED = 'SESSION_EXPIRED';
export const AUTH_STORAGE_KEY = 'auth_tokens';
*/

// ═══════════════════════════════════════════════════════════════════════════
// 15. API CONSTANTS (src/constants/api.js)
// ═══════════════════════════════════════════════════════════════════════════

/*
export const BASE_URL = 'https://api.example.com/api';
export const API_REFRESH_TOKEN = `${BASE_URL}/auth/refresh`;
export const API_LOGOUT = `${BASE_URL}/auth/logout`;
*/

// ═══════════════════════════════════════════════════════════════════════════
// END OF GUIDE
// ═══════════════════════════════════════════════════════════════════════════
