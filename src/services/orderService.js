/**
 * Order Service - Handles all order-related API operations
 * Production-ready with comprehensive error handling and security
 */

const API_BASE = 'http://65.0.147.157:9900';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Fetch with timeout to prevent app freezing
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Response>}
 */
const fetchWithTimeout = (url, options, timeout = REQUEST_TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeout)
    ),
  ]);
};

/**
 * Safe JSON parsing
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>}
 */
const safeJsonParse = async (response) => {
  try {
    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (error) {
    console.error('[OrderService] JSON parse error:', error.message);
    return {};
  }
};

/**
 * Clean corrupted session ID by removing trailing 'payment' strings
 * @param {string} sessionId - Raw session ID from API
 * @returns {string} Cleaned session ID
 */
const cleanSessionId = (sessionId) => {
  if (!sessionId) return '';
  
  let cleaned = sessionId.trim();
  while (cleaned.match(/payment$/i)) {
    cleaned = cleaned.replace(/payment$/i, '').trim();
  }
  
  console.log('[OrderService] Session ID cleaned');
  return cleaned;
};

/**
 * Validate session ID format
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean}
 */
const isValidSessionId = (sessionId) => {
  if (!sessionId) return false;
  return sessionId.startsWith('session_') && sessionId.length > 20;
};

export const orderService = {
  /**
   * Validate user profile before checkout
   * @param {number} userId - User ID
   * @param {string} accessToken - Auth token
   * @returns {Promise<Object>} User profile data
   */
  validateProfile: async (userId, accessToken) => {
    try {
      console.log('[OrderService] Validating profile');

      if (!accessToken) {
        throw new Error('AUTH_TOKEN_MISSING');
      }

      if (!userId) {
        throw new Error('USER_ID_MISSING');
      }

      const response = await fetchWithTimeout(
        `${API_BASE}/api/auth/getUserBasedOnUserId?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to validate profile');
      }

      const userProfile = data?.data?.body || data?.data;
      
      if (!userProfile?.firstName) {
        throw new Error('INCOMPLETE_PROFILE');
      }

      console.log('[OrderService] Profile validated successfully');
      return userProfile;
    } catch (error) {
      console.error('[OrderService] Profile validation error:', error.message);
      throw error;
    }
  },

  /**
   * Fetch user addresses
   * @param {number} userId - User ID
   * @param {string} accessToken - Auth token
   * @returns {Promise<Array>} List of addresses
   */
  fetchAddresses: async (userId, accessToken) => {
    try {
      console.log('[OrderService] Fetching addresses');

      if (!accessToken) {
        throw new Error('AUTH_TOKEN_MISSING');
      }

      if (!userId) {
        throw new Error('USER_ID_MISSING');
      }

      const response = await fetchWithTimeout(
        `${API_BASE}/api/auth/addresses/${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to fetch addresses');
      }

      const addresses = Array.isArray(data?.data) 
        ? data.data 
        : Array.isArray(data) 
          ? data 
          : [];

      if (addresses.length === 0) {
        throw new Error('NO_ADDRESSES');
      }

      console.log('[OrderService] Addresses fetched:', addresses.length);
      return addresses;
    } catch (error) {
      console.error('[OrderService] Fetch addresses error:', error.message);
      throw error;
    }
  },

  /**
   * Create order
   * @param {Object} payload - Order creation payload
   * @param {string} accessToken - Auth token
   * @returns {Promise<Object>} Order data with paymentSessionId
   */
  createOrder: async (payload, accessToken) => {
    try {
      console.log('[OrderService] Creating order');

      if (!accessToken) {
        throw new Error('AUTH_TOKEN_MISSING');
      }

      if (!payload?.userId) {
        throw new Error('USER_ID_MISSING');
      }

      const response = await fetchWithTimeout(
        `${API_BASE}/api/order/createOrder`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to create order');
      }

      const orderData = data?.data;

      // Handle both 'id' and 'orderId' field names
      const orderId = orderData?.id || orderData?.orderId;

      if (!orderId) {
        throw new Error('Invalid order response - missing order ID');
      }

      // Clean and validate session ID
      let cleanedSessionId = (orderData.paymentSessionId);

       

      // If session ID is invalid, try to initialize payment session
      if (!isValidSessionId(cleanedSessionId)) {
        console.log('[OrderService] Session ID invalid, attempting to initialize payment session');
        try {
          const sessionData = await orderService.initializePaymentSession(
            orderId,
            orderData.totalAmount,
            accessToken
          );
          cleanedSessionId = sessionData.paymentSessionId;
          console.log('[OrderService] Payment session initialized successfully');
        } catch (sessionError) {
          console.warn('[OrderService] Payment session initialization failed:', sessionError.message);
          // Continue with original session ID - it might still work
        }
      }

      if (!isValidSessionId(cleanedSessionId)) {
        throw new Error('INVALID_SESSION_ID - Could not obtain valid payment session');
      }

      console.log('[OrderService] Order created successfully');

      return {
        orderId,
        orderNumber: orderData.orderNumber,
        txnId: orderData.txnId,
        paymentSessionId: cleanedSessionId,
        totalAmount: orderData.totalAmount,
      };
    } catch (error) {
      console.error('[OrderService] Create order error:', error.message);
      throw error;
    }
  },

  /**
   * Initialize payment session for an order
   * Attempts multiple endpoints to get a valid Cashfree session
   * @param {number} orderId - Order ID
   * @param {number} amount - Order amount
   * @param {string} accessToken - Auth token
   * @returns {Promise<Object>} Payment session data
   */
  initializePaymentSession: async (orderId, amount, accessToken) => {
    try {
      console.log('[OrderService] Initializing payment session for order:', orderId);

      if (!accessToken) {
        throw new Error('AUTH_TOKEN_MISSING');
      }

      // Try endpoint 1: /api/order/{orderId}/payment-session
      try {
        const response1 = await fetchWithTimeout(
          `${API_BASE}/api/order/${orderId}/payment-session`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }),
          }
        );

        const data1 = await safeJsonParse(response1);

        if (response1.ok && data1?.data?.paymentSessionId) {
          const sessionId = cleanSessionId(data1.data.paymentSessionId);
          if (isValidSessionId(sessionId)) {
            console.log('[OrderService] Payment session obtained from endpoint 1');
            return { paymentSessionId: sessionId };
          }
        }
      } catch (e) {
        console.log('[OrderService] Endpoint 1 failed:', e.message);
      }

      // Try endpoint 2: /api/order/{orderId}/initiate-payment
      try {
        const response2 = await fetchWithTimeout(
          `${API_BASE}/api/order/${orderId}/initiate-payment`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }),
          }
        );

        const data2 = await safeJsonParse(response2);

        if (response2.ok && data2?.data?.paymentSessionId) {
          const sessionId = cleanSessionId(data2.data.paymentSessionId);
          if (isValidSessionId(sessionId)) {
            console.log('[OrderService] Payment session obtained from endpoint 2');
            return { paymentSessionId: sessionId };
          }
        }
      } catch (e) {
        console.log('[OrderService] Endpoint 2 failed:', e.message);
      }

      throw new Error('Could not initialize payment session from any endpoint');
    } catch (error) {
      console.error('[OrderService] Initialize payment session error:', error.message);
      throw error;
    }
  },

  /**
   * Confirm order
   * @param {number} orderId - Order ID
   * @param {string} accessToken - Auth token
   * @returns {Promise<Object>} Confirmation response
   */
  confirmOrder: async (orderId, accessToken) => {
    try {
      console.log('[OrderService] Confirming order');

      if (!accessToken) {
        throw new Error('AUTH_TOKEN_MISSING');
      }

      if (!orderId) {
        throw new Error('ORDER_ID_MISSING');
      }

      const response = await fetchWithTimeout(
        `${API_BASE}/api/order/${orderId}/confirmOrders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to confirm order');
      }

      console.log('[OrderService] Order confirmed successfully');
      return data || { success: true };
    } catch (error) {
      console.error('[OrderService] Confirm order error:', error.message);
      throw error;
    }
  },
};

export default orderService;
