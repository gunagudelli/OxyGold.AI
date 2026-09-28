// Brand accent is the ASKOXY.AI "Grocery" purple (see PG_HOME_THEME below).
export const PG_COLORS = {
  // Brand
  gold:        '#6C4AB6',
  goldLight:   '#F3ECFA',
  goldDark:    '#6C4AB6',
  goldBg:      '#F3ECFA',

  // Grays
  darkGray:    '#1C1C1E',
  medGray:     '#7C706A',
  lightGray:   '#A79C93',

  // Backgrounds
  background:  '#F8F7F6',
  surface:     '#FFFFFF',
  border:      '#E7E0DA',

  // Status
  success:     '#2ECC71',
  successBg:   '#E8F5E9',
  error:       '#C85A54',
  errorBg:     '#FDECEA',
  warning:     '#D4A574',
  warningBg:   '#FDF6ED',
};

// Home top band — same lavender "Grocery" theme as the ASKOXY.AI home screen
// (ASKOXY.AI_MOBILE/src/Screens/New_Dashbord/untils/categoryThemes.js).
// `top` -> header, `search` -> location + search band, `band` -> banner band
// that ends in the curtain edge, `accent` -> brand purple, `tint` -> soft fill.
export const PG_HOME_THEME = {
  top:    ['#B9A3E8', '#C0ACEB'],
  search: ['#C0ACEB', '#C9B7EE'],
  band:   ['#C9B7EE', '#D6C7F2'],
  accent: '#6C4AB6',
  tint:   '#F3ECFA',
};

// App header (every screen): a gradient of the Home footer's deep purple, with
// light icons/title on top.
export const PG_HEADER_GRADIENT = ['#2A1F4A', '#3E2E6B'];
