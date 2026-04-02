/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DIGITAL GOLD API SERVICE - PRODUCTION READY
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
 * const price = await getGoldPrice();
 * const portfolio = await getPortfolio(userId);
 * const order = await buyGold(userId, 10000, 'wallet');
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { apiGet, apiPost, extractData } from '../services/apiClient';
import { BASE_URL } from '../constants/api';

// ─────────────────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────

const validateAmount = (amount, fieldName = 'Amount') => {
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
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
// 1. GOLD PRICE APIs
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get current gold price (Buy & Sell)
 * @returns {Promise<Object>} { buyPrice, sellPrice, timestamp, currency }
 */
export const getGoldPrice = async () => {
  try {
    const response = await apiGet(`${BASE_URL}/digital-gold/price`);
    const data = extractData(response);

    return {
      buyPrice: data?.buyPrice || data?.buy || 0,
      sellPrice: data?.sellPrice || data?.sell || 0,
      timestamp: data?.timestamp || new Date().toISOString(),
      currency: data?.currency || 'INR',
    };
  } catch (error) {
    console.error('[DigitalGoldApi] getGoldPrice failed:', error.message);
    throw error;
  }
};

/**
 * Get historical gold prices
 * @param {string} period - 'day' | 'week' | 'month' | 'year'
 * @returns {Promise<Array>} Array of price data points
 */
export const getGoldPriceHistory = async (period = 'month') => {
  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period)) {
    throw new Error(`Period must be one of: ${validPeriods.join(', ')}`);
  }

  try {
    const response = await apiGet(`${BASE_URL}/digital-gold/price/history`, {
      params: { period },
    });
    return extractData(response) || [];
  } catch (error) {
    console.error('[DigitalGoldApi] getGoldPriceHistory failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 2. BUY OPERATIONS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Preview buy operation (calculate exact amount, fees, etc.)
 * @param {number} amount - Amount in INR
 * @returns {Promise<Object>} { goldQuantity, fees, tax, total, rate }
 */
export const previewBuyGold = async (amount) => {
  validateAmount(amount, 'Buy amount');

  try {
    const response = await apiPost(`${BASE_URL}/digital-gold/preview-buy`, {
      amount,
    });

    const data = extractData(response);
    return {
      goldQuantity: data?.goldQuantity || data?.quantity || 0,
      goldGrams: data?.goldGrams || data?.grams || 0,
      fees: data?.fees || data?.charges || 0,
      tax: data?.tax || 0,
      total: data?.total || amount,
      rate: data?.rate || data?.pricePerGram || 0,
      timestamp: data?.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[DigitalGoldApi] previewBuyGold failed:', error.message);
    throw error;
  }
};

/**
 * Buy gold
 * @param {number} userId - User ID
 * @param {number} amount - Amount in INR
 * @param {string} paymentMethod - 'wallet' | 'card' | 'upi' | 'netbanking'
 * @returns {Promise<Object>} { orderId, transactionId, status, goldQuantity }
 */
export const buyGold = async (userId, amount, paymentMethod = 'wallet') => {
  validateUserId(userId);
  validateAmount(amount, 'Buy amount');

  const validMethods = ['wallet', 'card', 'upi', 'netbanking'];
  if (!validMethods.includes(paymentMethod)) {
    throw new Error(`Payment method must be one of: ${validMethods.join(', ')}`);
  }

  try {
    const response = await apiPost(`${BASE_URL}/digital-gold/buy`, {
      userId,
      amount,
      paymentMethod,
    });

    const data = extractData(response);

    return {
      orderId: data?.orderId || data?.id,
      transactionId: data?.transactionId || data?.txnId,
      status: data?.status || 'pending',
      goldQuantity: data?.goldQuantity || 0,
      amount: data?.amount || amount,
      timestamp: data?.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[DigitalGoldApi] buyGold failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 3. SELL OPERATIONS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Preview sell operation
 * @param {number} goldQuantity - Gold quantity in grams
 * @returns {Promise<Object>} { amount, fees, tax, net, rate }
 */
export const previewSellGold = async (goldQuantity) => {
  validateAmount(goldQuantity, 'Gold quantity');

  try {
    const response = await apiPost(`${BASE_URL}/digital-gold/preview-sell`, {
      goldQuantity,
    });

    const data = extractData(response);
    return {
      amount: data?.amount || 0,
      goldQuantity: data?.goldQuantity || goldQuantity,
      fees: data?.fees || data?.charges || 0,
      tax: data?.tax || 0,
      net: data?.net || (data?.amount - (data?.fees || 0)),
      rate: data?.rate || data?.pricePerGram || 0,
      timestamp: data?.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[DigitalGoldApi] previewSellGold failed:', error.message);
    throw error;
  }
};

/**
 * Sell gold
 * @param {number} userId - User ID
 * @param {number} goldQuantity - Gold quantity in grams
 * @param {string} bankAccount - Bank account ID (optional)
 * @returns {Promise<Object>} { orderId, transactionId, status, amount }
 */
export const sellGold = async (userId, goldQuantity, bankAccount = null) => {
  validateUserId(userId);
  validateAmount(goldQuantity, 'Gold quantity');

  try {
    const response = await apiPost(`${BASE_URL}/digital-gold/sell`, {
      userId,
      goldQuantity,
      ...(bankAccount && { bankAccount }),
    });

    const data = extractData(response);

    return {
      orderId: data?.orderId || data?.id,
      transactionId: data?.transactionId || data?.txnId,
      status: data?.status || 'pending',
      goldQuantity: data?.goldQuantity || goldQuantity,
      amount: data?.amount || 0,
      timestamp: data?.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[DigitalGoldApi] sellGold failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 4. PORTFOLIO MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get user portfolio (holdings)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { totalGold, totalValue, holdings, lastUpdated }
 */
export const getPortfolio = async (userId) => {
  validateUserId(userId);

  try {
    const response = await apiGet(`${BASE_URL}/digital-gold/portfolio`, {
      params: { userId },
    });

    const data = extractData(response);
    return {
      totalGold: data?.totalGold || data?.totalQuantity || 0,
      totalValue: data?.totalValue || 0,
      currency: data?.currency || 'INR',
      holdings: data?.holdings || [],
      lastUpdated: data?.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[DigitalGoldApi] getPortfolio failed:', error.message);
    throw error;
  }
};

/**
 * Get portfolio breakdown by purchase batch
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of holdings with cost basis
 */
export const getPortfolioBreakdown = async (userId) => {
  validateUserId(userId);

  try {
    const response = await apiGet(`${BASE_URL}/digital-gold/portfolio/breakdown`, {
      params: { userId },
    });

    return extractData(response) || [];
  } catch (error) {
    console.error('[DigitalGoldApi] getPortfolioBreakdown failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 5. TRANSACTIONS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get transaction history with pagination
 * @param {number} userId - User ID
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 * @param {string} type - Filter by type: 'buy' | 'sell' | 'all'
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export const getTransactions = async (userId, page = 1, limit = 20, type = 'all') => {
  validateUserId(userId);
  validatePagination(page, limit);

  const validTypes = ['buy', 'sell', 'all'];
  if (!validTypes.includes(type)) {
    throw new Error(`Type must be one of: ${validTypes.join(', ')}`);
  }

  try {
    const response = await apiGet(`${BASE_URL}/digital-gold/transactions`, {
      params: {
        userId,
        page,
        limit,
        type: type !== 'all' ? type : undefined,
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
    console.error('[DigitalGoldApi] getTransactions failed:', error.message);
    throw error;
  }
};

/**
 * Get transaction details
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Transaction details
 */
export const getTransactionDetails = async (transactionId) => {
  if (!transactionId) throw new Error('Transaction ID is required');

  try {
    const response = await apiGet(
      `${BASE_URL}/digital-gold/transactions/${transactionId}`
    );
    return extractData(response);
  } catch (error) {
    console.error('[DigitalGoldApi] getTransactionDetails failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 6. WALLET MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get wallet balance
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { balance, currency, lastUpdated }
 */
export const getWallet = async (userId) => {
  validateUserId(userId);

  try {
    const response = await apiGet(`${BASE_URL}/digital-gold/wallet`, {
      params: { userId },
    });

    const data = extractData(response);
    return {
      balance: data?.balance || 0,
      currency: data?.currency || 'INR',
      lastUpdated: data?.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[DigitalGoldApi] getWallet failed:', error.message);
    throw error;
  }
};

/**
 * Add money to wallet
 * @param {number} userId - User ID
 * @param {number} amount - Amount to add
 * @param {string} paymentMethod - Payment method
 * @returns {Promise<Object>} { transactionId, status, amount }
 */
export const addMoneyToWallet = async (userId, amount, paymentMethod = 'card') => {
  validateUserId(userId);
  validateAmount(amount, 'Add amount');

  try {
    const response = await apiPost(`${BASE_URL}/digital-gold/wallet/add`, {
      userId,
      amount,
      paymentMethod,
    });

    const data = extractData(response);

    return {
      transactionId: data?.transactionId || data?.id,
      status: data?.status || 'pending',
      amount: data?.amount || amount,
    };
  } catch (error) {
    console.error('[DigitalGoldApi] addMoneyToWallet failed:', error.message);
    throw error;
  }
};

/**
 * Withdraw money from wallet
 * @param {number} userId - User ID
 * @param {number} amount - Amount to withdraw
 * @param {string} bankAccount - Bank account ID
 * @returns {Promise<Object>} { transactionId, status, amount }
 */
export const withdrawFromWallet = async (userId, amount, bankAccount) => {
  validateUserId(userId);
  validateAmount(amount, 'Withdraw amount');
  if (!bankAccount) throw new Error('Bank account is required');

  try {
    const response = await apiPost(`${BASE_URL}/digital-gold/wallet/withdraw`, {
      userId,
      amount,
      bankAccount,
    });

    const data = extractData(response);

    return {
      transactionId: data?.transactionId || data?.id,
      status: data?.status || 'pending',
      amount: data?.amount || amount,
    };
  } catch (error) {
    console.error('[DigitalGoldApi] withdrawFromWallet failed:', error.message);
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// 7. ANALYTICS & INSIGHTS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get portfolio analytics
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { gains, gainPercent, invested, current }
 */
export const getAnalytics = async (userId) => {
  validateUserId(userId);

  try {
    const response = await apiGet(`${BASE_URL}/digital-gold/analytics`, {
      params: { userId },
    });

    const data = extractData(response);
    return {
      totalInvested: data?.totalInvested || data?.invested || 0,
      currentValue: data?.currentValue || data?.current || 0,
      gains: data?.gains || 0,
      gainPercent: data?.gainPercent || data?.gainPercentage || 0,
      totalGold: data?.totalGold || 0,
      averageCost: data?.averageCost || 0,
      currentRate: data?.currentRate || 0,
    };
  } catch (error) {
    console.error('[DigitalGoldApi] getAnalytics failed:', error.message);
    throw error;
  }
};
