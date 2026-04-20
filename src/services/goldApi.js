import { apiPost, apiGet, getUserId } from './apiClient';
import {
  API_GOLD_PRICE, API_BUY, API_SELL, API_TRANSACTIONS,
  API_PORTFOLIO, API_PREVIEW_BUY, API_WEBHOOK_STATUS, API_WALLET, API_PROFILE,
} from '../constants/api';

export { getUserId } from './apiClient';
export { clearAuthTokens } from './apiClient';

const TROY_OZ_TO_GRAM = 31.1035;
const USD_TO_INR = 83;
const BUY_SPREAD = 0.02;
const SELL_SPREAD = 0.02;
const CACHE_MS = 60000;

let _priceCache = null;
let _priceCacheTime = 0;

const calcPrices = (usdPerOz) => {
  const inrPerGram = (usdPerOz / TROY_OZ_TO_GRAM) * USD_TO_INR;
  return {
    buyPrice:   Math.round(inrPerGram * (1 + BUY_SPREAD)),
    sellPrice:  Math.round(inrPerGram * (1 - SELL_SPREAD)),
    inrPerGram: Math.round(inrPerGram),
  };
};

const GOLD_APIS = [
  {
    url:   'https://api.exchangerate-api.com/v4/latest/USD',
    parse: (d) => { const x = d?.rates?.XAU; if (!x) throw new Error(); return 1 / x; },
  },
  {
    url:   'https://api.frankfurter.app/latest?from=USD&to=XAU',
    parse: (d) => { const x = d?.rates?.XAU; if (!x) throw new Error(); return 1 / x; },
  },
];

export const fetchGoldPrice = async () => {
  if (_priceCache && Date.now() - _priceCacheTime < CACHE_MS) return _priceCache;

  let usdPerOz = 0;
  let source   = '';

  for (const api of GOLD_APIS) {
    try {
      const res  = await fetch(api.url, { timeout: 6000 });
      const data = await res.json();
      usdPerOz   = api.parse(data);
      source     = api.url;
      break;
    } catch { continue; }
  }

  if (!usdPerOz) {
    try {
      const data = await apiGet(API_GOLD_PRICE);
      const d    = data?.data || data;
      const buy  = parseFloat(d.buyPrice || d.pricePerGram || 0);
      if (buy > 0) {
        const result = {
          pricePerGram:  buy,
          sellPrice:     parseFloat(d.sellPrice || buy * (1 - SELL_SPREAD)),
          change:        parseFloat(d.change || 0),
          changePercent: parseFloat(d.changePercent || 0),
          high24h:       parseFloat(d.high24h || 0),
          low24h:        parseFloat(d.low24h  || 0),
          lastUpdated:   d.lastUpdated || new Date().toISOString(),
          source:        'backend',
        };
        _priceCache = result; _priceCacheTime = Date.now();
        return result;
      }
    } catch {}
  }

  if (!usdPerOz) throw new Error('All gold price sources failed');

  const { buyPrice, sellPrice, inrPerGram } = calcPrices(usdPerOz);
  const result = {
    pricePerGram: buyPrice, sellPrice, inrPerGram,
    usdPerOz:     Math.round(usdPerOz * 100) / 100,
    change: 0, changePercent: 0,
    high24h:     Math.round(buyPrice * 1.005),
    low24h:      Math.round(buyPrice * 0.995),
    lastUpdated: new Date().toISOString(),
    source,
  };
  _priceCache = result; _priceCacheTime = Date.now();
  return result;
};

