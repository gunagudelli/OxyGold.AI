import React, { memo } from "react";
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";

// Shared "Buy Now" / "Add to Cart" button, same as the ASKOXY.AI app's ADD
// button: plain white pill, thin pink-magenta border and label — no fill, no
// icon, no shadow. `size="lg"` is the full-height footer button on Product
// Details; the default is the compact card chip.
const ACCENT = "#C0267E";

const PgActionButton = ({ label, onPress, disabled, loading, size = "sm", style }) => {
  const lg = size === "lg";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.btn, lg ? styles.btnLg : styles.btnSm, loading && styles.busy, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={ACCENT} />
      ) : (
        <Text style={[styles.label, lg && styles.labelLg]} numberOfLines={1}>
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
  busy: { opacity: 0.6 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT,
    textTransform: "uppercase",
  },
  labelLg: { fontSize: 14, letterSpacing: 0.3 },
});

export default memo(PgActionButton);
