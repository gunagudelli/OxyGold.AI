import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// ─── "100% GST Paid by OXYGOLD.AI" popup ────────────────────────────────────
// When the backend returns a discount, it's the GST being waived — this
// tells the customer their net tax is ₹0. Coloured header band + gift icon,
// then a short message, a three-row breakdown and one button. Gold gets a
// gold theme, Silver a violet one.
const THEMES = {
  gold: { header: ["#E0B43A", "#B8860B"], accent: "#B8860B", soft: "#FFF8E6" },
  silver: { header: ["#8B5CF6", "#6D28D9"], accent: "#7C3AED", soft: "#F5F3FF" },
};
const GREEN = "#047857";
const fmt2 = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const GstWaiverModal = ({ visible, onClose, isSilver, gstPercentage, gstAmount, waiverAmount }) => {
  const t = isSilver ? THEMES.silver : THEMES.gold;
  const metalName = isSilver ? "Silver" : "Gold";
  // GST on bullion is a flat 3%; fall back to it when the caller doesn't
  // have the rate (e.g. cart totals only carry the discount amount).
  const gstPct = Number(gstPercentage) > 0 ? Number(gstPercentage) : 3;
  const gst = gstAmount || waiverAmount;
  const saved = waiverAmount || gstAmount;

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [visible, enter]);

  const cardAnim = {
    opacity: enter,
    transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[s.card, cardAnim]}>
          {/* Header band */}
          <LinearGradient colors={t.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
            <TouchableOpacity
              style={s.close}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={s.iconCircle}>
              <Ionicons name="gift" size={30} color={t.accent} />
            </View>
          </LinearGradient>

          <View style={s.body}>
            <Text style={s.title}>Congratulations! 🎉</Text>
            <Text style={s.saved}>You saved ₹{fmt2(saved)} on GST</Text>
            <Text style={s.message}>
              OXYGOLD.AI pays 100% GST on your{" "}
              <Text style={[s.metal, { color: t.accent }]}>{metalName} Purchase</Text>
            </Text>

            <View style={[s.breakdown, { backgroundColor: t.soft }]}>
              <View style={s.row}>
                <Text style={s.rowLabel}>GST ({gstPct}%)</Text>
                <Text style={s.rowValue}>₹{fmt2(gst)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.waiverLabel}>OXYGOLD.AI GST Waiver</Text>
                <Text style={s.waiverLabel}>-₹{fmt2(saved)}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.row}>
                <Text style={s.payLabel}>GST You Pay</Text>
                <Text style={s.payValue}>₹0</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={s.ctaWrap}>
              <LinearGradient colors={t.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
                <Text style={s.ctaText}>Awesome, Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default GstWaiverModal;

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  header: { height: 96, alignItems: "center", justifyContent: "flex-end" },
  close: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Icon sits half on the header band, half on the white body.
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -32,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  body: { paddingHorizontal: 22, paddingTop: 42, paddingBottom: 20, alignItems: "center" },
  title: { fontSize: 21, fontWeight: "800", color: "#1A1A1A", textAlign: "center" },
  saved: { marginTop: 6, fontSize: 16, fontWeight: "800", color: GREEN, textAlign: "center" },
  message: { marginTop: 8, fontSize: 13, lineHeight: 19, color: "#5A5A5A", textAlign: "center" },
  metal: { fontWeight: "800" },
  breakdown: {
    alignSelf: "stretch",
    marginTop: 18,
    marginBottom: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 9,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 13, color: "#5A5A5A" },
  rowValue: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  waiverLabel: { fontSize: 13, fontWeight: "600", color: GREEN },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.08)" },
  payLabel: { fontSize: 14, fontWeight: "800", color: "#1A1A1A" },
  payValue: { fontSize: 16, fontWeight: "800", color: GREEN },
  ctaWrap: { alignSelf: "stretch", borderRadius: 14, overflow: "hidden" },
  cta: { paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
