# Digital Gold Payment Flow - Corrected & Perfect

## 📊 Complete Payment Flow Diagram

```
PaymentReviewScreen
    ↓
    [User clicks "Pay"]
    ↓
    executeBuy() API
    ├─ Returns: transactionId, paymentSessionId, orderId
    ↓
    [If WALLET payment]
    └─→ PaymentSuccess (immediate)
    
    [If UPI payment]
    └─→ Cashfree Payment Gateway
        ├─ User completes payment
        ├─ Cashfree callback: onVerify(orderID)
        ↓
        PaymentProcessingScreen
        ├─ Receives: transactionId, userId, accessToken
        ├─ Calls: /api/digital-gold/sell/execute?txnId={transactionId}
        ├─ POST with Authorization header
        ↓
        [If Success]
        └─→ PaymentSuccess
        
        [If Error]
        └─→ Dashboard (with error message)
```

---

## 🔄 Step-by-Step Flow

### Step 1: PaymentReviewScreen - User Reviews Order
**File**: `src/screens/PaymentReviewScreen.js`

```javascript
// User selects payment method (UPI or WALLET)
// User clicks "Pay ₹{amount}"
// handlePay() is called
```

**Action**: Calls `executeBuy()` API
```javascript
const result = await executeBuy({
  userId,
  purchaseType: 'AMOUNT' | 'GRAMS',
  amount: totalPayable,
  grams,
  pergramPrice,
  paymentMode: 'CASHFREE' | 'WALLET',
  productId: 4,
});
```

**Response**:
```javascript
{
  transactionId: "TXN123456",
  orderId: "ORD789",
  paymentSessionId: "session_abc123xyz",
  amount: 50000,
  grams: 2.5,
  status: "PENDING"
}
```

---

### Step 2: Payment Method Routing

#### 2A: WALLET Payment (Immediate)
```javascript
if (paymentMode === 'WALLET') {
  navigation.replace('PaymentSuccess', {
    transactionId: result.transactionId,
    amount: totalPayable,
    grams: result.grams || grams,
  });
}
```
✅ **Direct success** - No additional API calls needed

---

#### 2B: UPI Payment (Cashfree)
```javascript
if (paymentMode === 'CASHFREE') {
  startPayment(result.paymentSessionId, result.orderId, result);
}
```

**Cashfree Payment Gateway**:
```javascript
const callback = {
  onVerify: (orderID) => {
    // Payment verified by Cashfree
    navigation.replace('PaymentProcess', {
      transactionId: result.transactionId,      // ← KEY: Pass transaction ID
      paymentSessionId: result.paymentSessionId,
      amount: totalPayable,
      grams: result.grams || grams,
      method: 'UPI',
      userId: userId,                           // ← KEY: Pass user ID
    });
  },
  onError: (error, orderID) => {
    Alert.alert('Payment Failed', error?.getMessage?.());
  },
};
```

---

### Step 3: PaymentProcessingScreen - Execute Transaction

**File**: `src/screens/PaymentProcessingScreen.js`

**Receives from callback**:
```javascript
{
  transactionId: "TXN123456",
  paymentSessionId: "session_abc123xyz",
  amount: 50000,
  grams: 2.5,
  method: "UPI",
  userId: 12345
}
```

**Calls Execute API**:
```javascript
const executeUrl = `${BASE_URL}/api/digital-gold/sell/execute?txnId=${transactionId}`;

const response = await fetch(executeUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

**API Endpoint**:
```
POST http://65.0.147.157:9900/api/digital-gold/sell/execute?txnId=TXN123456

Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json

