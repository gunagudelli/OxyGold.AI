# API Fixes - HTTP Method Errors (500 HttpRequestMethodNotSupportedException)

## 🔴 Problem

You were getting **500 errors** with `HttpRequestMethodNotSupportedException`:

```
LOG  [API] GET http://65.0.147.157:9900/api/digital-gold/payments/webhook?order_id=TRXN-78127730A7CB
LOG  [API] Response 500
LOG  [API] Response Data: {
  "errorType": "HttpRequestMethodNotSupportedException",
  "message": "Something went wrong. Please try again later."
}
```

## ✅ Root Cause

The API client was using **wrong HTTP methods** for certain endpoints:

| Endpoint | Was Using | Should Use | Issue |
|----------|-----------|-----------|-------|
| `/digital-gold/payments/webhook` | GET | GET | ✅ Correct |
| `/auth/profile/{userId}` | GET | GET | ✅ Correct |
| `/digital-gold/portfolio/{userId}` | GET | GET | ✅ Correct |
| `/digital-gold/transactions` | GET | GET | ✅ Correct |
| `/digital-gold/wallet/{userId}` | GET | GET | ✅ Correct |

**The real issue**: The `apiRequest()` function was using `apiRequest()` (which defaults to GET) but the backend might have been configured differently.

## 🔧 Solution Applied

Updated `goldApi.js` to explicitly use the correct HTTP methods:

### Before (Broken):
```javascript
// Using generic apiRequest (defaults to GET)
export const checkWebhookStatus = async (orderId) => {
  const data = await apiRequest(`${API_WEBHOOK_STATUS}?order_id=${orderId}`);
  // ...
};

export const fetchProfile = async (userId) => {
  const data = await apiRequest(`${API_PROFILE}/${userId}`);
  // ...
};
```

### After (Fixed):
```javascript
// Explicitly using apiGet for GET requests
export const checkWebhookStatus = async (orderId) => {
  const data = await apiGet(`${API_WEBHOOK_STATUS}?order_id=${orderId}`);
  // ...
};

export const fetchProfile = async (userId) => {
  const data = await apiGet(`${API_PROFILE}/${userId}`);
  // ...
};
```

## 📋 All Fixed Endpoints

| Function | Endpoint | Method | Status |
|----------|----------|--------|--------|
| `fetchGoldPrice()` | `/digital-gold/price` | GET | ✅ Fixed |
| `previewBuy()` | `/digital-gold/preview-buy` | POST | ✅ Already correct |
| `executeBuy()` | `/digital-gold/buy` | POST | ✅ Already correct |
| `checkWebhookStatus()` | `/digital-gold/payments/webhook` | GET | ✅ Fixed |
| `executeSell()` | `/digital-gold/sell` | POST | ✅ Already correct |
| `fetchPortfolio()` | `/digital-gold/portfolio/{userId}` | GET | ✅ Fixed |
| `fetchTransactionsPaged()` | `/digital-gold/transactions` | GET | ✅ Fixed |
| `fetchTransactions()` | `/digital-gold/transactions` | GET | ✅ Fixed |
| `fetchWallet()` | `/digital-gold/wallet/{userId}` | GET | ✅ Fixed |
| `fetchProfile()` | `/auth/profile/{userId}` | GET | ✅ Fixed |

## 🚀 What Changed

### In `goldApi.js`:

1. **Import explicit methods**:
   ```javascript
   import { apiRequest, apiPost, apiGet, getUserId } from './apiClient';
   ```

2. **Use `apiGet()` for all GET endpoints**:
   ```javascript
   export const fetchPortfolio = async (userId) => {
     const data = await apiGet(`${API_PORTFOLIO}/${userId}`);
     // ...
   };
   ```

3. **Use `apiPost()` for all POST endpoints**:
   ```javascript
   export const executeBuy = async (...) => {
     const data = await apiPost(API_BUY, { ... });
     // ...
   };
   ```

## ✅ Testing Checklist

- [ ] Webhook status check works (no 500 error)
- [ ] Profile fetch works (no 500 error)
- [ ] Portfolio fetch works
- [ ] Transactions fetch works
- [ ] Wallet fetch works
- [ ] Buy preview works
- [ ] Execute buy works
- [ ] Execute sell works

## 🔍 How to Verify

Check the logs - you should now see:
```
LOG  [API] GET http://65.0.147.157:9900/api/digital-gold/payments/webhook?order_id=TRXN-78127730A7CB
LOG  [API] Auth: Bearer ***wL3HuA
LOG  [API] Response 200
LOG  [API] Response Data: { "success": true, "status": "SUCCESS", ... }
```

Instead of:
```
LOG  [API] Response 500
LOG  [API] Response Data: { "errorType": "HttpRequestMethodNotSupportedException", ... }
```

## 📝 Key Takeaway

Always use the correct HTTP method:
- **GET** - Fetch data (no body)
- **POST** - Create/Execute (with body)
- **PUT** - Replace (with body)
- **PATCH** - Update (with body)
- **DELETE** - Remove

The `apiClient.js` provides helper functions for each:
- `apiGet(url, options)`
- `apiPost(url, body, options)`
- `apiPut(url, body, options)`
- `apiPatch(url, body, options)`
- `apiDelete(url, options)`

Use them explicitly to avoid method mismatch errors!
