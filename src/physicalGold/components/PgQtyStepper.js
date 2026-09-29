import React, { memo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// − qty + stepper shown in place of "Add to Cart" once the item is in the
// cart. Same white pill and pink-magenta edge as PgActionButton, so the
// button keeps its shape and simply turns into a counter.
const ACCENT = "#C0267E";

const PgQtyStepper = ({ qty, onIncrement, onDecrement, loading, style }) => (
  <View style={[styles.wrap, style]}>
    <TouchableOpacity
      style={styles.btn}
      onPress={onDecrement}
      disabled={loading}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
      accessibilityLabel={qty <= 1 ? "Remove from cart" : "Decrease quantity"}
    >
      <Ionicons name={qty <= 1 ? "trash-outline" : "remove"} size={qty <= 1 ? 15 : 17} color={ACCENT} />
    </TouchableOpacity>

    <View style={styles.qtyBox}>
      {loading ? (
        <ActivityIndicator size="small" color={ACCENT} />
      ) : (
        <Text style={styles.qty}>{qty}</Text>
      )}
    </View>

    <TouchableOpacity
      style={styles.btn}
      onPress={onIncrement}
      disabled={loading}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      accessibilityLabel="Increase quantity"
    >
      <Ionicons name="add" size={17} color={ACCENT} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 34,
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: ACCENT,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  btn: {
    width: 40,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  qty: { fontSize: 14, fontWeight: "800", color: ACCENT },
});

export default memo(PgQtyStepper);