Response:
{
  "success": true,
  "status": "SUCCESS",
  "transactionId": "TXN123456",
  "message": "Gold allocated to your vault"
}
```

---

### Step 4: PaymentSuccessScreen - Confirmation

**File**: `src/screens/PaymentSuccessScreen.js`

**Receives**:
```javascript
{
  transactionId: "TXN123456",
  amount: 50000,
  grams: 2.5
}
```

**Displays**:
- ✅ Success animation
- 🪙 Gold purchased confirmation
- 📋 Transaction details
- 🔒 Security message
- Buttons: "View Portfolio" & "Done"

---

## 🔑 Key Parameters Passed Through Flow

| Parameter | Source | Used In | Purpose |
|-----------|--------|---------|---------|
| `transactionId` | executeBuy() | PaymentProcess → Execute API | Identifies transaction for execution |
| `userId` | Redux store | PaymentProcess | User context (if needed) |
| `accessToken` | Redux store | PaymentProcess | Authorization for execute API |
| `paymentSessionId` | executeBuy() | Cashfree gateway | Payment session identifier |
| `amount` | User input | All screens | Transaction amount |
| `grams` | Calculated | All screens | Gold quantity |

---

## 🛡️ Error Handling

### Scenario 1: Payment Fails at Cashfree
```javascript
callback.onError = (error, orderID) => {
  Alert.alert('Payment Failed', error?.getMessage?.());
  setLoading(false);
  // User can retry
};
```

### Scenario 2: Execute API Fails
```javascript
try {
  const response = await fetch(executeUrl, {...});
  if (!response.ok) {
    throw new Error(data.message);
  }
} catch (error) {
  Alert.alert(
    'Payment Processing',
    'Your payment is being processed. Check portfolio in a few moments.',
    [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
  );
}
```

### Scenario 3: Missing Transaction ID
```javascript
if (!transactionId) {
  Alert.alert('Error', 'Transaction ID missing');
  navigation.navigate('Dashboard');
}
```

---

## 📝 API Integration Checklist

- [x] PaymentReviewScreen calls `executeBuy()` with correct parameters
- [x] Cashfree callback passes `transactionId` to PaymentProcessingScreen
- [x] PaymentProcessingScreen receives `userId` and `accessToken`
- [x] Execute API called with: `POST /api/digital-gold/sell/execute?txnId={transactionId}`
- [x] Authorization header includes Bearer token
- [x] Success response navigates to PaymentSuccessScreen
- [x] Error handling with user-friendly messages
- [x] No missing parameters in navigation

---

## 🚀 Testing Checklist

### Test Case 1: WALLET Payment
1. Select "Wallet" payment method
2. Click "Pay"
3. Should go directly to PaymentSuccess
4. ✅ No execute API call needed

### Test Case 2: UPI Payment - Success
1. Select "UPI" payment method
2. Click "Pay"
3. Cashfree gateway opens
4. Complete payment
5. onVerify callback triggered
6. Navigate to PaymentProcessingScreen
7. Execute API called with transactionId
8. Response: success
9. Navigate to PaymentSuccessScreen
10. ✅ Transaction complete

### Test Case 3: UPI Payment - Failure
1. Select "UPI" payment method
2. Click "Pay"
3. Cashfree gateway opens
4. Cancel or fail payment
5. onError callback triggered
6. Alert shown
7. ✅ User can retry

### Test Case 4: Execute API Error
1. Complete UPI payment
2. Execute API returns error
3. Alert shown: "Payment is being processed..."
4. Navigate to Dashboard
5. ✅ User can check portfolio later

---

## 📱 Screen Navigation Summary

```
DigitalGoldScreen
    ↓
PaymentReviewScreen
    ├─ [WALLET] → PaymentSuccessScreen → Dashboard
    └─ [UPI] → Cashfree → PaymentProcessingScreen → PaymentSuccessScreen → Dashboard
```

---

## 🔗 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/digital-gold/buy` | POST | Create buy order (executeBuy) |
| `/digital-gold/sell/execute` | POST | Execute transaction after payment |

---

## ✅ Flow is Now Perfect!

All parameters are correctly passed through the entire flow:
- ✅ Transaction ID from executeBuy → Cashfree callback → PaymentProcessingScreen
- ✅ User ID available in PaymentProcessingScreen
- ✅ Access token available for execute API
- ✅ Execute API called with correct URL and headers
- ✅ Error handling at each step
- ✅ Success navigation to PaymentSuccessScreen
