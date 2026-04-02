import ENV from '../config/env';

export const BASE_URL        = ENV.BASE_URL;
export const MARKETING_URL   = ENV.MARKETING_URL;
export const PHYSICAL_GOLD_BASE_URL = ENV.BASE_URL.replace('/api', ''); // Remove /api for physical gold endpoints

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const API_AUTH          = `${BASE_URL}/auth/userLoginOrRegister`;
export const API_ROLE          = `${BASE_URL}/auth/createRole`;
export const API_REFRESH_TOKEN = `${BASE_URL}/auth/refresh`;
export const API_PROFILE       = `${BASE_URL}/auth/profile`;

// ─── Digital Gold ─────────────────────────────────────────────────────────────
export const API_GOLD_PRICE  = `${BASE_URL}/digital-gold/price`;
export const API_BUY         = `${BASE_URL}/digital-gold/buy`;
export const API_SELL        = `${BASE_URL}/digital-gold/sell`;
export const API_TRANSACTIONS = `${BASE_URL}/digital-gold/transactions`;
export const API_PORTFOLIO   = `${BASE_URL}/digital-gold/portfolio`;
export const API_ANALYTICS   = `${BASE_URL}/digital-gold/analytics`;
export const API_PREVIEW_BUY    = `${BASE_URL}/digital-gold/preview-buy`;
export const API_WEBHOOK_STATUS = `${BASE_URL}/digital-gold/payments/webhook`;
export const API_WALLET      = `${BASE_URL}/digital-gold/wallet`;

// ─── Marketing ────────────────────────────────────────────────────────────────
export const API_GOLD_BUY_PRICE  = `${MARKETING_URL}/marketing-service/campgin/mmtc-pamp?type=goldBuy`;
export const API_GOLD_SELL_PRICE = `${MARKETING_URL}/marketing-service/campgin/mmtc-pamp?type=goldSell`;
