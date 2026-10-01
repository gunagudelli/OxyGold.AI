import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// ─── "100% GST Paid by OxyGold.ai" popup ────────────────────────────────────
// Mirrors the web's discount modal (oxygold ProductDetailsPage / CartSlider):
// when the backend returns a discount, it's the GST being waived, so this
// explains that the customer's net tax is ₹0. Gold and Silver get their own
// colour theme, same as web.
const THEMES = {
  gold: {
    bg: ["#FFFBEB", "#FFFFFF", "#FFFBEB"],
    ring: "rgba(253,230,138,0.6)",
    icon: ["#C29B27", "#9B7416"],
    badgeBorder: "#FDE68A",
    badgeBg: "#FFFBEB",
    badgeText: "#B45309",
    title: "#8B6914",
    pillBorder: "#FDE68A",
    pillBg: "#FEF3C7",
    pillText: "#92400E",
    sparkle: "#FCD34D",
  },
  silver: {
    bg: ["#F8FAFC", "#FFFFFF", "#F8FAFC"],
    ring: "rgba(226,232,240,0.6)",
    icon: ["#64748B", "#334155"],
    badgeBorder: "#E2E8F0",
    badgeBg: "#F8FAFC",
    badgeText: "#334155",
    title: "#1E293B",
    pillBorder: "#E2E8F0",
    pillBg: "#F1F5F9",
    pillText: "#334155",
    sparkle: "#94A3B8",
  },
};

const EMERALD = "#047857";
const fmt2 = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const GstWaiverModal = ({ visible, onClose, isSilver, gstPercentage, gstAmount, waiverAmount }) => {
  const t = isSilver ? THEMES.silver : THEMES.gold;
  const metalName = isSilver ? "Silver" : "Gold";

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 450,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [visible, enter]);

  const cardAnim = {
    opacity: enter,
    transform: [
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
    ],
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[s.cardWrap, { borderColor: t.ring }, cardAnim]}>
          <LinearGradient colors={t.bg} style={s.card}>
            <Ionicons name="sparkles" size={18} color={t.sparkle} style={s.sparkle} />

            <TouchableOpacity
              style={s.close}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={16} color="#8A8A8A" />
            </TouchableOpacity>

            <LinearGradient colors={t.icon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
              <Ionicons name="pricetag" size={24} color="#fff" />
            </LinearGradient>

            <View style={[s.badge, { borderColor: t.badgeBorder, backgroundColor: t.badgeBg }]}>
              <Ionicons name="checkmark-circle" size={12} color="#059669" />
              <Text style={[s.badgeText, { color: t.badgeText }]}>100% GST Paid by OxyGold.ai</Text>
            </View>

            <Text style={[s.title, { color: t.title }]}>Congratulations! 🎉</Text>
            <Text style={s.subtitle}>We are paying the GST amount on your behalf!</Text>
            <Text style={s.body}>
              For your {metalName.toLowerCase()} purchase, <Text style={s.bodyStrong}>OxyGold.ai</Text> covers
              the complete government GST so you don't have to pay extra. The entire tax amount is waived as
              an instant discount!
            </Text>

            {/* GST breakdown */}
            <View style={s.breakdown}>
              <View style={s.row}>
                <Text style={s.rowLabel}>Government GST ({gstPercentage || 3}%)</Text>
                <Text style={s.rowValue}>₹{fmt2(gstAmount || waiverAmount)}</Text>
              </View>
              <View style={s.row}>
                <View style={s.waiverLabel}>
                  <Ionicons name="pricetag-outline" size={11} color={EMERALD} />
                  <Text style={s.waiverText}>OxyGold.ai GST Waiver:</Text>
                </View>
                <Text style={s.waiverText}>-₹{fmt2(waiverAmount)}</Text>
              </View>
              <View style={[s.row, s.netRow]}>
                <Text style={s.netLabel}>Your Net Tax Contribution</Text>
                <Text style={s.netValue}>
                  ₹0.00 <Text style={s.netHint}>(Zero Extra Tax)</Text>
                </Text>
              </View>
            </View>

            {/* Highlight pills */}
            <View style={s.pills}>
              <View style={[s.pill, s.pillGreen]}>
                <Ionicons name="checkmark-circle" size={11} color={EMERALD} />
                <Text style={[s.pillText, { color: EMERALD }]}>100% Tax Covered</Text>
              </View>
              <View style={[s.pill, { borderColor: t.pillBorder, backgroundColor: t.pillBg }]}>
                <Ionicons name="sparkles" size={11} color={t.pillText} />
                <Text style={[s.pillText, { color: t.pillText }]}>Pure {metalName} Offer</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} activeOpacity={0.9} style={s.ctaWrap}>
              <LinearGradient colors={t.icon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
                <Text style={s.ctaText}>Awesome, Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default GstWaiverModal;

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 384,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  card: { padding: 24, alignItems: "center" },
  sparkle: { position: "absolute", left: 28, top: 24 },
  close: {
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "900" },
  subtitle: { marginTop: 4, fontSize: 15, fontWeight: "700", color: "#1A1A1A", textAlign: "center" },
  body: { marginTop: 8, fontSize: 12, lineHeight: 18, color: "#5A5A5A", textAlign: "center" },
  bodyStrong: { fontWeight: "700", color: "#1A1A1A" },
  breakdown: {
    alignSelf: "stretch",
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFE7DC",
    backgroundColor: "#FAF8F5",
    padding: 14,
    gap: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 12, color: "#5A5A5A" },
  rowValue: { fontSize: 12, fontWeight: "600", color: "#1A1A1A" },
  waiverLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  waiverText: { fontSize: 12, fontWeight: "600", color: EMERALD },
  netRow: { borderTopWidth: 1, borderTopColor: "#E8E0D5", paddingTop: 8 },
  netLabel: { fontSize: 12, fontWeight: "700", color: "#1A1A1A" },
  netValue: { fontSize: 12, fontWeight: "800", color: EMERALD },
  netHint: { fontSize: 10, fontWeight: "500", color: "#059669" },
  pills: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 20 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillGreen: { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" },
  pillText: { fontSize: 11, fontWeight: "700" },
  ctaWrap: { alignSelf: "stretch" },
  cta: { borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  ctaText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
