/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IMPLEMENTATION SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete token handling system for React Native with Redux, Axios, and
 * React Navigation. Handles session expiration, token refresh, and logout.
 */

// ═══════════════════════════════════════════════════════════════════════════
// FILES CREATED/MODIFIED
// ═══════════════════════════════════════════════════════════════════════════

/*
NEW FILES:
✅ src/services/navigationService.js
   - Global navigation ref for navigating outside React components
   - Functions: navigate(), resetAndNavigate(), goBack()

✅ src/navigation/RootNavigator.js
   - Conditional auth/app stack based on login state
   - Registers session expired handler
   - Shows alert and resets navigation on session expiry

MODIFIED FILES:
✅ src/services/apiClient.js
   - Added logoutUser() function for logout API integration
   - Added triggerSessionExpired() for manual session expiration
   - Updated refreshAccessToken() to call logoutUser() on failure
   - Added BASE_URL import for logout endpoint

✅ App.js
   - Updated to use RootNavigator instead of AppNavigator
   - Calls setStore(store) to wire Redux to apiClient
   - Loads persisted tokens on app start
   - Restores tokens to Redux if they exist

EXISTING FILES (NO CHANGES NEEDED):
✅ src/store/authSlice.js
   - Already has setTokens, clearTokens, selectors
   - No changes needed

✅ src/constants/api.js
   - Already has BASE_URL and API_REFRESH_TOKEN
   - No changes needed

✅ src/constants/authConstants.js
   - Already has SESSION_EXPIRED and AUTH_STORAGE_KEY
   - No changes needed

✅ src/screens/LoginScreen.js
   - Already uses setTokens and persistTokens
   - No changes needed
*/

// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE FLOW DIAGRAM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  APP INITIALIZATION                                                         │
│  ├─ App.js wraps with Redux Provider                                        │
│  ├─ AppContent calls setStore(store)                                        │
│  ├─ AppContent loads persisted tokens from AsyncStorage                     │
│  ├─ AppContent restores tokens to Redux                                     │
│  └─ AppContent renders RootNavigator                                        │
│                                                                              │
│  ROOT NAVIGATOR                                                             │
│  ├─ Registers session expired handler                                       │
│  ├─ Checks isLoggedIn from Redux                                            │
│  ├─ If logged in → Show AppNavigator (all screens)                          │
│  └─ If not logged in → Show AuthStack (login, register, home)               │
│                                                                              │
│  API REQUEST FLOW                                                           │
│  ├─ Screen calls apiGet/apiPost/etc.                                        │
│  ├─ apiClient checks if token expired (proactive)                           │
│  │  └─ If yes → Refresh token before sending                                │
│  ├─ apiClient injects token in Authorization header                         │
│  ├─ Server responds                                                         │
│  │  ├─ 401 → Attempt refresh token                                          │
│  │  │  ├─ Refresh succeeds → Update Redux + AsyncStorage                    │
│  │  │  │  └─ Retry original request                                         │
│  │  │  └─ Refresh fails → Call logoutUser()                                 │
│  │  │     ├─ Call logout API (best-effort)                                  │
│  │  │     ├─ Clear tokens from Redux + AsyncStorage                         │
│  │  │     ├─ Call session expired handler                                   │
│  │  │     └─ Handler shows alert + resets navigation                        │
│  │  ├─ 5xx / Timeout → Retry with exponential backoff                       │
│  │  └─ Other → Return error                                                 │
│  └─ Screen receives response or error                                       │
│                                                                              │
│  LOGOUT FLOW                                                                │
│  ├─ Screen calls logoutUser()                                               │
│  ├─ logoutUser() calls POST /api/auth/logout (best-effort)                  │
│  ├─ logoutUser() calls clearAuthTokens()                                    │
│  ├─ clearAuthTokens() clears Redux + AsyncStorage                           │
│  ├─ RootNavigator detects isLoggedIn = false                                │
│  └─ RootNavigator shows AuthStack                                           │
│                                                                              │
│  SESSION EXPIRATION FLOW                                                    │
│  ├─ API returns 401                                                         │
│  ├─ apiClient attempts refresh                                              │
│  ├─ Refresh fails (invalid refresh token)                                   │
│  ├─ apiClient calls logoutUser()                                            │
│  ├─ logoutUser() clears tokens                                              │
│  ├─ apiClient calls session expired handler                                 │
│  ├─ Handler shows alert: "Session expired, please login again"              │
│  ├─ Handler calls resetAndNavigate('Login')                                 │
│  ├─ Navigation stack is reset (user can't go back)                          │
│  └─ User is on Login screen                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
*/

// ═══════════════════════════════════════════════════════════════════════════
// KEY FEATURES
// ═══════════════════════════════════════════════════════════════════════════

/*
1. GLOBAL TOKEN MANAGEMENT
   ✅ Redux store holds all auth state
   ✅ AsyncStorage persists tokens across app restarts
   ✅ Single source of truth for token state

2. AUTOMATIC TOKEN INJECTION
   ✅ All API requests automatically include Authorization header
   ✅ Token is read from Redux store
   ✅ No need to manually pass token to each request

3. PROACTIVE TOKEN REFRESH
   ✅ Before sending request, check if token is expired
   ✅ If expired or expiring soon (30s buffer), refresh proactively
   ✅ User never sees 401 error for proactive refresh

4. REACTIVE TOKEN REFRESH
   ✅ If API returns 401, attempt to refresh token
   ✅ If refresh succeeds, retry original request
   ✅ If refresh fails, logout and redirect to login

5. LOGOUT API INTEGRATION
   ✅ Call POST /api/auth/logout before clearing tokens
   ✅ Best-effort: clears tokens even if logout API fails
   ✅ Invalidates refresh token on server

6. SESSION EXPIRATION HANDLING
   ✅ Show alert: "Session expired, please login again"
   ✅ Reset navigation stack (prevent going back)
   ✅ Redirect to Login screen
   ✅ Works from any screen in the app

7. RETRY LOGIC
   ✅ Retry on 5xx errors (500, 502, 503, 504)
   ✅ Retry on timeout (408)
   ✅ Retry on rate limit (429)
   ✅ Exponential backoff: 1s, 2s, 4s
   ✅ Max 2 retries per request

8. ERROR HANDLING
   ✅ Custom ApiError class with status and data
   ✅ Specific error messages for each status code
   ✅ Network error detection
   ✅ Timeout detection

9. LOGGING
   ✅ All major operations logged with [apiClient] prefix
   ✅ Easy debugging with console logs
   ✅ Token state visible in logs

10. PRODUCTION-READY
    ✅ Handles edge cases (no token, no refresh token, etc.)
    ✅ Prevents race conditions (singleton refresh promise)
    ✅ Handles network errors gracefully
    ✅ Comprehensive error messages
*/

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

/*
EXAMPLE 1: Making an API request
─────────────────────────────────────────────────────────────────────────────
import { apiGet } from '../services/apiClient';

const fetchProfile = async () => {
  try {
    const response = await apiGet('/api/auth/profile');
    console.log('Profile:', response);
  } catch (error) {
    if (error.status === 401) {
      // Session expired - apiClient handles this
    } else {
      console.log('Error:', error.message);
    }
  }
};

EXAMPLE 2: Logout
─────────────────────────────────────────────────────────────────────────────
import { logoutUser } from '../services/apiClient';

const handleLogout = async () => {
  await logoutUser();
  // User will be redirected to Login by RootNavigator
};

EXAMPLE 3: Using Redux selectors
─────────────────────────────────────────────────────────────────────────────
import { useSelector } from 'react-redux';
import { selectAccessToken, selectUserId } from '../store/authSlice';

function MyScreen() {
  const token = useSelector(selectAccessToken);
  const userId = useSelector(selectUserId);
  
  return <Text>User: {userId}</Text>;
}

EXAMPLE 4: Manual session expiration
─────────────────────────────────────────────────────────────────────────────
import { triggerSessionExpired } from '../services/apiClient';

const handleManualLogout = () => {
  triggerSessionExpired();
};
*/

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS REQUIRED
// ═══════════════════════════════════════════════════════════════════════════

/*
1. POST /api/auth/refresh
   ─────────────────────────────────────────────────────────────────────────
   Request:
   {
     "refreshToken": "eyJhbGc..."
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
   ─────────────────────────────────────────────────────────────────────────
   Request:
   {
     "refreshToken": "eyJhbGc..."
   }
   
   Response:
   {
     "message": "Logged out successfully"
   }
   
   Note: This is called before clearing tokens (best-effort).
         If it fails, tokens are still cleared locally.

3. Protected endpoints (any endpoint requiring auth)
   ─────────────────────────────────────────────────────────────────────────
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
// TESTING CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

/*
BASIC FUNCTIONALITY
✅ User can login
✅ Tokens are stored in Redux
✅ Tokens are persisted to AsyncStorage
✅ User is redirected to Dashboard after login
✅ User can make API requests
✅ Token is injected in Authorization header

TOKEN REFRESH
✅ Set short token expiry (10 seconds)
✅ Wait for token to expire
✅ Make API request
✅ Check console for: [apiClient] Token refresh failed
✅ Verify new token is stored in Redux
✅ Verify original request is retried

SESSION EXPIRATION
✅ Invalidate refresh token on server
✅ Make API request
✅ Should see alert: "Session expired, please login again"
✅ Should be redirected to Login screen
✅ Should not be able to go back

LOGOUT
✅ Click logout button
✅ Should see logout API call in network tab
✅ Should be redirected to Login screen
✅ Tokens should be cleared from Redux
✅ Tokens should be cleared from AsyncStorage

NETWORK ERRORS
✅ Turn off network
✅ Make API request
✅ Should see error: "Network error. Please check your connection."
✅ Turn on network
✅ Retry should work

TIMEOUT
✅ Make request to slow endpoint
✅ Should retry with exponential backoff
✅ Should eventually timeout with: "Request timeout. Please check your connection."

RATE LIMITING
✅ Make many requests quickly
✅ Should get 429 response
✅ Should retry with exponential backoff

SERVER ERRORS
✅ Make request to endpoint that returns 500
✅ Should retry with exponential backoff
✅ Should eventually fail with: "Server error. Please try again later."

APP RESTART
✅ Login
✅ Close app
✅ Open app
✅ Should restore tokens from AsyncStorage
✅ Should be logged in automatically
✅ Should be able to make API requests

MULTIPLE SCREENS
✅ Login
✅ Navigate to multiple screens
✅ Invalidate token on server
✅ Make API request from any screen
✅ Should see alert and redirect to Login from any screen
*/

// ═══════════════════════════════════════════════════════════════════════════
// DEBUGGING TIPS
// ═══════════════════════════════════════════════════════════════════════════

/*
1. ENABLE CONSOLE LOGS
   Look for [apiClient] and [RootNavigator] messages

2. CHECK REDUX STATE
   Use Redux DevTools to inspect auth state
   - accessToken
   - refreshToken
   - userId
   - tokenExpiresAt
   - isLoggedIn

3. CHECK ASYNCSTORAGE
   Use React Native Debugger to inspect AsyncStorage
   - auth_tokens key should contain tokens

4. CHECK NETWORK REQUESTS
   Use Network tab in React Native Debugger
   - Verify Authorization header is present
   - Verify token refresh is called on 401
   - Verify logout API is called on logout

5. CHECK NAVIGATION
   Use React Navigation DevTools
   - Verify RootNavigator is rendering correct stack
   - Verify navigation reset on session expiry

6. COMMON ISSUES
   - "Session expired handler not registered"
     → Ensure RootNavigator is rendered
   
   - Token not being injected
     → Ensure setStore(store) is called in App.js
   
   - Infinite refresh loop
     → Check if refresh endpoint returns valid tokens
   
   - User can go back after logout
     → Ensure resetAndNavigate() is used
   
   - Tokens not persisting
     → Ensure persistTokens() is called after login
*/

// ═══════════════════════════════════════════════════════════════════════════
// NEXT STEPS
// ═══════════════════════════════════════════════════════════════════════════

/*
1. Verify all files are in place
   ✅ src/services/navigationService.js
   ✅ src/services/apiClient.js (updated)
   ✅ src/navigation/RootNavigator.js
   ✅ App.js (updated)

2. Update your screens to use apiGet/apiPost instead of fetch()
   - Replace all fetch() calls with apiGet/apiPost/etc.
   - Handle ApiError in try-catch blocks

3. Test thoroughly
   - Test login/logout
   - Test token refresh
   - Test session expiration
   - Test network errors
   - Test app restart

4. Monitor logs
   - Check console for [apiClient] messages
   - Check Redux state changes
   - Check AsyncStorage persistence

5. Deploy to production
   - Ensure all tests pass
   - Monitor error logs
   - Adjust timeouts/retries as needed
*/

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT & DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/*
For more information, see:
- TOKEN_HANDLING_GUIDE.md - Comprehensive guide
- IMPLEMENTATION_EXAMPLES.md - Code examples
- SETUP_CHECKLIST.md - Step-by-step setup

Key files:
- src/services/apiClient.js - Token refresh logic
- src/services/navigationService.js - Global navigation
- src/navigation/RootNavigator.js - Session handling
- src/store/authSlice.js - Redux auth state
- App.js - App initialization
*/

// ═══════════════════════════════════════════════════════════════════════════
// END OF SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
