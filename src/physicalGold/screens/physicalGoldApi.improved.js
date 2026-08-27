/**
 * Physical Gold API Service
 * 
 * Handles all API calls for Physical Gold module:
 * - Categories & Products
 * - Orders & Invoices
 * - User Profile & Wallet
 * 
 * Note: accessToken is automatically injected by apiClient from Redux
 */

import { apiGet, apiPost } from '../../services/apiClient';
import { BASE_URL } from '../../constants/api';

// ─── Response Data Extractor ──────────────────────────────────────────────
/**
 * Safely extracts nested data from response objects
 * Handles multiple response format variations
 * 
 * @param {object} response - API response object
 * @param {string} path - Dot-notation path (e.g., 'data.urls.0')
 * @returns {any} Extracted value or null
 * 
 * @example
 * extractData(response, 'data') // Gets response.data
 * extractData(response, 'data.urls.0') // Gets response.data.urls[0]
 */
const extractData = (response, path = 'data') => {
  if (!response) return null;
  
  const keys = path.split('.');
  let value = response;
  
  for (const key of keys) {
    // Handle array indices
    if (!isNaN(key)) {
      value = value?.[parseInt(key)];
    } else {
      value = value?.[key];
    }
    
    if (value === undefined) return null;
  }
  
  return value;
};

// ─── HOME SCREEN APIs ─────────────────────────────────────────────────────

/**
 * Fetch main product categories (Gold, Silver, Diamond)
 * 
 * @returns {Promise<Array>} Array of category objects
 * @throws {Error} If API call fails
 * 
 * @example
 * const categories = await getMainCategories();
 * // Returns: [{ id: 1, name: 'Gold', ... }, ...]
 */
export const getMainCategories = async () => {
  try {
    const response = await apiGet(`${BASE_URL}/admin/categories/parents`);
    return extractData(response, 'data') || [];
  } catch (error) {
    console.error('[getMainCategories] Error:', error.message);
    throw error;
  }
};

/**
 * Fetch subcategories for a parent category
 * 
 * @param {string|number} parentId - Parent category ID
 * @returns {Promise<Array>} Array of subcategory objects
 * @throws {Error} If parentId is missing or API call fails
 * 
 * @example
 * const subCategories = await getSubCategories('gold-id');
 * // Returns: [{ id: 1, name: 'Coins', ... }, ...]
 */
export const getSubCategories = async (parentId) => {
  if (!parentId) throw new Error('Parent ID is required');
  
  try {
    const response = await apiGet(
      `${BASE_URL}/admin/categories/${parentId}/subcategories`
    );
    return extractData(response, 'data') || [];
  } catch (error) {
    console.error('[getSubCategories] Error:', error.message);
    throw error;
  }
};

/**
 * Fetch products for a subcategory
 * 
 * @param {string|number} subCategoryId - Subcategory ID
 * @returns {Promise<Array>} Array of product objects
 * @throws {Error} If subCategoryId is missing or API call fails
 * 
 * @example
 * const products = await getProducts('coins-id');
 * // Returns: [{ id: 1, name: 'Gold Coin', price: 5000, ... }, ...]
 */
export const getProducts = async (subCategoryId) => {
  if (!subCategoryId) throw new Error('Subcategory ID is required');
  
  try {
    const response = await apiGet(`${BASE_URL}/products/getAllProduct`, {
      params: { subCategoryId },
    });
    return extractData(response, 'data') || [];
  } catch (error) {
    console.error('[getProducts] Error:', error.message);
    throw error;
  }
};

/**
 * Fetch category image
 * 
 * @param {string|number} categoryId - Category ID
 * @returns {Promise<string|null>} Image URL or null if not found
 * 
 * @example
 * const imageUrl = await getCategoryImage('gold-id');
 * // Returns: 'https://example.com/gold.jpg' or null
 */
export const getCategoryImage = async (categoryId) => {
  if (!categoryId) return null;
  
  try {
    const response = await apiGet(`${BASE_URL}/admin/categories/getImageForProduct`, {
      params: { categoryId },
    });
    
    // Handle multiple response formats
    const urls = extractData(response, 'data.urls') || 
                 extractData(response, 'urls') || [];
    
    return Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
  } catch (error) {
    console.warn(`[getCategoryImage] Image not found for ID: ${categoryId}`);
    return null;
  }
};

/**
 * Fetch product image
 * 
 * @param {string|number} productId - Product ID
 * @returns {Promise<string|null>} Image URL or null if not found
 * 
 * @example
 * const imageUrl = await getProductImage('product-123');
 * // Returns: 'https://example.com/product.jpg' or null
 */
