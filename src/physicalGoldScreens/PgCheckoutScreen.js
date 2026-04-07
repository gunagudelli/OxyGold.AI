/**
 * Physical Gold Checkout Screen
 * UI updated to match PgCartScreen design system exactly.
 * No functional changes — only styles updated.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { selectUserId, selectAccessToken } from "../store/authSlice";
import PgLayout from "../../components/physical/PgLayout";
import {
  getUserProfile,
  getUserAddresses,
  getWalletBalance,
  createOrder,
  confirmOrder,
} from "./physicalGoldApi";

// ─── Design Tokens (mirrors PgCartScreen exactly) ────────────────────────────
const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  gold: "#C8952A",
  goldLight: "#F5ECD7",
  goldMid: "#E8C97A",
  goldDim: "rgba(200,149,42,0.10)",
  goldDimBorder: "rgba(200,149,42,0.25)",
  navy: "#1C2340",
  navyMid: "#3D4463",
  navyLight: "#8891AF",
  green: "#0E9F6E",
  greenBg: "#ECFDF5",
  greenBorder: "#A7F3D0",
  red: "#E02424",
  redBg: "#FEF2F2",
  redBorder: "#FECACA",
  border: "#EAE8E2",
  divider: "#F0EEE9",
  surfaceAlt: "#F7F6F3",
  grey: "#e7e7da",
  warn: "#D97706",
  warnBg: "#FFFBEB",
  warnBorder: "#FDE68A",
};

// ─── Shimmer (same as PgCartScreen) ──────────────────────────────────────────
const ShimmerBox = ({ width, height, borderRadius = 8 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: C.goldMid,
        opacity,
      }}
    />
  );
};

// ─── Section Header (same as PgCartScreen) ───────────────────────────────────
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ─── Skeleton loader (same pattern as PgCartScreen) ──────────────────────────
const SkeletonBlock = ({ height = 80 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  return (
    <Animated.View
      style={{
        height,
        borderRadius: 14,
        backgroundColor: C.goldMid,
        opacity,
        marginBottom: 12,
      }}
    />
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PgCheckoutScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const { cartTotal, cartItems } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMode, setPaymentMode] = useState("CASHFREE");
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletExists, setWalletExists] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useFocusEffect(
    useCallback(() => {
      loadCheckoutData();
    }, [userId]),
  );

  const loadCheckoutData = async () => {
    if (!userId) return;
    setLoading(true);
    const startTime = Date.now();
    try {
      const [profileRes, addrRes, walletRes] = await Promise.allSettled([
        getUserProfile(userId),
        getUserAddresses(userId),
        getWalletBalance(userId),
      ]);

      if (profileRes.status === "fulfilled") {
        const p =
          profileRes.value?.body ||
          profileRes.value?.data?.body ||
          profileRes.value?.data ||
          profileRes.value;
        setProfileComplete(!!p?.firstName);
      }

      if (addrRes.status === "fulfilled") {
        const list = (addrRes.value || []).map((a) => ({
          id: String(a.id),
          type: a.type || "Home",
          flatNo: a.flatNo || "",
          landMark: a.landMark || "",
          address: a.address || "",
          pinCode: a.pinCode || "",
          state: a.state || "",
        }));
        setAddresses(list);
        if (list.length > 0) setSelectedAddressId(list[0].id);
      }

      if (walletRes.status === "fulfilled") {
        setWalletBalance(walletRes.value?.balance || 0);
        setWalletExists(true);
      }
    } catch (err) {
      console.error("[Checkout] loadCheckoutData error:", err.message);
    } finally {
      const elapsed = Date.now() - startTime;
      const wait = Math.max(0, 1500 - elapsed);
      setTimeout(() => {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }, wait);
    }
  };

  const handlePay = async () => {
    if (!accessToken) {
      Alert.alert("Session Expired", "Please login again", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
      return;
    }
    if (!profileComplete) {
      Alert.alert(
        "Complete Your Profile",
        "Please add your name before placing an order.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Profile",
            onPress: () => navigation.navigate("PgProfile"),
          },
        ],
      );
      return;
    }
    if (!selectedAddressId) {
      Alert.alert("Select Address", "Please select a delivery address");
      return;
    }
    if (!cartItems || cartItems.length === 0) {
      Alert.alert(
        "Empty Cart",
        "Your cart is empty. Please add items to cart first.",
        [{ text: "OK", onPress: () => navigation.navigate("PgCart") }],
      );
      return;
    }
    if (paymentMode === "WALLET" && walletBalance < cartTotal) {
      Alert.alert(
        "Insufficient Balance",
        `Your wallet balance ₹${walletBalance} is less than ₹${cartTotal}. Please use Online Payment.`,
        [
          {
            text: "Use Online Payment",
            onPress: () => setPaymentMode("CASHFREE"),
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }
    Alert.alert(
      "Confirm Order",
      `Are you sure you want to place this order?\n\nTotal Amount: ₹${Number(cartTotal || 0).toLocaleString("en-IN")}\nPayment: ${paymentMode}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm Order", onPress: () => processOrder() },
      ],
    );
  };

  const processOrder = async () => {
    setCheckoutLoading(true);
    try {
      const orderPayload = {
        userId: Number(userId),
        addressId: Number(selectedAddressId),
        notes: "Physical Gold Order",
        paymentMode,
        returnUrl: `https://app.oxygold.com/physical-gold/payment-status`,
      };
      const orderRes = await createOrder(orderPayload);
      if (!orderRes) throw new Error("Failed to create order");

      const orderId = orderRes?.orderId || orderRes?.id;
      const orderNumber = orderRes?.orderNumber;
      const txnId = orderRes?.txnId;
      const paymentSessionId = orderRes?.paymentSessionId;
      const totalAmount = orderRes?.totalAmount;

      await confirmOrder(orderId);

      if (paymentMode === "CASHFREE") {
        navigation.navigate("PgPaymentHandler", {
          orderId,
          orderNumber,
          txnId,
          paymentSessionId,
          totalAmount,
          paymentMode,
        });
      } else {
        navigation.navigate("PgPaymentStatus", {
          orderId,
          orderNumber,
          txnId,
          paymentMode,
          totalAmount,
        });
      }
    } catch (err) {
      console.error("[Checkout Error]", err.message);
      let errorMessage = err.message || "Please try again";
      if (err.message === "Resource not found.") {
        errorMessage =
          "Unable to create order. Your cart may be empty. Please add items to cart and try again.";
      } else if (err.message === "SESSION_EXPIRED") {
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: () => navigation.replace("Login") },
        ]);
        return;
      }
      Alert.alert("Checkout Failed", errorMessage);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <PgLayout title="Checkout" showBack onBack={() => navigation.goBack()}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={{ paddingTop: 4 }}>
            <ShimmerBox width="40%" height={13} />
            <View style={{ height: 14 }} />
            <SkeletonBlock height={90} />
            <SkeletonBlock height={90} />
            <View style={{ height: 8 }} />
            <ShimmerBox width="40%" height={13} />
            <View style={{ height: 14 }} />
            <SkeletonBlock height={100} />
            <View style={{ height: 8 }} />
            <ShimmerBox width="40%" height={13} />
            <View style={{ height: 14 }} />
            <SkeletonBlock height={140} />
          </View>
        </ScrollView>
      </PgLayout>
    );
  }

  return (
    <PgLayout title="Checkout" showBack onBack={() => navigation.goBack()}>
      <View style={styles.root}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Profile Warning ── */}
          {!profileComplete && (
            <TouchableOpacity
              style={styles.warningBox}
              onPress={() => navigation.navigate("PgProfile")}
              activeOpacity={0.85}
            >
              <Ionicons name="warning" size={15} color={C.warn} />
              <Text style={styles.warningText}>
                Profile incomplete — tap to complete your profile.
              </Text>
              <Ionicons name="chevron-forward" size={15} color={C.warn} />
            </TouchableOpacity>
          )}

          {/* ── Delivery Address ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <SectionHeader title="DELIVERY ADDRESS" />
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("PgProfile", { tab: "address" })
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.manageText}>+ Manage</Text>
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyAddressBox}
                onPress={() =>
                  navigation.navigate("PgProfile", { tab: "address" })
                }
                activeOpacity={0.8}
              >
                <View style={styles.emptyAddressIcon}>
                  <Ionicons name="location-outline" size={20} color={C.gold} />
                </View>
                <Text style={styles.emptyAddressText}>
                  No addresses found. Add one →
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addressList}>
                {addresses.map((addr, index) => {
                  const selected = selectedAddressId === addr.id;
                  return (
                    <View key={addr.id}>
                      <TouchableOpacity
                        style={[
                          styles.addressCard,
                          selected && styles.addressCardSelected,
                        ]}
                        onPress={() => setSelectedAddressId(addr.id)}
                        activeOpacity={0.8}
                      >
                        {/* Icon */}
                        <View
                          style={[
                            styles.addrIconBox,
                            selected && styles.addrIconBoxSelected,
                          ]}
                        >
                          <Ionicons
                            name="location"
                            size={14}
                            color={selected ? "#fff" : C.navyLight}
                          />
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <View style={styles.addrTopRow}>
                            <View style={styles.addrTypeChip}>
                              <Text
                                style={[
                                  styles.addrTypeText,
                                  selected && { color: C.gold },
                                ]}
                              >
                                {addr.type}
                              </Text>
                            </View>
                            {selected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={14}
                                color={C.green}
                              />
                            )}
                          </View>
                          <Text style={styles.addrMainText} numberOfLines={2}>
                            {addr.address}
                          </Text>
                          {addr.landMark || addr.flatNo ? (
                            <Text style={styles.addrSubText}>
                              {[addr.landMark, addr.flatNo]
                                .filter(Boolean)
                                .join(", ")}
                            </Text>
                          ) : null}
                          <Text style={styles.addrPinText}>
                            {addr.state} — {addr.pinCode}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {index < addresses.length - 1 && (
                        <View style={styles.itemDivider} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Payment Method ── */}
          <View style={styles.card}>
            <SectionHeader title="PAYMENT METHOD" />

            <View style={styles.paymentRow}>
              {walletExists && (
                <TouchableOpacity
                  style={[
                    styles.payCard,
                    paymentMode === "WALLET" && styles.payCardSelected,
                  ]}
                  onPress={() => setPaymentMode("WALLET")}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.payIconBox,
                      paymentMode === "WALLET" && styles.payIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name="wallet"
                      size={18}
                      color={paymentMode === "WALLET" ? "#fff" : C.navyLight}
                    />
                  </View>
                  <Text
                    style={[
                      styles.payLabel,
                      paymentMode === "WALLET" && styles.payLabelSelected,
                    ]}
                  >
                    Wallet
                  </Text>
                  <Text
                    style={[
                      styles.paySub,
                      walletBalance >= cartTotal
                        ? { color: C.green }
                        : { color: C.red },
                    ]}
                  >
                    ₹{Number(walletBalance).toLocaleString("en-IN")}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      paymentMode === "WALLET" && styles.radioSelected,
                    ]}
                  >
                    {paymentMode === "WALLET" && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.payCard,
                  paymentMode === "CASHFREE" && styles.payCardSelected,
                  !walletExists && { flex: 1 },
                ]}
                onPress={() => setPaymentMode("CASHFREE")}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.payIconBox,
                    paymentMode === "CASHFREE" && styles.payIconBoxSelected,
                  ]}
                >
                  <Ionicons
                    name="card"
                    size={18}
                    color={paymentMode === "CASHFREE" ? "#fff" : C.navyLight}
                  />
                </View>
                <Text
                  style={[
                    styles.payLabel,
                    paymentMode === "CASHFREE" && styles.payLabelSelected,
                  ]}
                >
                  Online Payment
                </Text>
                <Text style={styles.paySub}>UPI / Cards / Net Banking</Text>
                <View
                  style={[
                    styles.radio,
                    paymentMode === "CASHFREE" && styles.radioSelected,
                  ]}
                >
                  {paymentMode === "CASHFREE" && (
                    <View style={styles.radioDot} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Insufficient wallet warning */}
            {paymentMode === "WALLET" && walletBalance < cartTotal && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={14} color={C.warn} />
                <Text style={styles.warningText}>
                  Insufficient balance. Switch to Online Payment.
                </Text>
              </View>
            )}
          </View>

          {/* ── Order Summary — gold card matching PgCartScreen summaryCard ── */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRing1} />
            <View style={styles.summaryRing2} />

            <SectionHeader title="ORDER SUMMARY" />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Items</Text>
              <Text style={styles.specValue}>
                {cartItems?.length || 0} item
                {cartItems?.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.specDivider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Delivery</Text>
              <Text style={styles.specFree}>FREE</Text>
            </View>
            <View style={styles.specDivider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Payment Method</Text>
              <Text style={styles.specValue}>
                {paymentMode === "CASHFREE" ? "Online Payment" : "Wallet"}
              </Text>
            </View>

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>
                ₹{Number(cartTotal || 0).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </Animated.ScrollView>

        {/* ── Footer (mirrors PgCartScreen footer exactly) ── */}
        <View style={styles.footer}>
          <View style={styles.footerMain}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerPriceLabel}>Payable Amount</Text>
              <Text style={styles.footerPriceValue}>
                ₹{Number(cartTotal || 0).toLocaleString("en-IN")}
              </Text>
              {cartItems?.length > 0 && (
                <Text style={styles.footerPriceSub}>
                  {cartItems.length} item{cartItems.length > 1 ? "s" : ""}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                (checkoutLoading || !selectedAddressId || !profileComplete) &&
                  styles.checkoutBtnDisabled,
              ]}
              disabled={
                checkoutLoading || !selectedAddressId || !profileComplete
              }
              activeOpacity={0.85}
              onPress={handlePay}
            >
              {checkoutLoading ? (
                <ActivityIndicator size="small" color={C.navy} />
              ) : (
                <Text style={styles.checkoutBtnText}>Place Order →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  // ── Section Header (same as PgCartScreen) ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.navyMid,
    letterSpacing: 0.5,
  },

  // ── Cards (same as PgCartScreen) ──
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    shadowColor: "rgba(181,183,190,0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manageText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.gold,
    marginBottom: 14,
  },

  // ── Warning box ──
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.warnBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.warnBorder,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: C.warn,
    fontWeight: "700",
    lineHeight: 18,
  },

  // ── Address ──
  addressList: { gap: 0 },
  itemDivider: { height: 1, backgroundColor: C.divider, marginVertical: 12 },

  emptyAddressBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.goldDimBorder,
    backgroundColor: C.goldDim,
  },
  emptyAddressIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.goldLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.goldMid,
  },
  emptyAddressText: { fontSize: 13, color: C.navyMid, fontWeight: "600" },

  addressCard: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  addressCardSelected: {},

  addrIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    alignSelf: "flex-start",
  },
  addrIconBoxSelected: { backgroundColor: C.gold, borderColor: C.gold },

  addrTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  addrTypeChip: {
    backgroundColor: C.goldDim,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.goldDimBorder,
  },
  addrTypeText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.gold,
    letterSpacing: 0.8,
  },
  addrMainText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navy,
    lineHeight: 18,
    marginBottom: 3,
  },
  addrSubText: { fontSize: 11, color: C.navyLight, marginBottom: 3 },
  addrPinText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.navyLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Payment ──
  paymentRow: { flexDirection: "row", gap: 10 },
  payCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  payCardSelected: {
    borderColor: C.gold,
    borderWidth: 1.5,
    backgroundColor: C.goldLight,
  },
  payIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 2,
  },
  payIconBoxSelected: { backgroundColor: C.gold, borderColor: C.gold },
  payLabel: { fontSize: 12, fontWeight: "800", color: C.navy },
  payLabelSelected: { color: C.gold },
  paySub: {
    fontSize: 10,
    color: C.navyLight,
    fontWeight: "500",
    textAlign: "center",
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  radioSelected: { borderColor: C.gold },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },

  // ── Summary Card (matches PgCartScreen summaryCard) ──
  summaryCard: {
    backgroundColor: C.goldLight,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.goldMid,
    overflow: "hidden",
  },
  summaryRing1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(232,201,122,0.07)",
    top: -35,
    right: 16,
  },
  summaryRing2: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.10)",
    right: 90,
    bottom: -24,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    zIndex: 1,
  },
  specDivider: {
    height: 1,
    backgroundColor: "rgba(200,149,42,0.15)",
    zIndex: 1,
  },
  specLabel: { fontSize: 13, color: C.navyLight },
  specValue: { fontSize: 13, fontWeight: "700", color: C.navy },
  specFree: { fontSize: 13, fontWeight: "800", color: C.green },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.goldMid,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: "800", color: C.navy },
  grandTotalValue: { fontSize: 22, fontWeight: "900", color: C.gold },

  // ── Footer (mirrors PgCartScreen footer exactly) ──
  footer: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    paddingBottom: 22,
  },
  footerMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 16,
  },
  footerLeft: { flex: 1 },
  footerPriceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.navyLight,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  footerPriceValue: {
    fontSize: 22,
    fontWeight: "900",
    color: C.navy,
    letterSpacing: -0.5,
  },
  footerPriceSub: { fontSize: 11, color: C.navyLight, marginTop: 2 },

  checkoutBtn: {
    backgroundColor: C.gold,
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 22,
    minWidth: 155,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  checkoutBtnDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1C2340",
    letterSpacing: 0.3,
  },
});

export default PgCheckoutScreen;
