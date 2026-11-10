import React, { memo } from "react";
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../theme";

// Shared "Buy Now" / "Add to Cart" button. Default: white pill with a thin
// brand-purple border and label (secondary action). `variant="cta"`: filled
// orange — the one main buy action on a screen. `size="lg"` is the
// full-height footer button on Product Details; the default is the compact
// card chip.
const ACCENT = colors.primary;

const PgActionButton = ({ label, onPress, disabled, loading, size = "sm", variant, style }) => {
  const lg = size === "lg";
  const cta = variant === "cta";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.btn, lg ? styles.btnLg : styles.btnSm, cta && styles.btnCta, loading && styles.busy, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={cta ? colors.onPrimary : ACCENT} />
      ) : (
        <Text style={[styles.label, lg && styles.labelLg, cta && styles.labelCta]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.3,
    borderColor: ACCENT,
  },
  btnSm: { height: 32, paddingHorizontal: 16, borderRadius: 20 },
  btnLg: { flex: 1, height: 50, paddingHorizontal: 16, borderRadius: 12 },
  btnCta: { backgroundColor: colors.cta, borderColor: colors.cta },
  busy: { opacity: 0.6 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: ACCENT,
    textTransform: "uppercase",
  },
  labelLg: { fontSize: 14, letterSpacing: 0.3 },
  labelCta: { color: colors.onPrimary },
});

export default memo(PgActionButton);
