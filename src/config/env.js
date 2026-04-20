// ─── Environment Configuration ────────────────────────────────────────────────
// Switch APP_ENV to 'staging' for staging builds, 'live' for production.
const APP_ENV = 'live'; // 'live' | 'staging'

const ENV = {
  live: {
    BASE_URL:       'https://meta.oxyloans.com/api',
    MARKETING_URL:  'https://meta.oxyloans.com/api',
  },
  staging: {
    BASE_URL:       'https://meta.oxyglobal.tech/api',
    MARKETING_URL:  'https://meta.oxyglobal.tech/api',
  },
};

const config = ENV[APP_ENV];

// Log configuration on app start
console.log('═══════════════════════════════════════════════════════');
console.log('🌍 Environment:', APP_ENV.toUpperCase());
console.log('🔗 BASE_URL:', config.BASE_URL);
console.log('🔗 MARKETING_URL:', config.MARKETING_URL);
console.log('═══════════════════════════════════════════════════════');

export default config;
