// Brand accent is the ASKOXY.AI "Grocery" purple (see PG_HOME_THEME below).
export const PG_COLORS = {
  // Brand
  gold:        '#503189',
  goldLight:   '#F4F0FA',
  goldDark:    '#503189',
  goldBg:      '#F4F0FA',

  // Grays
  darkGray:    '#333333',
  medGray:     '#7C706A',
  lightGray:   '#9E9E9E',

  // Backgrounds
  background:  '#F7F7F9',
  surface:     '#FFFFFF',
  border:      '#E0E0E0',

  // Status
  success:     '#1F8A4C',
  successBg:   '#EAF8F1',
  error:       '#E53935',
  errorBg:     '#FDECEA',
  warning:     '#F59E0B',
  warningBg:   '#FFF8E6',
};

// Home top band — same lavender "Grocery" theme as the ASKOXY.AI home screen
// (ASKOXY.AI_MOBILE/src/Screens/New_Dashbord/untils/categoryThemes.js).
// `top` -> header, `search` -> location + search band, `band` -> banner band
// that ends in the curtain edge, `accent` -> brand purple, `tint` -> soft fill.
export const PG_HOME_THEME = {
  top:    ['#B9A3E8', '#C0ACEB'],
  search: ['#C0ACEB', '#C9B7EE'],
  band:   ['#C9B7EE', '#D6C7F2'],
  accent: '#503189',
  tint:   '#F4F0FA',
};

// App header (every screen): a gradient of the Home footer's deep purple, with
// light icons/title on top.
export const PG_HEADER_GRADIENT = ['#4B3888', '#5A44A0'];