// ─── Preview Buy ──────────────────────────────────────────────────────────────
export const previewBuy = async ({ userId, purchaseType, amount, grams, pergramBuyingPrice, productId = 1 }) => {
  const payload = {
    userId,
    purchaseType,
    paymentMode: 'WALLET',
    pergramPrice: pergramBuyingPrice,
    productId,
  };
  
  if (purchaseType === 'AMOUNT') {
    payload.amount = amount;
  } else {
    payload.grams = grams;
  }
  
  console.log('========================================');
  console.log('[previewBuy] REQUEST PAYLOAD');
  console.log(`[previewBuy] URL: ${API_PREVIEW_BUY}`);
  console.log('[previewBuy] Payload:', JSON.stringify(payload, null, 2));
  console.log('========================================');
  
  try {
    const data = await apiPost(API_PREVIEW_BUY, payload);
    const d = data?.data || data;
    return {
      orderId:            d.orderId || '',
      amount:             parseFloat(d.amount             || amount  || 0),
      grams:              parseFloat(d.grams              || grams   || 0),
      pergramBuyingPrice: parseFloat(d.pergramBuyingPrice || d.pergramPrice || pergramBuyingPrice || 0),
      fees: {
        platformFee: parseFloat(d.fees?.platformFee || 0),
        gst:         parseFloat(d.fees?.gst         || 0),
        totalFees:   parseFloat(d.fees?.totalFees   || 0),
      },
      finalAmount:      parseFloat(d.finalAmount || d.amount || 0),
      priceLockedUntil: d.priceLockedUntil || null,
      lockDuration:     parseInt(d.lockDuration || 300, 10),
    };
  } catch (error) {
    console.log('========================================');
    console.error('[previewBuy] ERROR');
    console.error('[previewBuy] Error Message:', error.message);
    console.error('[previewBuy] Error Status:', error.status);
    console.error('[previewBuy] Error Data:', JSON.stringify(error.data, null, 2));
    console.log('========================================');
    throw error;
  }
};

// ─── Buy Gold ─────────────────────────────────────────────────────────────────
export const executeBuy = async ({ userId, purchaseType, amount, grams, pergramPrice, paymentMode = 'WALLET', productId = 1 }) => {
  console.log('========================================');
  console.log('[executeBuy] FUNCTION CALLED');
  console.log('[executeBuy] userId received:', userId);
  console.log('[executeBuy] userId type:', typeof userId);
  console.log('[executeBuy] purchaseType:', purchaseType);
  console.log('[executeBuy] amount:', amount);
  console.log('[executeBuy] grams:', grams);
  console.log('[executeBuy] pergramPrice:', pergramPrice);
  console.log('[executeBuy] paymentMode:', paymentMode);
  console.log('[executeBuy] productId:', productId);
  console.log('========================================');
  
  const payload = {
    userId,
    purchaseType,
    amount:      purchaseType === 'AMOUNT' ? amount : 0,
    grams:       purchaseType === 'GRAMS'  ? grams  : 0,
    paymentMode,
    pergramPrice,
    productId,
    "returnUrl":"http://localhost:5173/payment-success?order_id={ORDER_ID}"
  };
  
  console.log('========================================');
  console.log('[executeBuy] API PAYLOAD');
  console.log('[executeBuy] URL:', API_BUY);
  console.log('[executeBuy] Payload:', JSON.stringify(payload, null, 2));
  console.log('========================================');
  
  const data = await apiPost(API_BUY, payload);
  const d = data?.data || data;
  console.log('[executeBuy] API response:', data);
  const rawSessionId = d.paymentSessionId || null;
  return {
    transactionId:    d.transactionId    || d.id || `TXN${Date.now()}`,
    orderId:          d.transactionId    || d.id || '',
    paymentSessionId: rawSessionId,
    amount:           parseFloat(d.amount || amount || 0),
    grams:            parseFloat(d.grams  || grams  || 0),
    status:           d.status || 'PENDING',
  };
};

// ─── Webhook Status (POST request) ──────────────────────────────────────────────
export const checkWebhookStatus = async (orderId) => {
  console.log(`[Webhook] Calling: ${API_WEBHOOK_STATUS}?order_id=${orderId}`);
  try {
    // Use POST method for webhook status
    const response = await apiPost(`${API_WEBHOOK_STATUS}?order_id=${orderId}`, {});
    console.log('[Webhook] Raw response:', JSON.stringify(response));
    
    // API returns data directly: { orderId, status, message }
    // Not wrapped in a data property
    const d = response?.data || response;
    console.log('[Webhook] Parsed response:', d);
    
    return {
      status:        d?.status        || 'PENDING',
      transactionId: d?.orderId       || orderId,
      amount:        parseFloat(d?.amount || 0),
      grams:         parseFloat(d?.grams  || 0),
    };
  } catch (error) {
    console.error('[Webhook] Error:', error.message);
    // Return pending status on error instead of throwing
    return {
      status:        'PENDING',
      transactionId: orderId,
      amount:        0,
      grams:         0,
    };
  }
};

// ─── Sell Gold ────────────────────────────────────────────────────────────────
export const executeSell = async (grams, pricePerGram, userId) => {
  const data = await apiPost(API_SELL, { grams, pricePerGram, userId, amount: grams * pricePerGram });
  const d = data?.data || data;
  return {
    id:           d.transactionId || d.id || `TXN${Date.now()}`,
    type:         'SELL',
    grams:        parseFloat(grams),
    amount:       parseFloat((grams * pricePerGram).toFixed(2)),
    pricePerGram,
    timestamp:    d.createdAt || new Date().toISOString(),
    status:       'SUCCESS',
  };
};

