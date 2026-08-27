// Brand palette — matches the web app's global design tokens
// (oxygold/src/styles/colors.css) so the Digital Gold flow uses the
// exact same colors as the live site.
export const COLORS = {
  // Backgrounds
  bg:           '#F5F3F0',
  bgElevated:   '#FFFFFF',
  bgCard:       '#FFFFFF',
  bgGlass:      'rgba(255,255,255,0.92)',

  // Gold brand family
  gold:         '#D4AF37',
  goldBright:   '#D4AF37',
  goldMid:      '#C5A100',
  goldPale:     '#F8F6F2',
  goldMuted:    'rgba(212,175,55,0.10)',
  goldBorder:   'rgba(212,175,55,0.20)',
  goldShadow:   'rgba(212,175,55,0.25)',

  // Navy family — mapped to the web app's dark neutral text scale
  navy:         '#1F2933',
  navyMid:      '#6B7280',
  navySoft:     '#9CA3AF',

  // Text
  textPrimary:  '#1F2933',
  textSecondary:'#6B7280',
  textMuted:    '#9CA3AF',

  // Status
  green:        '#2ECC71',
  greenBg:      '#E8F5E9',
  red:          '#C85A54',
  redBg:        '#FDECEA',

  // Structure
  border:       '#E5E7EB',
  borderStrong: '#D1D5DB',
  divider:      '#F2F0EB',
  white:        '#FFFFFF',

  // Shadows
  shadowDark:   'rgba(31,41,51,0.10)',
  shadowGold:   'rgba(212,175,55,0.15)',
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

export const FONT_SIZE = {
  xs:   10,
  sm:   12,
  md:   14,
  base: 16,
  lg:   18,
  xl:   22,
  xxl:  28,
  xxxl: 36,
  huge: 48,
};

export const RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  full: 9999,
};

export const SHADOW = {
  gold: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
};
