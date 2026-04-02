// ─── Environment Configuration ────────────────────────────────────────────────
// Switch APP_ENV to 'staging' for staging builds, 'live' for production.
const APP_ENV = 'live'; // 'live' | 'staging'

const ENV = {
  live: {
    BASE_URL:       'http://65.0.147.157:9900/api',
    MARKETING_URL:  'http://65.0.147.157:9229/api',
  },
  staging: {
    BASE_URL:       'https://meta.oxyglobal.tech/api',
    MARKETING_URL:  'https://meta.oxyglobal.tech/api',
  },
};

export default ENV[APP_ENV];
