import ENV from '../config/env';

export const BASE_URL        = ENV.BASE_URL;
export const MARKETING_URL   = ENV.MARKETING_URL;
export const PHYSICAL_GOLD_BASE_URL = ENV.BASE_URL.replace('/api', '/api/oxygold-api'); // Physical gold base URL
export const DIGITAL_GOLD_BASE_URL = ENV.BASE_URL.replace('/api', '/api/oxygold-api/digital-gold'); // Digital gold base URL

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const API_AUTH          = `${BASE_URL}/oxygold-api/auth/userLoginOrRegister`;
export const API_ROLE          = `${BASE_URL}/oxygold-api/auth/createRole`;
export const API_REFRESH_TOKEN = `${BASE_URL}/oxygold-api/auth/refresh`;
export const API_PROFILE       = `${BASE_URL}/oxygold-api/auth/profile`;

// ─── Digital Gold ─────────────────────────────────────────────────────────────
export const API_GOLD_PRICE  = `${DIGITAL_GOLD_BASE_URL}/price`;
export const API_BUY         = `${DIGITAL_GOLD_BASE_URL}/buy`;
export const API_SELL        = `${DIGITAL_GOLD_BASE_URL}/sell`;
export const API_TRANSACTIONS = `${DIGITAL_GOLD_BASE_URL}/transactions`;
export const API_PORTFOLIO   = `${DIGITAL_GOLD_BASE_URL}/portfolio`;
export const API_ANALYTICS   = `${DIGITAL_GOLD_BASE_URL}/analytics`;
export const API_PREVIEW_BUY    = `${DIGITAL_GOLD_BASE_URL}/preview-buy`;
export const API_WEBHOOK_STATUS = `${DIGITAL_GOLD_BASE_URL}/payments/webhook`;
export const API_WALLET      = `${DIGITAL_GOLD_BASE_URL}/wallet`;

// ─── Marketing ────────────────────────────────────────────────────────────────
export const API_GOLD_BUY_PRICE  = `${MARKETING_URL}/marketing-service/campgin/mmtc-pamp?type=goldBuy`;
export const API_GOLD_SELL_PRICE = `${MARKETING_URL}/marketing-service/campgin/mmtc-pamp?type=goldSell`;
