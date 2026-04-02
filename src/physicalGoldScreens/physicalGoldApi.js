/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHYSICAL GOLD API SERVICE - PRODUCTION READY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ No manual token passing
 * ✅ Auto token injection via apiClient
 * ✅ Response normalization
 * ✅ Input validation
 * ✅ Comprehensive error handling
 * ✅ JSDoc documentation
 * 
 * Usage:
 * const categories = await getMainCategories();
 * const products = await getProducts(categoryId);
 * const orders = await getUserOrders(userId);
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete, extractData } from '../services/apiClient';
import { PHYSICAL_GOLD_BASE_URL, BASE_URL } from '../constants/api';

// ─────────────────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────

const validateId = (id, fieldName = 'ID') => {
  if (!id) throw new Error(`${fieldName} is required`);
  if (typeof id !== 'number' && typeof id !== 'string') {
    throw new Error(`${fieldName} must be a number or string`);
  }
};

const validateUserId = (userId) => {
  if (!userId) throw new Error('User ID is required');
};

const validatePagination = (page, limit) => {
  if (page && (typeof page !== 'number' || page < 1)) {
    throw new Error('Page must be a positive number');
  }
  if (limit && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
    throw new Error('Limit must be between 1 and 100');
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 1. CATEGORIES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get main product categories
 * @param {number} userId - User ID (required by backend)
 * @returns {Promise<Array>} List of main categories
 */
export const getMainCategories = async (userId) => {
  validateUserId(userId);
  try {
    const response = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/admin/categories/parents`, {
      params: { userId }
    });
    return extractData(response) || [];
  } catch (error) {
    console.error('[PhysicalGoldApi] getMainCategories failed:', error.message);
    throw error;
  }
};

/**
 * Get subcategories for a parent category
 * @param {number|string} parentId - Parent category ID
 * @returns {Promise<Array>} List of subcategories
 */
export const getSubCategories = async (parentId) => {
  validateId(parentId, 'Parent ID');

  try {
    const response = await apiGet(
      `${PHYSICAL_GOLD_BASE_URL}/admin/categories/${parentId}/subcategories`
    );
    return extractData(response) || [];
  } catch (error) {
    console.error('[PhysicalGoldApi] getSubCategories failed:', error.message);
    throw error;
  }
};

/**
 * Get category image
 * @param {number|string} categoryId - Category ID
 * @returns {Promise<string|null>} Image URL or null
 */
export const getCategoryImage = async (categoryId) => {
  validateId(categoryId, 'Category ID');

  try {
    const response = await apiGet(
      `${PHYSICAL_GOLD_BASE_URL}/admin/categories/getImageForProduct`,
      { params: { categoryId } }
    );

    const data = extractData(response);
    return data?.urls?.[0] || data?.url || null;
  } catch (error) {
    console.warn(`[PhysicalGoldApi] Category image not found for ID: ${categoryId}`);
    return null;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 2. PRODUCTS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get products for a subcategory with pagination
 * @param {number|string} subCategoryId - Subcategory ID
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export const getProducts = async (subCategoryId, page = 1, limit = 20) => {
  validateId(subCategoryId, 'Subcategory ID');
  validatePagination(page, limit);

  try {
    // ✅ CORRECT: Use /api/products/getAllProduct with categoryId query param
    const response = await apiGet(`${PHYSICAL_GOLD_BASE_URL.replace('/admin', '')}/api/products/getAllProduct`, {
      params: {
        categoryId: subCategoryId,
        page,
        limit,
      },
    });

    const data = extractData(response);

    return {
      items: Array.isArray(data) ? data : data?.items || [],
      total: data?.total || data?.length || 0,
      page,
      limit,
    };
  } catch (error) {
    console.error('[PhysicalGoldApi] getProducts failed:', error.message);
    throw error;
  }
};

/**
 * Get product details
 * @param {number|string} productId - Product ID
 * @returns {Promise<Object>} Product details
 */
export const getProductDetails = async (productId) => {
  validateId(productId, 'Product ID');

  try {
    const response = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/products/${productId}`);
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] getProductDetails failed:', error.message);
    throw error;
  }
};