export const getProductImage = async (productId) => {
  if (!productId) return null;
  
  try {
    const response = await apiGet(`${BASE_URL}/admin/categories/getImageForProduct`, {
      params: { productId },
    });
    
    const urls = extractData(response, 'data.urls') || 
                 extractData(response, 'urls') || [];
    
    return Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
  } catch (error) {
    console.warn(`[getProductImage] Image not found for ID: ${productId}`);
    return null;
  }
};

// ─── ORDERS SCREEN APIs ───────────────────────────────────────────────────

/**
 * Fetch all orders for a user
 * 
 * @param {string|number} userId - User ID
 * @returns {Promise<Array>} Array of order objects
 * @throws {Error} If userId is missing
 * 
 * @example
 * const orders = await getUserOrders('user-123');
 * // Returns: [{ id: 1, status: 'COMPLETED', amount: 5000, ... }, ...]
 */
export const getUserOrders = async (userId) => {
  if (!userId) throw new Error('User ID is required');
  
  try {
    const response = await apiGet(`${BASE_URL}/order/user/${userId}`);
    return extractData(response, 'data') || [];
  } catch (error) {
    if (error.status === 404) {
      console.log('[getUserOrders] No orders found');
      return [];
    }
    console.error('[getUserOrders] Error:', error.message);
    throw error;
  }
};

/**
 * Fetch details for a specific order
 * 
 * @param {string|number} orderId - Order ID
 * @returns {Promise<object>} Order details object
 * @throws {Error} If orderId is missing or API call fails
 * 
 * @example
 * const order = await getOrderDetails('order-123');
 * // Returns: { id: 123, items: [...], total: 5000, ... }
 */
export const getOrderDetails = async (orderId) => {
  if (!orderId) throw new Error('Order ID is required');
  
  try {
    const response = await apiGet(`${BASE_URL}/order/${orderId}`);
    return extractData(response, 'data') || response;
  } catch (error) {
    console.error('[getOrderDetails] Error:', error.message);
    throw error;
  }
};

/**
 * Generate invoice for an order
 * 
 * @param {string|number} orderId - Order ID
 * @returns {Promise<object>} Invoice data
 * @throws {Error} If orderId is missing or API call fails
 * 
 * @example
 * const invoice = await generateInvoice('order-123');
 * // Returns: { invoiceId: 'INV-001', pdfUrl: '...', ... }
 */
export const generateInvoice = async (orderId) => {
  if (!orderId) throw new Error('Order ID is required');
  
  try {
    const response = await apiPost(
      `${BASE_URL}/invoices/generate-from-order/${orderId}`,
      {}
    );
    return response;
  } catch (error) {
    console.error('[generateInvoice] Error:', error.message);
    throw error;
  }
};

/**
 * Get PDF URL for invoice
 * 
 * @param {string|number} orderNumber - Order number
 * @returns {Promise<string|null>} PDF URL or null
 * @throws {Error} If orderNumber is missing
 * 
 * @example
 * const pdfUrl = await getInvoicePdfUrl('ORD-001');
 * // Returns: 'https://example.com/invoices/ORD-001.pdf'
 */
export const getInvoicePdfUrl = async (orderNumber) => {
  if (!orderNumber) throw new Error('Order number is required');
  
  try {
    const response = await apiGet(`${BASE_URL}/invoices/${orderNumber}/pdf`);
    return extractData(response, 'data.pdfUrl') || 
           extractData(response, 'pdfUrl') || null;
  } catch (error) {
    console.error('[getInvoicePdfUrl] Error:', error.message);
    throw error;
  }
};

/**
 * Get preview URL for invoice
 * 
 * @param {string|number} orderNumber - Order number
 * @returns {Promise<string|null>} Preview URL or null
 * @throws {Error} If orderNumber is missing
 * 
 * @example
 * const previewUrl = await getInvoicePreviewUrl('ORD-001');
 * // Returns: 'https://example.com/invoices/ORD-001/preview'
 */
export const getInvoicePreviewUrl = async (orderNumber) => {
  if (!orderNumber) throw new Error('Order number is required');
  
  try {
    const response = await apiGet(
      `${BASE_URL}/invoices/${orderNumber}/pdf/preview`
    );
    return extractData(response, 'data.previewUrl') || 
           extractData(response, 'previewUrl') || null;
  } catch (error) {
    console.error('[getInvoicePreviewUrl] Error:', error.message);
    throw error;
  }
};

// ─── PRODUCT DETAILS SCREEN APIs ──────────────────────────────────────────

/**
 * Fetch all variants for a product (weight, purity, size options)
 * 
 * @param {string|number} productId - Product ID
 * @returns {Promise<Array>} Array of variant objects
 * @throws {Error} If productId is missing or API call fails
 * 
 * @example
 * const variants = await getProductVariants('product-123');
 * // Returns: [{ id: 1, weight: 1, purity: '999.9', price: 5000, ... }, ...]
 */
