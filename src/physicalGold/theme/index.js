// ─── OxyGold Physical Gold — design system ──────────────────────────────────
// One source of truth for colours, type, spacing and corners. Every screen's
// palette has been normalised to these values; new UI should import from here
// instead of hard-coding hex values or sizes.
//
//   import { colors, type, space, radius } from "../theme";
//
// Look: ASKOXY.AI style — deep purple brand, neutral greys, orange used only
// for the main buy/checkout action, soft green for savings, red for errors.

export const colors = {
  // Brand
  primary: "#503189", // links, selected states, icons, secondary buttons
  primaryLight: "#8A73B8",
  primaryTint: "#F4F0FA", // selected backgrounds, chips
  primaryBorder: "#DCD3F0",

  // Main call-to-action (Place Order / Checkout / Buy) — use sparingly
  cta: "#FB641B",

  // Text
  text: "#333333", // titles, prices, body
  textSecondary: "#555555", // labels
  textMuted: "#757575", // hints, meta
  textDisabled: "#9E9E9E",
  onPrimary: "#FFFFFF",

  // Surfaces
  bg: "#FFFFFF",
  bgSubtle: "#F7F7F9", // image tiles, section bands, input fills
  divider: "#EEEEF3",
  border: "#E0E0E0",

  // Status
  success: "#1F8A4C", // savings, FREE, price up
  successDark: "#15803D",
  successTint: "#EAF8F1",
  danger: "#E53935", // errors, delete, price down
  dangerTint: "#FDECEA",
  warning: "#F59E0B",
  warningTint: "#FFF8E6",

  // Header / footer chrome
  chrome: "#4B3888", // header / footer violet
};

// Type scale — use only these sizes.
export const type = {
  caption: { fontSize: 11, color: colors.textMuted },
  small: { fontSize: 12, color: colors.textSecondary },
  body: { fontSize: 13, color: colors.text },
  bodyStrong: { fontSize: 13, fontWeight: "600", color: colors.text },
  label: { fontSize: 14, fontWeight: "500", color: colors.text },
  title: { fontSize: 16, fontWeight: "600", color: colors.text },
  heading: { fontSize: 18, fontWeight: "600", color: colors.text },
  price: { fontSize: 15, fontWeight: "600", color: colors.text },
  priceLarge: { fontSize: 20, fontWeight: "600", color: colors.text },
  display: { fontSize: 24, fontWeight: "600", color: colors.text },
};

// Spacing — multiples of 4.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Corners.
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export default { colors, type, space, radius };
