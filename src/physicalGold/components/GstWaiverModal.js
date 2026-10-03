import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// ─── "100% GST Paid by OXYGOLD.AI" popup ────────────────────────────────────
// When the backend returns a discount, it's the GST being waived — this
// tells the customer their net tax is ₹0. Coloured header band + gift icon,
// then a short message, a three-row breakdown and one button. Gold gets a
// gold theme, Silver a violet one. Silver also has zero making charges, so
// its popup says "Zero Making Charges + 100% GST" and adds a Making row.
const THEMES = {
  gold: { header: ["#E0B43A", "#B8860B"], accent: "#B8860B", soft: "#FFF8E6" },
  silver: { header: ["#8B5CF6", "#6D28D9"], accent: "#7C3AED", soft: "#F5F3FF" },
};
const GREEN = "#047857";
const fmt2 = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// ─── Confetti burst ──────────────────────────────────────────────────────────
// Coloured paper pieces pop out of the gift icon, fly up and outward, then
// flutter down over the card and fade. Clipped to the card so it never
// covers the rest of the screen.
const CONFETTI_COLORS = ["#F59E0B", "#EF4444", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#FACC15"];
const CONFETTI_COUNT = 28;
const BURST_ORIGIN_Y = 96; // centre of the gift icon = header's bottom edge

const ConfettiBurst = ({ play }) => {
  // Random direction, size, colour and spin per piece — fixed for this mount.
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => {
        const angle = Math.PI * (1.05 + Math.random() * 0.9); // upward fan, ~190°..350°
        const power = 70 + Math.random() * 70;
        const square = i % 3 === 0;
        return {
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          w: square ? 7 : 6,
          h: square ? 7 : 12,
          upX: Math.cos(angle) * power * 1.3,
          upY: Math.sin(angle) * power,
          fallX: Math.cos(angle) * power * 1.6 + (Math.random() - 0.5) * 40,
          fallY: 180 + Math.random() * 160,
          spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
          delay: Math.random() * 120,
          duration: 1800 + Math.random() * 700,
          anim: new Animated.Value(0),
        };
      }),
    []
  );

  useEffect(() => {
    if (!play) return;
    const runs = pieces.map((p) => {
      p.anim.setValue(0);
      return Animated.timing(p.anim, {
        toValue: 1,
        duration: p.duration,
        delay: 150 + p.delay,
        easing: Easing.linear,
        useNativeDriver: true,
      });
    });
    const all = Animated.parallel(runs);
    all.start();
    return () => all.stop();
  }, [play, pieces]);

  return (
    <View pointerEvents="none" style={s.confetti}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            top: BURST_ORIGIN_Y - p.h / 2,
            width: p.w,
            height: p.h,
            borderRadius: 1.5,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.05, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              // Fast burst up/out for the first 25%, then a slow drift down.
              { translateX: p.anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, p.upX, p.fallX] }) },
              { translateY: p.anim.interpolate({ inputRange: [0, 0.25, 0.4, 1], outputRange: [0, p.upY, p.upY + 10, p.fallY] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] }) },
              // Paper "flip" flutter.
              { scaleX: p.anim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.2, 1, 0.2, 1] }) },
            ],
          }}
        />
      ))}
    </View>
  );
};

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
            {isSilver ? (
              <Text style={s.message}>
                <Text style={[s.metal, { color: t.accent }]}>Zero Making Charges + 100% GST</Text>
                {" "}Covered by OXYGOLD.AI on your{" "}
                <Text style={[s.metal, { color: t.accent }]}>{metalName} Purchase</Text>
              </Text>
            ) : (
              <Text style={s.message}>
                OXYGOLD.AI pays 100% GST on your{" "}
                <Text style={[s.metal, { color: t.accent }]}>{metalName} Purchase</Text>
              </Text>
            )}

            <View style={[s.breakdown, { backgroundColor: t.soft }]}>
              {isSilver && (
                <>
                  <View style={s.row}>
                    <Text style={s.rowLabel}>Making Charges</Text>
                    <Text style={s.waiverLabel}>₹0 (FREE)</Text>
                  </View>
                  <View style={s.divider} />
                </>
              )}
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

          {/* On top of the card content; touches pass through. */}
          <ConfettiBurst play={visible} />
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
  // Confetti layer covers the whole card, centred on the gift icon.
  confetti: { ...StyleSheet.absoluteFillObject, alignItems: "center" },
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