export const getProductVariants = async (productId) => {
  if (!productId) throw new Error('Product ID is required');
  
  try {
    const response = await apiGet(
      `${BASE_URL}/productvariants/getVariantByProduct`,
      { params: { productId } }
    );
    return extractData(response, 'data') || response;
  } catch (error) {
    console.error('[getProductVariants] Error:', error.message);
    throw error;
  }
};

/**
 * Fetch all images for a product
 * 
 * @param {string|number} productId - Product ID
 * @returns {Promise<Array>} Array of image URLs
 * 
 * @example
 * const images = await getProductImages('product-123');
 * // Returns: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
 */
export const getProductImages = async (productId) => {
  if (!productId) return [];
  
  try {
    const response = await apiGet(`${BASE_URL}/admin/categories/getImageForProduct`, {
      params: { productId },
    });
    
    const urls = extractData(response, 'data.urls') || 
                 extractData(response, 'urls') || [];
    
    return Array.isArray(urls) ? urls.filter(Boolean) : [];
  } catch (error) {
    console.warn(`[getProductImages] Images not found for ID: ${productId}`);
    return [];
  }
};

/**
 * Fetch image for a specific variant
 * 
 * @param {string|number} variantId - Variant ID
 * @returns {Promise<string|null>} Image URL or null
 * 
 * @example
 * const imageUrl = await getVariantImage('variant-123');
 * // Returns: 'https://example.com/variant.jpg' or null
 */
export const getVariantImage = async (variantId) => {
  if (!variantId) return null;
  
  try {
    const response = await apiGet(
      `${BASE_URL}/admin/categories/getImageForProduct`,
      { params: { variantId } }
    );
    
    const urls = extractData(response, 'data.urls') || 
                 extractData(response, 'urls') || [];
    
    return Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
  } catch (error) {
    console.warn(`[getVariantImage] Image not found for ID: ${variantId}`);
    return null;
  }
};

// ─── PROFILE SCREEN APIs ──────────────────────────────────────────────────

/**
 * Fetch user profile information
 * 
 * @param {string|number} userId - User ID
 * @returns {Promise<object>} User profile object
 * @throws {Error} If userId is missing or API call fails
 * 
 * @example
 * const profile = await getUserProfile('user-123');
 * // Returns: { id: 123, name: 'John', email: 'john@example.com', ... }
 */
export const getUserProfile = async (userId) => {
  if (!userId) throw new Error('User ID is required');
  
  try {
    const response = await apiGet(`${BASE_URL}/auth/getUserBasedOnUserId`, {
      params: { userId },
    });
    return extractData(response, 'data') || response;
  } catch (error) {
    console.error('[getUserProfile] Error:', error.message);
    throw error;
  }
};

/**
 * Save/update user profile information
 * 
 * @param {object} profileData - Profile data with userId
 * @returns {Promise<object>} Updated profile object
 * @throws {Error} If userId is missing or API call fails
 * 
 * @example
 * const updated = await saveUserProfile({
 *   userId: 'user-123',
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 */
export const saveUserProfile = async (profileData) => {
  if (!profileData?.userId) throw new Error('User ID is required');
  
  try {
    const response = await apiPost(`${BASE_URL}/auth/saveUserProfile`, {
      userId: Number(profileData.userId),
      ...profileData,
    });
    return response;
  } catch (error) {
    console.error('[saveUserProfile] Error:', error.message);
    throw error;
  }
};

/**
 * Fetch wallet balance for a user
 * 
 * @param {string|number} userId - User ID
 * @returns {Promise<object>} Wallet balance object
 * @throws {Error} If userId is missing or API call fails
 * 
 * @example
 * const wallet = await getWalletBalance('user-123');
 * // Returns: { balance: 50000, currency: 'INR', ... }
 */
export const getWalletBalance = async (userId) => {
  if (!userId) throw new Error('User ID is required');
  
  try {
    const response = await apiGet(`${BASE_URL}/wallet/getWallet/${userId}`);
    return extractData(response, 'data') || response;
  } catch (error) {
    console.error('[getWalletBalance] Error:', error.message);
    throw error;
  }
};

/**
 * Fetch wallet transaction history
 * 
 * @param {string|number} userId - User ID
 * @returns {Promise<Array>} Array of transaction objects
 * @throws {Error} If userId is missing or API call fails
 * 
 * @example
 * const transactions = await getWalletTransactions('user-123');
 * // Returns: [{ id: 1, type: 'CREDIT', amount: 5000, date: '2024-01-01', ... }, ...]
 */
export const getWalletTransactions = async (userId) => {
  if (!userId) throw new Error('User ID is required');
  
  try {
    const response = await apiGet(`${BASE_URL}/wallet/${userId}/transactions`);
    return extractData(response, 'data') || [];
  } catch (error) {
    console.error('[getWalletTransactions] Error:', error.message);
    throw error;
  }
};
