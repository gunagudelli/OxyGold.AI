export const COLORS = {
  primary: '#2b0a59',
  primaryDark: '#150b33',
  amber: {
    50: '#FDFAF5',
    100: '#FBF8F3',
    200: '#FDFBF7',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    900: '#18181b',
  },
  rose: {
    400: '#f472b6',
    500: '#f43f5e',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
} as const;
