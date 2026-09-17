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
import { selectUserId, selectAccessToken } from "../../store/authSlice";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import {
  getUserProfile,
  getUserAddresses,
  createOrder,
  deleteAddress,
  getCart,
} from "../api/physicalGoldApi";

// ─── Design Tokens (mirrors PgCartScreen exactly) ────────────────────────────
const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#0E6B57",
  goldLight: "#F7F4ED",
  goldMid: "#2FA085",
  goldDim: "rgba(14,107,87,0.10)",
  goldDimBorder: "rgba(14,107,87,0.25)",
  navy: "#1C1C1E",
  navyMid: "#48484C",
  navyLight: "#7A7A80",
  green: "#1F8A4C",
  greenBg: "#E8F5E9",
  greenBorder: "#E8F5E9",
  red: "#C0392B",
  redBg: "#FDECEA",
  redBorder: "#FDECEA",
  border: "#E7E0DA",
  divider: "#EEEBE8",
  surfaceAlt: "#FFFFFF",
  grey: "#E7E0DA",
  warn: "#D4A574",
  warnBg: "#FDF6ED",
  warnBorder: "#D4A574",
};

// ─── Section Header (same as PgCartScreen) ───────────────────────────────────
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PgCheckoutScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const { cartTotal: routeCartTotal, cartItems: routeCartItems } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const hadAddressesRef = useRef(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  // COD or online payment (Cashfree — UPI/Cards/Net Banking), matching web.
  const [paymentMode, setPaymentMode] = useState("COD");
  const [profileComplete, setProfileComplete] = useState(false);
  
  // Store cart data in state so it persists when navigating back
  const [cartTotal, setCartTotal] = useState(routeCartTotal || 0);
  const [cartItems, setCartItems] = useState(routeCartItems || []);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartGst, setCartGst] = useState(0);
  const [cartMaking, setCartMaking] = useState(0);

  // Distance-based delivery — same as PgCartScreen: recomputed by the
  // backend whenever we pass the currently-selected address's id, so this
  // updates automatically if the user switches addresses.
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState(null);
  const [ratePerKm, setRatePerKm] = useState(null);

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
      const [profileRes, addrRes, cartRes] = await Promise.allSettled([
        getUserProfile(userId),
        getUserAddresses(userId),
        getCart(userId),
      ]);

      if (profileRes.status === "fulfilled") {
        const p =
          profileRes.value?.body ||
          profileRes.value?.data?.body ||
          profileRes.value?.data ||
          profileRes.value;
        
        const hasFirstName = !!p?.firstName;
        const hasLastName = !!p?.lastName;
        const hasEmail = !!p?.email;
        const isComplete = hasFirstName && hasLastName && hasEmail;
        
        setProfileComplete(isComplete);
        
        if (!isComplete) {
          Alert.alert(
            "Profile Incomplete",
            "Please complete your profile to proceed with checkout.",
            [{ text: "OK" }]
          );
        }
      }

      if (addrRes.status === "fulfilled") {
        const list = (addrRes.value || []).map((a) => ({
          id: String(a.id),
          type: a.type || "Home",
          flatNo: a.flatNo || "",
          landMark: a.landMark || "",
          address: a.address || "",
          city: a.city || "",
          area: a.area || "",
          pinCode: a.pincode || a.pinCode || "",
          state: a.state || "",
          latitude: a.latitude || "",
          longitude: a.longitude || "",
        }));

        if (list.length > 0) {
          hadAddressesRef.current = true;
          setAddresses(list);
          // Same "preferred default" as PgCartScreen — the first address that
          // actually has coordinates, not just list[0] — so both screens
          // compute delivery against the same address and show the same total.
          setSelectedAddressId((prev) => {
            if (prev && list.some((a) => a.id === prev)) return prev;
            const preferred = list.find((a) => a.latitude && a.longitude) || list[0];
            return preferred.id;
          });
        } else if (!hadAddressesRef.current) {
          // Only a genuinely new user (never had addresses loaded) hits the
          // empty-state prompt — a refetch that transiently returns empty
          // right after checkout must not wipe an already-known-good list.
          setAddresses([]);
          Alert.alert(
            "No Address Found",
            "Please add a delivery address to proceed with checkout.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("PgAddress", { userId, returnTo: "PgCheckout" })
              }
            ]
          );
        } else {
          console.log("[Checkout] Address refetch returned empty while a known list existed — keeping the existing list.");
        }
      }

      // Fetch cart data from API
      if (cartRes.status === "fulfilled") {
        const cart = cartRes.value;
        console.log('========================================');
        console.log('[Checkout] Cart Data from API');
        console.log('[Checkout] Cart:', JSON.stringify(cart, null, 2));
        console.log('[Checkout] Total Items:', cart?.totalItemsInCart);
        console.log('[Checkout] Total Amount:', cart?.totalPayableAmount);
        console.log('========================================');
        
        setCartItems(cart?.itemsInCart || []);
        setCartTotal(cart?.totalPayableAmount || 0);
        setCartSubtotal(cart?.totalCartValue || 0);
        setCartGst(cart?.totalGstCharges || 0);
        setCartMaking(cart?.totalMakingCharges || 0);
        setDeliveryFee(cart?.deliveryFee || 0);
        setDeliveryDistanceKm(cart?.deliveryDistanceKm ?? null);
        setRatePerKm(cart?.ratePerKm ?? null);
      } else if (routeCartTotal && routeCartItems) {
        // Fallback to route params if API fails
        console.log('[Checkout] Using cart data from route params');
        setCartItems(routeCartItems);
        setCartTotal(routeCartTotal);
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

  // Re-fetches the cart with the selected address's id so delivery fee/km
  // stay correct — runs once selectedAddressId is first known, and again
  // whenever the user picks a different saved address.
  useEffect(() => {
    if (!userId || !selectedAddressId) return;
    getCart(userId, selectedAddressId)
      .then((cart) => {
        setCartItems(cart?.itemsInCart || []);
        setCartTotal(cart?.totalPayableAmount || 0);
        setCartSubtotal(cart?.totalCartValue || 0);
        setCartGst(cart?.totalGstCharges || 0);
        setCartMaking(cart?.totalMakingCharges || 0);
        setDeliveryFee(cart?.deliveryFee || 0);
        setDeliveryDistanceKm(cart?.deliveryDistanceKm ?? null);
        setRatePerKm(cart?.ratePerKm ?? null);
      })
      .catch(() => {});
  }, [userId, selectedAddressId]);

  const handleDeleteAddress = async (addressId) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingAddressId(addressId);
            try {
              await deleteAddress(userId, addressId);
              
              // Remove from local state
              const updatedAddresses = addresses.filter(a => a.id !== addressId);
              setAddresses(updatedAddresses);
              
              // If deleted address was selected, select first remaining address
              if (selectedAddressId === addressId) {
                setSelectedAddressId(updatedAddresses.length > 0 ? updatedAddresses[0].id : null);
              }
              
              Alert.alert("Success", "Address deleted successfully");
            } catch (error) {
              Alert.alert("Error", error?.message || "Failed to delete address");
            } finally {
              setDeletingAddressId(null);
            }
          },
        },
      ],
    );
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
        "Please fill your profile details before placing an order.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Profile",
            onPress: () => navigation.navigate("PgProfile", { returnTo: "PgCheckout" }),
          },
        ],
      );
      return;
    }
    if (!selectedAddressId) {
      Alert.alert(
        "Add Delivery Address",
        "Please add a delivery address to continue.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add Address",
            onPress: () => navigation.navigate("PgAddress", { userId, returnTo: "PgCheckout" }),
          },
        ],
      );
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
    Alert.alert(
      "Confirm Order",
      `Are you sure you want to place this order?\n\nTotal Amount: ₹${Number(cartTotal || 0).toLocaleString("en-IN")}\nPayment: ${paymentMode === "COD" ? "Cash on Delivery" : "Online Payment"}`,
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
      };
      const orderRes = await createOrder(orderPayload);
      if (!orderRes) throw new Error("Failed to create order");

      const orderId = orderRes?.orderId || orderRes?.id;
      const orderNumber = orderRes?.orderNumber;
      const txnId = orderRes?.txnId;
      const totalAmount = orderRes?.totalAmount;

      if (paymentMode === "CASHFREE") {
        // Online payment — hand off to the Cashfree SDK screen; it verifies
        // via webhook and generates the invoice once payment completes.
        navigation.navigate("PgPaymentHandler", {
          orderId,
          orderNumber,
          txnId,
          paymentSessionId: orderRes?.paymentSessionId,
          totalAmount,
          paymentMode,
        });
        return;
      }

      // COD orders are auto-confirmed by the backend on creation — calling
      // confirmOrder here is rejected with "Order already confirmed", so
      // it's skipped entirely.
      navigation.navigate("PgPaymentStatus", {
        orderId,
        orderNumber,
        txnId,
        paymentMode,
        totalAmount,
      });
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
      } else if (/pin ?code/i.test(err.message || "")) {
        // Backend rejects orders for an address that's missing/invalid a PIN
        // code — send the user straight to fix it instead of leaving them
        // stuck on a bare error.
        Alert.alert(
          "Address Needs a PIN Code",
          "The selected address is missing a valid PIN code. Please update it to continue.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Fix Address",
              onPress: () => navigation.navigate("PgAddress", { userId, returnTo: "PgCheckout" }),
            },
          ],
        );
        setCheckoutLoading(false);
        return;
      }
      Alert.alert("Checkout Failed", errorMessage);
      // Only re-enable the button on failure — on success we're navigating
      // away, and clearing the flag here would briefly re-enable it before
      // the transition completes, opening a double-submit window.
      setCheckoutLoading(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <PgLayout title="Checkout" showBack onBack={() => navigation.goBack()}>
        <PgLoader label="Loading checkout..." />
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
              onPress={() => navigation.navigate("PgProfile", { returnTo: "PgCheckout" })}
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
                  navigation.navigate("PgAddress", { userId, returnTo: "PgCheckout" })
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
                  navigation.navigate("PgAddress", { userId, returnTo: "PgCheckout" })
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
                {(showAllAddresses ? addresses : addresses.slice(0, 2)).map((addr, index, arr) => {
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
                                  selected && { color: C.navy },
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
                            {[addr.flatNo, addr.address].filter(Boolean).join(", ")}
                          </Text>
                          {addr.landMark ? (
                            <Text style={styles.addrSubText}>Near {addr.landMark}</Text>
                          ) : null}
                          {(addr.area || addr.city) ? (
                            <Text style={styles.addrSubText}>
                              {[addr.area, addr.city].filter(Boolean).join(", ")}
                            </Text>
                          ) : null}
                          <Text style={styles.addrPinText}>
                            {addr.state} — {addr.pinCode}
                          </Text>
                        </View>
                        
                        {/* Delete Button */}
                        <TouchableOpacity
                          style={styles.deleteAddrBtn}
                          onPress={() => handleDeleteAddress(addr.id)}
                          disabled={deletingAddressId === addr.id}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {deletingAddressId === addr.id ? (
                            <ActivityIndicator size="small" color={C.red} />
                          ) : (
                            <Ionicons name="trash-outline" size={18} color={C.red} />
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                      {index < arr.length - 1 && (
                        <View style={styles.itemDivider} />
                      )}
                    </View>
                  );
                })}
                
                {/* Show More/Less Button */}
                {addresses.length > 2 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllAddresses(!showAllAddresses)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllAddresses
                        ? "Show Less"
                        : `Show ${addresses.length - 2} More Address${addresses.length - 2 > 1 ? "es" : ""}`}
                    </Text>
                    <Ionicons
                      name={showAllAddresses ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={C.gold}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ── Payment Method ── */}
          <View style={styles.card}>
            <SectionHeader title="PAYMENT METHOD" />

            {[
              { id: "COD", icon: "cash-outline", label: "Cash on Delivery", sub: "Pay at your doorstep" },
              { id: "CASHFREE", icon: "card-outline", label: "Online Payment", sub: "UPI, Cards, Net Banking" },
            ].map((opt, i) => {
              const selected = paymentMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.codRow, !selected && styles.codRowUnselected, i > 0 && { marginTop: 10 }]}
                  onPress={() => setPaymentMode(opt.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.payIconBoxSelected, !selected && styles.payIconBoxUnselected]}>
                    <Ionicons name={opt.icon} size={18} color={selected ? "#fff" : C.navyLight} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payLabelSelected}>{opt.label}</Text>
                    <Text style={styles.paySub}>{opt.sub}</Text>
                  </View>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={selected ? C.gold : C.border}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Order Summary — gold card matching PgCartScreen summaryCard ── */}
          <View style={styles.summaryCard}>
            <SectionHeader title="ORDER SUMMARY" />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>
                Subtotal ({cartItems?.length || 0} item{cartItems?.length !== 1 ? "s" : ""})
              </Text>
              <Text style={styles.specValue}>
                ₹{Number(cartSubtotal || 0).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.specDivider} />

            {cartMaking > 0 && (
              <>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Making Charges</Text>
                  <Text style={styles.specValue}>
                    ₹{Number(cartMaking).toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.specDivider} />
              </>
            )}

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>GST (3%)</Text>
              <Text style={styles.specValue}>
                ₹{Number(cartGst || 0).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.specDivider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>
                Delivery{deliveryDistanceKm !== null ? ` (${deliveryDistanceKm} km)` : ""}
              </Text>
              <Text style={styles.specValue}>
                ₹{Number(deliveryFee || 0).toLocaleString("en-IN")}
              </Text>
            </View>
            {ratePerKm !== null && deliveryDistanceKm !== null && (
              <Text style={styles.deliveryRateNote}>₹{ratePerKm}/km delivery rate</Text>
            )}
            <View style={styles.specDivider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Insurance</Text>
              <Text style={styles.specValue}>Included</Text>
            </View>
            <View style={styles.specDivider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Payment Method</Text>
              <Text style={styles.specValue}>
                {paymentMode === "COD" ? "Cash on Delivery" : "Online Payment"}
              </Text>
            </View>

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.checkoutBtnText}>Place Order</Text>
                  <Ionicons name="arrow-forward" size={15} color="#fff" style={{ marginLeft: 6 }} />
                </>
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: C.navy,
  },

  // ── Cards ──
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(34,30,28,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manageText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.navyMid,
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
    alignSelf: "flex-start",
  },
  addrIconBoxSelected: { backgroundColor: C.gold },

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
    fontWeight: "700",
    color: C.navyMid,
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

  // Delete Address Button
  deleteAddrBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.redBg,
    borderWidth: 1,
    borderColor: C.redBorder,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  // Show More Button
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldDimBorder,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.navy,
  },

  // ── Payment — COD or Online (Cashfree) ──
  codRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.gold,
    backgroundColor: C.goldLight,
    padding: 14,
  },
  codRowUnselected: {
    borderColor: C.border,
    backgroundColor: C.card,
  },
  payIconBoxSelected: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  payIconBoxUnselected: { backgroundColor: C.grey },
  payLabelSelected: { fontSize: 13, fontWeight: "700", color: C.navy, marginBottom: 2 },
  paySub: {
    fontSize: 11,
    color: C.navyLight,
    fontWeight: "500",
  },

  // ── Summary Card (matches PgCartScreen summaryCard) ──
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
  },
  specDivider: {
    height: 1,
    backgroundColor: C.divider,
  },
  specLabel: { fontSize: 13, color: C.navyLight },
  specValue: { fontSize: 13, fontWeight: "700", color: C.navy },
  specFree: { fontSize: 13, fontWeight: "600", color: C.green },
  deliveryRateNote: { fontSize: 10.5, color: C.navyLight, textAlign: "right", marginTop: -3, marginBottom: 6 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: "700", color: C.navy },
  grandTotalValue: { fontSize: 20, fontWeight: "700", color: C.green },

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
    fontWeight: "700",
    color: C.green,
    letterSpacing: -0.5,
  },
  footerPriceSub: { fontSize: 11, color: C.navyLight, marginTop: 2 },

  checkoutBtn: {
    flexDirection: "row",
    backgroundColor: C.gold,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 22,
    minWidth: 155,
    justifyContent: "center",
    alignItems: "center",
  },
  checkoutBtnDisabled: { backgroundColor: C.border },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});

export default PgCheckoutScreen;
