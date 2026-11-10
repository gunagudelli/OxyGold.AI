import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// "Apply Coupon" bottom sheet — same content as the oxygold.ai web cart's
// coupons modal: a code input on top, then every available coupon with its
// offer, min. purchase, category, validity/countdown and an Apply button.

// Same calm palette as the checkout (ASKOXY.AI payment-screen colours).
const C = {
  purple: "#503189",
  purpleTint: "#F4F0FA",
  navy: "#333333",
  navyMid: "#555555",
  muted: "#757575",
  border: "#E0E0E0",
  green: "#503189", // savings/offer text in purple, not bright green
  greenBg: "#F4F0FA",
  red: "#E53935",
};

// Backend sends LocalDateTime without a zone — treat it as UTC, like the web.
export const parseCouponDate = (value) => {
  if (!value) return null;
  let str = String(value);
  if (str.includes("T") && !str.endsWith("Z") && !str.includes("+") && !str.slice(10).includes("-")) {
    str += "Z";
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Estimated saving on the given amount (the backend's apply call is final).
export const estimateCouponSaving = (coupon, amount) => {
  if (!coupon) return 0;
  if (coupon.discountType === "PERCENTAGE") {
    const val = (Number(amount || 0) * Number(coupon.discountValue || 0)) / 100;
    const cap = Number(coupon.maximumDiscountAmount || 0);
    return Math.round(cap > 0 ? Math.min(val, cap) : val);
  }
  return Number(coupon.discountValue || 0);
};

export const couponOfferText = (coupon) =>
  coupon?.description ||
  (coupon?.discountType === "PERCENTAGE"
    ? `Get ${coupon.discountValue}% OFF${
        coupon.maximumDiscountAmount
          ? ` up to ₹${Number(coupon.maximumDiscountAmount).toLocaleString("en-IN")}`
          : ""
      }`
    : `Save ₹${Number(coupon?.discountValue || 0).toLocaleString("en-IN")} with this code`);

const Countdown = ({ endDateTime }) => {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const end = parseCouponDate(endDateTime);
    if (!end) return undefined;
    const tick = () => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) return setLabel("");
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const p = (n) => String(n).padStart(2, "0");
      setLabel(d > 0 ? `${d}d ${p(h)}h ${p(m)}m` : `${p(h)}h ${p(m)}m ${p(s)}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDateTime]);
  if (!label) return null;
  return (
    <View style={s.countdown}>
      <Ionicons name="time-outline" size={11} color="#E53935" />
      <Text style={s.countdownText}>Ends in {label}</Text>
    </View>
  );
};

const CouponCard = ({ coupon, amount, applied, applying, onApply, onRemove }) => {
  const minAmount = Number(coupon.minimumOrderAmount || 0);
  const applicable = Number(amount || 0) >= minAmount;
  const validTill = parseCouponDate(coupon.endDateTime);
  const category =
    coupon.categoryName ||
    (coupon.applyTo === "CATEGORY" ? `Category #${coupon.categoryId}` : "All Products");
  const saving = estimateCouponSaving(coupon, amount);

  return (
    <View style={[s.card, applied && s.cardApplied, !applicable && s.cardDisabled]}>
      <View style={s.cardTop}>
        <View style={s.codeStub}>
          <Text style={s.codeText}>{coupon.code}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName} numberOfLines={1}>
            {coupon.name || coupon.code}
          </Text>
          <Text style={s.offerText}>{couponOfferText(coupon)}</Text>
        </View>
      </View>

      {!!coupon.endDateTime && <Countdown endDateTime={coupon.endDateTime} />}

      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Ionicons name="cart-outline" size={12} color={C.muted} />
          <Text style={s.metaText}>
            Min. <Text style={s.metaBold}>₹{minAmount.toLocaleString("en-IN")}</Text>
          </Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="layers-outline" size={12} color={C.muted} />
          <Text style={s.metaText}>
            On <Text style={s.metaBold}>{category}</Text>
          </Text>
        </View>
        {validTill && (
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={C.muted} />
            <Text style={s.metaText}>
              Till{" "}
              <Text style={s.metaBold}>
                {validTill.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </Text>
          </View>
        )}
      </View>

      <View style={s.cardBottom}>
        {applicable ? (
          <Text style={s.saveText}>
            {saving > 0 ? `You save ₹${saving.toLocaleString("en-IN")}` : ""}
          </Text>
        ) : (
          <Text style={s.unlockText}>
            Add ₹{(minAmount - Number(amount || 0)).toLocaleString("en-IN")} more to unlock
          </Text>
        )}
        {applied ? (
          <TouchableOpacity style={[s.btn, s.btnApplied]} onPress={onRemove} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={14} color="#fff" />
            <Text style={s.btnText}>Applied</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.btn, !applicable && s.btnDisabled]}
            onPress={() => onApply(coupon.code)}
            disabled={!applicable || applying}
            activeOpacity={0.8}
          >
            {applying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[s.btnText, !applicable && s.btnTextDisabled]}>Apply</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const CouponsSheet = ({
  visible,
  onClose,
  coupons = [],
  loading = false,
  amount = 0,
  appliedCode,
  applyingCode,
  error,
  onApply,
  onRemove,
}) => {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");

  useEffect(() => {
    if (visible) setInput(appliedCode || "");
  }, [visible, appliedCode]);

  const typedIsApplied = !!appliedCode && input.trim().toUpperCase() === appliedCode;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Apply Coupon</Text>
              <Text style={s.subtitle}>Use a coupon code to get the best offer</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={C.navy} />
            </TouchableOpacity>
          </View>

          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Enter coupon code"
              placeholderTextColor={C.muted}
              value={input}
              onChangeText={(t) => setInput(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => input.trim() && !typedIsApplied && onApply(input)}
            />
            {typedIsApplied ? (
              <TouchableOpacity
                style={[s.inputBtn, { backgroundColor: C.red }]}
                onPress={() => {
                  onRemove();
                  setInput("");
                }}
              >
                <Text style={s.btnText}>REMOVE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.inputBtn, (!input.trim() || !!applyingCode) && { opacity: 0.45 }]}
                disabled={!input.trim() || !!applyingCode}
                onPress={() => onApply(input)}
              >
                {applyingCode && applyingCode === input.trim().toUpperCase() ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.btnText}>APPLY</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {!!error && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle" size={14} color={C.red} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Text style={s.listLabel}>Available Coupons</Text>
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator color={C.purple} style={{ marginVertical: 30 }} />
            ) : coupons.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="pricetag-outline" size={34} color="#C9C2BB" />
                <Text style={s.emptyText}>No coupons available right now</Text>
              </View>
            ) : (
              coupons.map((c) => (
                <CouponCard
                  key={c.id ?? c.code}
                  coupon={c}
                  amount={amount}
                  applied={appliedCode === c.code}
                  applying={applyingCode === c.code}
                  onApply={onApply}
                  onRemove={onRemove}
                />
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CouponsSheet;

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    marginBottom: 10,
  },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "600", color: C.navy },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 2 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 4,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.navy,
  },
  inputBtn: {
    backgroundColor: C.purple,
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errorText: { flex: 1, fontSize: 12, fontWeight: "500", color: C.red },

  listLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.navyMid,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 10,
  },

  card: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  cardApplied: { borderColor: C.purple, backgroundColor: "#F4F0FA" },
  cardDisabled: { backgroundColor: "#F7F7F9" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  codeStub: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.purple,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: C.purpleTint,
    minWidth: 84,
    alignItems: "center",
  },
  codeText: { fontSize: 13, fontWeight: "700", color: C.purple, letterSpacing: 0.8 },
  cardName: { fontSize: 14, fontWeight: "500", color: C.navy },
  offerText: { fontSize: 13, fontWeight: "600", color: C.green, marginTop: 2, lineHeight: 17 },

  countdown: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "#FDECEA",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  countdownText: { fontSize: 11, fontWeight: "700", color: "#E53935" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: C.muted },
  metaBold: { fontWeight: "600", color: C.navy },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEEEF3",
    borderStyle: "dashed",
  },
  saveText: { flex: 1, fontSize: 12, fontWeight: "600", color: C.green },
  unlockText: { flex: 1, fontSize: 12, fontWeight: "600", color: C.red },
  btn: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: C.purple,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
    minWidth: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  btnApplied: { backgroundColor: "#15803D" },
  btnDisabled: { backgroundColor: "#EEEEF3" },
  btnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  btnTextDisabled: { color: "#9E9E9E" },

  empty: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 13, color: C.muted, fontWeight: "500" },
});