/**
 * Get product image
 * @param {number|string} productId - Product ID
 * @returns {Promise<string|null>} Image URL or null
 */
export const getProductImage = async (productId) => {
  validateId(productId, 'Product ID');

  try {
    const response = await apiGet(
      `${PHYSICAL_GOLD_BASE_URL}/admin/categories/getImageForProduct`,
      { params: { productId } }
    );

    const data = extractData(response);
    return data?.urls?.[0] || data?.url || null;
  } catch (error) {
    console.warn(`[PhysicalGoldApi] Product image not found for ID: ${productId}`);
    return null;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 3. PRODUCT VARIANTS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get product variants
 * @param {number|string} productId - Product ID
 * @returns {Promise<Array>} List of variants
 */
export const getProductVariants = async (productId) => {
  validateId(productId, 'Product ID');

  try {
    // ✅ CORRECT: Use /api/productvariants/getVariantByProduct with query param
    const response = await apiGet(
      `${PHYSICAL_GOLD_BASE_URL.replace('/admin', '')}/api/productvariants/getVariantByProduct`,
      { params: { productId } }
    );
    return extractData(response) || [];
  } catch (error) {
    console.error('[PhysicalGoldApi] getProductVariants failed:', error.message);
    throw error;
  }
};

/**
 * Get variant image
 * @param {number|string} variantId - Variant ID
 * @returns {Promise<string|null>} Image URL or null
 */
export const getVariantImage = async (variantId) => {
  validateId(variantId, 'Variant ID');

  try {
    const response = await apiGet(
      `${PHYSICAL_GOLD_BASE_URL}/admin/categories/getImageForProduct`,
      { params: { variantId } }
    );

    const data = extractData(response);
    return data?.urls?.[0] || data?.url || null;
  } catch (error) {
    console.warn(`[PhysicalGoldApi] Variant image not found for ID: ${variantId}`);
    return null;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 4. CART
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get user cart
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Cart data with items
 */
export const getCart = async (userId) => {
  validateUserId(userId);

  try {
    // GET /api/cart/customer-cart-info?customerId={userId}
    const response = await apiGet(`${BASE_URL}/cart/customer-cart-info`, {
      params: { customerId: userId },
    });
    const data = extractData(response);
    return {
      itemsInCart: data?.itemsInCart || [],
      totalCartValue: data?.totalCartValue || 0,
      totalGstCharges: data?.totalGstCharges || 0,
      totalPayableAmount: data?.totalPayableAmount || 0,
      totalItemsInCart: data?.totalItemsInCart || 0,
      totalCartItemWeight: data?.totalCartItemWeight || 0,
    };
  } catch (error) {
    if (error.status === 404) {
      console.log('[PhysicalGoldApi] Cart not found (404), returning empty cart');
      return { itemsInCart: [], totalCartValue: 0, totalGstCharges: 0, totalPayableAmount: 0, totalItemsInCart: 0 };
    }
    console.error('[PhysicalGoldApi] getCart failed:', error.message);
    throw error;
  }
};

/**
 * Add item to cart
 * @param {number} userId - User ID
 * @param {number|string} productId - Product ID
 * @param {number|string} productVariantId - Variant ID
 * @param {number} quantity - Quantity (default: 1)
 * @returns {Promise<Object>} Updated cart item
 */
export const addToCart = async (userId, productId, productVariantId, quantity = 1) => {
  validateUserId(userId);
  validateId(productId, 'Product ID');
  validateId(productVariantId, 'Variant ID');

  if (!quantity || quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  try {
    // POST /api/cart/AddItemToCart
    const response = await apiPost(`${BASE_URL}/cart/AddItemToCart`, {
      userId,
      productId,
      productVariantId,
      quantity,
    });
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] addToCart failed:', error.message);
    throw error;
  }
};

/**
 * Increment cart item quantity
 * @param {number} userId - User ID
 * @param {number|string} productVariantId - Variant ID
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Promise<Object>} Updated cart item
 */
export const incrementCartItem = async (userId, productVariantId, quantity = 1) => {
  validateUserId(userId);
  validateId(productVariantId, 'Variant ID');

  if (!quantity || quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  try {
    // POST /api/cart/AddItemToCart (increments if exists)
    const response = await apiPost(`${BASE_URL}/cart/AddItemToCart`, {
      userId,
      productVariantId,
      quantity,
    });
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] incrementCartItem failed:', error.message);
    throw error;
  }
};

/**
 * Decrement cart item quantity
 * @param {number} userId - User ID
 * @param {number|string} productVariantId - Variant ID
 * @param {number} quantity - Quantity to remove (default: 1)
 * @returns {Promise<Object>} Updated cart item
 */
export const decrementCartItem = async (userId, productVariantId, quantity = 1) => {
  validateUserId(userId);
  validateId(productVariantId, 'Variant ID');

  if (!quantity || quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  try {
    // POST /api/cart/decrementCartItems
    const response = await apiPost(`${BASE_URL}/cart/decrementCartItems`, {
      userId,
      productVariantId,
      quantity,
    });
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] decrementCartItem failed:', error.message);
    throw error;
  }
};

/**
 * Remove item from cart
 * @param {number|string} cartId - Cart item ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { status, message }
 */
export const removeFromCart = async (cartId, userId) => {
  validateId(cartId, 'Cart ID');
  validateUserId(userId);

  try {
    // ✅ CORRECT: DELETE /api/cart/{cartId}?userId={userId}
    const response = await apiDelete(`${BASE_URL}/cart/${cartId}`, {
      params: { userId },
    });
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] removeFromCart failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 5. ORDERS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Place order for physical gold
 * @param {number} userId - User ID
 * @param {Object} orderData - Order data { productId, variantId, quantity, address, etc. }
 * @returns {Promise<Object>} { orderId, status, totalAmount }
 */
export const placeOrder = async (userId, orderData) => {
  validateUserId(userId);
  if (!orderData || typeof orderData !== 'object') {
    throw new Error('Order data is required');
  }

  try {
    const response = await apiPost(`${PHYSICAL_GOLD_BASE_URL}/order/create`, {
      userId,
      ...orderData,
    });

    const data = extractData(response);

    return {
      orderId: data?.orderId || data?.id,
      status: data?.status || 'pending',
      totalAmount: data?.totalAmount || data?.total || 0,
      timestamp: data?.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[PhysicalGoldApi] placeOrder failed:', error.message);
    throw error;
  }
};

/**
 * Get user orders
 * @param {number} userId - User ID
 * @returns {Promise<Array>} List of orders
 */
export const getUserOrders = async (userId) => {
  validateUserId(userId);

  try {
    // ✅ CORRECT: GET /api/order/user/{userId}
    const response = await apiGet(`${BASE_URL}/order/user/${userId}`);
    const data = extractData(response);
    return Array.isArray(data) ? data : data?.items || [];
  } catch (error) {
    if (error.status === 404) {
      console.log('[PhysicalGoldApi] No orders found');
      return [];
    }
    console.error('[PhysicalGoldApi] getUserOrders failed:', error.message);
    throw error;
  }
};

/**
 * Get order details
 * @param {number|string} orderId - Order ID
 * @returns {Promise<Object>} Order details
 */
export const getOrderDetails = async (orderId) => {
  validateId(orderId, 'Order ID');

  try {
    const response = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/order/${orderId}`);
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] getOrderDetails failed:', error.message);
    throw error;
  }
};

/**
 * Cancel order
 * @param {number|string} orderId - Order ID
 * @returns {Promise<Object>} { status, message }
 */
export const cancelOrder = async (orderId) => {
  validateId(orderId, 'Order ID');

  try {
    const response = await apiPost(`${PHYSICAL_GOLD_BASE_URL}/order/${orderId}/cancel`, {});
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] cancelOrder failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 6. CHECKOUT & PAYMENT
// ═════════════════════════════════════════════════════════════════════════

/**
 * Create order
 * @param {Object} orderData - Order data { customerId, items, addressId, paymentMode, totalAmount }
 * @returns {Promise<Object>} Created order
 */
export const createOrder = async (orderData) => {
  if (!orderData?.customerId) {
    throw new Error('Customer ID is required');
  }
  if (!orderData?.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw new Error('Order items are required');
  }
  if (!orderData?.addressId) {
    throw new Error('Address ID is required');
  }
  if (!orderData?.paymentMode) {
    throw new Error('Payment mode is required');
  }

  try {
    // ✅ CORRECT: POST /api/order/createOrder
    const response = await apiPost(`${BASE_URL}/order/createOrder`, orderData);
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] createOrder failed:', error.message);
    throw error;
  }
};

/**
 * Confirm order
 * @param {number|string} orderId - Order ID
 * @param {Object} paymentData - Payment data (optional)
 * @returns {Promise<Object>} Confirmed order
 */
export const confirmOrder = async (orderId, paymentData = {}) => {
  validateId(orderId, 'Order ID');

  try {
    // ✅ CORRECT: POST /api/order/{orderId}/confirmOrders
    const response = await apiPost(`${BASE_URL}/order/${orderId}/confirmOrders`, paymentData);
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] confirmOrder failed:', error.message);
    throw error;
  }
};

/**
 * Verify payment
 * @param {number|string} orderId - Order ID
 * @param {string} txnId - Transaction ID
 * @returns {Promise<Object>} Payment verification result
 */
export const verifyPayment = async (orderId, txnId) => {
  validateId(orderId, 'Order ID');
  if (!txnId) throw new Error('Transaction ID is required');

  try {
    // ✅ CORRECT: POST /api/digital-gold/payments/webhook?order_id={txnId}
    const response = await apiPost(
      `${BASE_URL}/digital-gold/payments/webhook`,
      { orderId },
      { params: { order_id: txnId } }
    );
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] verifyPayment failed:', error.message);
    throw error;
  }
};

/**
 * Generate invoice
 * @param {number|string} orderId - Order ID
 * @returns {Promise<Object>} Invoice data
 */
export const generateInvoice = async (orderId) => {
  validateId(orderId, 'Order ID');

  try {
    // ✅ CORRECT: POST /api/invoices/generate-from-order/{orderId}
    const response = await apiPost(`${BASE_URL}/invoices/generate-from-order/${orderId}`, {});
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] generateInvoice failed:', error.message);
    throw error;
  }
};

/**
 * Preview invoice PDF - Returns URL with token as query param
 * For React Native: Use Linking.openURL(url)
 * Token passed as query param because Linking.openURL() can't send custom headers
 * @param {string} orderNumber - Order number
 * @param {string} accessToken - Access token for authentication
 * @returns {string} Invoice preview URL with token
 */
export const previewInvoice = (orderNumber, accessToken) => {
  if (!orderNumber) throw new Error('Order number is required');
  if (!accessToken) throw new Error('Access token is required');
  
  return `${BASE_URL}/invoices/${orderNumber}/pdf/preview?token=${encodeURIComponent(accessToken)}`;
};

/**
 * Download invoice PDF - Returns URL with token as query param
 * For React Native: Use Linking.openURL(url)
 * Token passed as query param because Linking.openURL() can't send custom headers
 * @param {string} orderNumber - Order number
 * @param {string} accessToken - Access token for authentication
 * @returns {string} Invoice download URL with token
 */
export const downloadInvoice = (orderNumber, accessToken) => {
  if (!orderNumber) throw new Error('Order number is required');
  if (!accessToken) throw new Error('Access token is required');
  
  return `${BASE_URL}/invoices/${orderNumber}/pdf?token=${encodeURIComponent(accessToken)}`;
};

// ═════════════════════════════════════════════════════════════════════════
// 7. PROFILE
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get user profile
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User profile data
 */
export const getUserProfile = async (userId) => {
  validateUserId(userId);

  try {
    // ✅ CORRECT: Use query parameter format ?userId={userId}
    const response = await apiGet(`${BASE_URL}/auth/getUserBasedOnUserId`, {
      params: { userId },
    });
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] getUserProfile failed:', error.message);
    throw error;
  }
};

/**
 * Save user profile
 * @param {Object} profileData - Profile data with userId, email, firstName, lastName, etc.
 * @returns {Promise<Object>} Updated profile
 */
export const saveUserProfile = async (profileData) => {
  if (!profileData?.userId) {
    throw new Error('User ID is required in profile data');
  }

  try {
    // ✅ CORRECT: POST to /api/auth/saveUserProfile with full payload
    const response = await apiPost(`${BASE_URL}/auth/saveUserProfile`, profileData);
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] saveUserProfile failed:', error.message);
    throw error;
  }
};

/**
 * Logout user
 * @returns {Promise<Object>} Logout response
 */
export const logout = async () => {
  try {
    // ✅ CORRECT: POST to /api/auth/logout
    const response = await apiPost(`${BASE_URL}/auth/logout`, {});
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] logout failed:', error.message);
    throw error;
  }
};

/**
 * Get user addresses
 * @param {number} userId - User ID
 * @returns {Promise<Array>} List of addresses
 */
export const getUserAddresses = async (userId) => {
  validateUserId(userId);

  try {
    // ✅ CORRECT: GET /api/auth/addresses/{userId}
    const response = await apiGet(`${BASE_URL}/auth/addresses/${userId}`);
    return extractData(response) || [];
  } catch (error) {
    console.error('[PhysicalGoldApi] getUserAddresses failed:', error.message);
    throw error;
  }
};

/**
 * Add new address
 * @param {Object} addressData - Address data (userId, flatNo, address, state, pinCode, landMark, latitude, longitude)
 * @returns {Promise<Object>} Created address
 */
export const addAddress = async (addressData) => {
  if (!addressData?.userId) {
    throw new Error('User ID is required');
  }

  try {
    // ✅ CORRECT: PATCH /api/auth/addAddress (for new addresses)
    const response = await apiPatch(`${BASE_URL}/auth/addAddress`, addressData);
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] addAddress failed:', error.message);
    throw error;
  }
};

/**
 * Update existing address
 * @param {Object} addressData - Address data (must include id and userId)
 * @returns {Promise<Object>} Updated address
 */
export const updateAddress = async (addressData) => {
  if (!addressData?.userId || !addressData?.id) {
    throw new Error('User ID and Address ID are required');
  }

  try {
    // ✅ CORRECT: PUT /api/auth/addAddress (for updates)
    const response = await apiPut(`${BASE_URL}/auth/addAddress`, addressData);
    return extractData(response);
  } catch (error) {
    console.error('[PhysicalGoldApi] updateAddress failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 8. WALLET
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get wallet balance
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Wallet data with balance
 */
export const getWalletBalance = async (userId) => {
  validateUserId(userId);

  try {
    const url = `${BASE_URL}/wallet/getWallet/${userId}`;
    console.log('[PhysicalGoldApi] getWalletBalance URL:', url);
    console.log('[PhysicalGoldApi] getWalletBalance userId:', userId);
    
    // ✅ CORRECT: Use BASE_URL (already has /api) + path parameter
    const response = await apiGet(url);
    console.log('[PhysicalGoldApi] getWalletBalance response:', response);
    return extractData(response);
  } catch (error) {
    // 404 = wallet not created yet, return 0 balance instead of crashing
    if (error.status === 404) {
      console.log('[PhysicalGoldApi] Wallet not found (404), returning 0 balance');
      return { balance: 0 };
    }
    console.error('[PhysicalGoldApi] getWalletBalance failed:', error.message);
    console.error('[PhysicalGoldApi] getWalletBalance error details:', error);
    throw error;
  }
};

/**
 * Get wallet transactions with pagination
 * @param {number} userId - User ID
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export const getWalletTransactions = async (userId, page = 1, limit = 20) => {
  validateUserId(userId);
  validatePagination(page, limit);

  try {
    // ✅ CORRECT: Use BASE_URL (already has /api) + path parameter
    const response = await apiGet(`${BASE_URL}/wallet/${userId}/transactions`, {
      params: { page, limit },
    });
    const data = extractData(response);

    return {
      items: Array.isArray(data) ? data : data?.items || [],
      total: data?.total || data?.length || 0,
      page,
      limit,
    };
  } catch (error) {
    console.error('[PhysicalGoldApi] getWalletTransactions failed:', error.message);
    throw error;
  }
};