// ─── Portfolio (GET request) ──────────────────────────────────────────────────
export const fetchPortfolio = async (userId) => {
  const data = await apiGet(`${API_PORTFOLIO}/${userId}`);
  const d = data?.data || data;
  return {
    userId:              d.userId || userId,
    totalGoldGrams:      parseFloat(d.totalGoldGrams      || d.goldBalanceGrams || 0),
    totalInvestedAmount: parseFloat(d.totalInvestedAmount || d.invested         || 0),
    currentValue:        parseFloat(d.currentValue        || 0),
    totalGain:           parseFloat(d.totalGain           || d.gain             || 0),
    gainPercentage:      parseFloat(d.gainPercentage      || d.gainPercent      || 0),
    averageBuyPrice:     parseFloat(d.averageBuyPrice     || d.avgBuyPrice      || 0),
    currentMarketPrice:  parseFloat(d.currentMarketPrice  || d.marketPrice      || 0),
    lastUpdated:         d.lastUpdated || new Date().toISOString(),
  };
};

// ─── Transactions (paginated) (GET request) ───────────────────────────────────
export const fetchTransactionsPaged = async (userId, page = 1, limit = 10, type = 'all') => {
  const data = await apiGet(`${API_TRANSACTIONS}/${userId}?page=${page}&limit=${limit}&type=${type}`);
  const d    = data?.data || data;
  const list = d?.transactions || d || [];
  const pagination = d?.pagination || {};
  return {
    transactions: list.map(t => ({
      id:           t.id || t.transactionId || `TXN${Date.now()}`,
      type:         t.type === 'BUY' ? 'BUY' : 'SELL',
      amount:       parseFloat(t.amount       || 0),
      grams:        parseFloat(t.grams        || 0),
      pricePerGram: parseFloat(t.pricePerGram || 0),
      status:       t.status || 'COMPLETED',
      timestamp:    t.timestamp || t.createdAt || new Date().toISOString(),
      orderId:      t.orderId   || t.id || '',
    })),
    pagination: {
      currentPage:       pagination.currentPage       || page,
      totalPages:        pagination.totalPages        || 1,
      totalTransactions: pagination.totalTransactions || list.length,
      hasNext:           pagination.hasNext           || false,
      hasPrev:           pagination.hasPrev           || false,
    },
  };
};

// ─── Transactions (GET request) ────────────────────────────────────────────────
export const fetchTransactions = async (userId) => {
  const data = await apiGet(`${API_TRANSACTIONS}?userId=${userId}`);
  const list = data?.data || data?.transactions || data || [];
  return list.map(t => ({
    id:           t.transactionId || t.id || `TXN${Date.now()}`,
    type:         t.type === 'BUY' ? 'BUY' : 'SELL',
    grams:        parseFloat(t.grams        || 0),
    amount:       parseFloat(t.amount       || 0),
    pricePerGram: parseFloat(t.pricePerGram || 0),
    timestamp:    t.createdAt || t.timestamp || new Date().toISOString(),
    status:       t.status === 'SUCCESS' ? 'SUCCESS' : t.status,
  }));
};

// ─── Wallet (GET request) ─────────────────────────────────────────────────────
export const fetchWallet = async (userId) => {
  const data = await apiGet(`${API_WALLET}/${userId}`);
  const d = data?.data || data;
  return {
    goldBalanceGrams:    parseFloat(d.goldBalanceGrams    || d.goldBalance || 0),
    totalInvestedAmount: parseFloat(d.totalInvestedAmount || d.invested    || 0),
    currentValue:        parseFloat(d.currentValue        || 0),
    walletBalance:       parseFloat(d.walletBalance       || d.balance     || 0),
  };
};

// ─── Profile (GET request) ────────────────────────────────────────────────────
export const fetchProfile = async (userId) => {
  // Use GET method for profile fetch
  const data = await apiGet(`${API_PROFILE}/${userId}`);
  const d = data?.data || data;
  return {
    id:           d.userId || d.id || userId,
    name:         d.name   || d.fullName || '',
    email:        d.email  || '',
    phone:        d.phoneNumber || d.phone || '',
    kycVerified:  d.kycVerified || d.isKycVerified || false,
    walletBalance: parseFloat(d.walletBalance || 0),
  };
};
