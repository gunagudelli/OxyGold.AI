import React, { useState, useEffect, useRef } from "react";
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
import { selectUserId, selectAccessToken } from "../store/authSlice";
import PgLayout from "../../components/physical/PgLayout";

const C = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EDE6",
  border: "#E8E3D8",
  gold: "#B8891A",
  goldLight: "#D4A82A",
  goldBright: "#F0CC5A",
  heroBase: "#1A1200",
  heroBorder: "rgba(212,175,55,0.30)",
  textPri: "#1A1508",
  textSec: "#6B6050",
  textTer: "#A89880",
  error: "#C0392B",
  errorBg: "#FEF2F2",
  success: "#1A7A4A",
};

// Skeleton shimmer for initial load
const SkeletonItem = () => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.skeletonItem, { opacity: anim }]}>
      <View style={styles.skeletonThumb} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: "70%" }]} />
        <View style={[styles.skeletonLine, { width: "45%", marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: "30%", marginTop: 8 }]} />
      </View>
    </Animated.View>
  );
};

const CardLabel = ({ text }) => (
  <View style={styles.cardLabelRow}>
    <View style={styles.cardLabelAccent} />
    <Text style={styles.cardLabel}>{text}</Text>
  </View>
);

const PgCartScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  // Per-item loading: { [cartId]: true/false }
  const [itemLoading, setItemLoading] = useState({});

  const [totalCartValue, setTotalCartValue] = useState(0);
  const [totalGstCharges, setTotalGstCharges] = useState(0);
  const [totalMakingCharges, setTotalMakingCharges] = useState(0);
  const [totalPayableAmount, setTotalPayableAmount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (userId) fetchCartData();
  }, [userId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (userId) fetchCartData();
    });
    return unsubscribe;
  }, [navigation, userId]);

  // Full page load (initial / refresh) — keeps loading state
  const fetchCartData = async (silent = false) => {
    if (!silent) setLoading(true);
    const startTime = Date.now();
    try {
      console.log(
        "[Cart Fetch] userId:",
        userId,
        "accessToken:",
        accessToken ? "present" : "missing",
      );
      const response = await fetch(
        `http://65.0.147.157:9900/api/cart/customer-cart-info?customerId=${userId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken || ""}` },
        },
      );
      const data = await response.json();
      console.log("[Cart API Full Response]", JSON.stringify(data, null, 2));

      if (response.ok) {
        const items = data?.itemsInCart || [];
        console.log("[Setting Cart Items]", items.length, "items");
        setCartItems(items);
        setTotalCartValue(data?.totalCartValue || 0);
        setTotalGstCharges(data?.totalGstCharges || 0);
        setTotalMakingCharges(data?.totalMakingCharges || 0);
        setTotalPayableAmount(data?.totalPayableAmount || 0);
      } else if (response.status === 404) {
        console.log("[Cart Empty] 404");
        setCartItems([]);
      } else {
        console.error("[Cart Fetch Error]", response.status, data);
        setCartItems([]);
      }
    } catch (err) {
      console.error("[Fetch Cart Exception]", err);
      setCartItems([]);
    } finally {
      const elapsed = Date.now() - startTime;
      const wait = silent ? 0 : Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }, wait);
    }
  };

  // Silent refresh after item action — only updates data, no full screen spinner
  const silentRefresh = async (cartId) => {
    try {
      const response = await fetch(
        `http://65.0.147.157:9900/api/cart/customer-cart-info?customerId=${userId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken || ""}` },
        },
      );
      const data = await response.json();
      if (response.ok) {
        setCartItems(data?.itemsInCart || []);
        setTotalCartValue(data?.totalCartValue || 0);
        setTotalGstCharges(data?.totalGstCharges || 0);
        setTotalMakingCharges(data?.totalMakingCharges || 0);
        setTotalPayableAmount(data?.totalPayableAmount || 0);
      } else if (response.status === 404) {
        setCartItems([]);
      }
    } catch (err) {
      console.error("[Silent Refresh Exception]", err);
    } finally {
      setItemLoading((prev) => ({ ...prev, [cartId]: false }));
    }
  };

  const setItemBusy = (cartId, busy) =>
    setItemLoading((prev) => ({ ...prev, [cartId]: busy }));

  const handleRemoveItem = (item) => {
    Alert.alert("Remove Item", `Remove ${item.productName} from cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: async () => {
          setItemBusy(item.cartId, true);
          try {
            const { cartId } = item;
            console.log("[Remove] cartId:", cartId, "userId:", userId);
            const response = await fetch(
              `http://65.0.147.157:9900/api/cart/${cartId}?userId=${userId}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken || ""}` },
              },
            );
            console.log("[Remove Item Response Status]", response.status);
            const responseData = await response.json();
            console.log("[Remove Item Response Data]", responseData);
            if (response.ok) {
              await silentRefresh(cartId);
            } else {
              setItemBusy(cartId, false);
            }
          } catch (err) {
            console.error("Remove error:", err);
            setItemBusy(item.cartId, false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  const handleIncrement = async (item) => {
    setItemBusy(item.cartId, true);
    try {
      const payload = {
        userId,
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: 1,
      };
      console.log("[Increment Payload]", JSON.stringify(payload, null, 2));
      const response = await fetch(
        "http://65.0.147.157:9900/api/cart/AddItemToCart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const responseData = await response.json();
      console.log("[Increment Response Status]", response.status);
      console.log("[Increment Response Data]", responseData);
      if (response.ok) {
        await silentRefresh(item.cartId);
      } else {
        setItemBusy(item.cartId, false);
      }
    } catch (err) {
      console.error("Increment error:", err);
      setItemBusy(item.cartId, false);
    }
  };

  const handleDecrement = async (item) => {
    if (item.quantity === 1) {
      console.log("[Decrement] Quantity is 1, removing item instead");
      handleRemoveItem(item);
      return;
    }
    setItemBusy(item.cartId, true);
    try {
      const { quantity, cartId, productId, productVariantId } = item;
      const payload = {
        userId,
        id: cartId,
        productId,
        productVariantId,
        quantity: 1,
      };
      console.log("[Decrement Payload]", JSON.stringify(payload, null, 2));
      const response = await fetch(
        "http://65.0.147.157:9900/api/cart/decrementCartItems",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const responseData = await response.json();
      console.log("[Decrement Response Status]", response.status);
      console.log("[Decrement Response Data]", responseData);
      if (response.ok) {
        await silentRefresh(cartId);
      } else {
        setItemBusy(cartId, false);
      }
    } catch (err) {
      console.error("Decrement error:", err);
      setItemBusy(item.cartId, false);
    }
  };

  const handleCheckout = async () => {
    if (!userId || !accessToken) {
      Alert.alert("Session Expired", "Please login again", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
      return;
    }
    navigation.navigate("PgCheckout", {
      cartTotal: totalPayableAmount,
      cartItems,
    });
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
        <View style={styles.skeletonWrapper}>
          <View style={styles.skeletonHeader} />
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </View>
      </PgLayout>
    );
  }

  // ── Empty state ──
  if (cartItems.length === 0) {
    return (
      <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Add gold products to get started
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate("PgHome")}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Browse Store</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  const subtotal =
    totalCartValue ||
    cartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const gstAmount = totalGstCharges || 0;
  const grandTotal = totalPayableAmount || subtotal + gstAmount;

  return (
    <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Items ── */}
          <View style={styles.section}>
            <CardLabel
              text={`${cartItems.length} ITEM${cartItems.length > 1 ? "S" : ""} IN CART`}
            />

            <View style={styles.itemsList}>
              {cartItems.map((item) => {
                const busy = !!itemLoading[item.cartId];
                return (
                  <View
                    key={item.cartId}
                    style={[styles.cartItem, busy && styles.cartItemBusy]}
                  >
                    {/* Busy overlay — only on this card */}
                    {busy && (
                      <View style={styles.itemBusyOverlay}>
                        <ActivityIndicator size="small" color={C.gold} />
                      </View>
                    )}

                    {/* 🗑 Remove — top-right corner */}
                    <TouchableOpacity
                      style={styles.removeCornerBtn}
                      onPress={() => handleRemoveItem(item)}
                      disabled={busy}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash" size={14} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Thumb */}
                    <View style={styles.itemThumb}>
                      <Text style={styles.itemThumbIcon}>🏆</Text>
                    </View>

                    {/* Info column */}
                    <View style={styles.itemInfo}>
                      {/* Name */}
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.productName}
                      </Text>

                      {/* Tags */}
                      <View style={styles.itemTagRow}>
                        {item.purity ? (
                          <View style={styles.itemTag}>
                            <Text style={styles.itemTagText}>
                              {item.purity}
                            </Text>
                          </View>
                        ) : null}
                        {item.size ? (
                          <View style={styles.itemTag}>
                            <Text style={styles.itemTagText}>{item.size}</Text>
                          </View>
                        ) : null}
                        {item.weight ? (
                          <View style={styles.itemTag}>
                            <Text style={styles.itemTagText}>
                              {item.weight}g
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Price + Qty + Total — single row */}
                      <View style={styles.itemFooterRow}>
                        {/* Unit price */}
                        <View style={styles.itemPriceBlock}>
                          <Text style={styles.itemPriceLabel}>Unit Price</Text>
                          <Text style={styles.itemPriceValue}>
                            ₹{item.price?.toLocaleString("en-IN") || "0"}
                          </Text>
                        </View>

                        {/* Divider */}
                        <View style={styles.itemFooterDivider} />

                        {/* Qty control */}
                        <View style={styles.qtyControl}>
                          <TouchableOpacity
                            style={[styles.qtyBtn, busy && styles.qtyBtnBusy]}
                            onPress={() => handleDecrement(item)}
                            disabled={busy}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyNum}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={[styles.qtyBtn, busy && styles.qtyBtnBusy]}
                            onPress={() => handleIncrement(item)}
                            disabled={busy}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.itemFooterDivider} />

                        {/* Line total */}
                        <View style={styles.lineTotalBlock}>
                          <Text style={styles.lineTotalLabel}>Total</Text>
                          <Text style={styles.lineTotalValue}>
                            ₹{item.totalPrice?.toLocaleString("en-IN") || "0"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Order Summary ── */}
          <View style={styles.section}>
            <CardLabel text="ORDER SUMMARY" />
            <View style={styles.summaryBox}>
              {/* Decorative circle */}
              <View style={styles.summaryCircle} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  ₹{subtotal.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST (3%)</Text>
                <Text style={styles.summaryValue}>
                  ₹{gstAmount.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryFree}>FREE</Text>
              </View>
              <View style={styles.summaryTotalDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Grand Total</Text>
                <Text style={styles.summaryTotalValue}>
                  ₹{grandTotal.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Checkout Footer */}
        <View style={styles.checkoutFooter}>
          <TouchableOpacity
            style={[
              styles.checkoutBtn,
              checkingOut && styles.checkoutBtnDisabled,
            ]}
            disabled={checkingOut}
            activeOpacity={0.85}
            onPress={handleCheckout}
          >
            {checkingOut ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.checkoutInner}>
                <View>
                  <Text style={styles.checkoutBtnLabel}>Payable Amount</Text>
                  <Text style={styles.checkoutBtnAmount}>
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.checkoutRight}>
                  <Text style={styles.checkoutBtnText}>
                    Proceed to Checkout
                  </Text>
                  <Text style={styles.checkoutArrow}>→</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 110, paddingHorizontal: 14, paddingTop: 16 },

  // ── Skeleton ──
  skeletonWrapper: { paddingHorizontal: 14, paddingTop: 20, gap: 14 },
  skeletonHeader: {
    height: 18,
    width: 140,
    borderRadius: 6,
    backgroundColor: "#E8E3D8",
    marginBottom: 6,
  },
  skeletonItem: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  skeletonThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#E8E3D8",
  },
  skeletonBody: { flex: 1, justifyContent: "center" },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: "#E8E3D8" },

  // ── Empty ──
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0EDE6",
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: C.textPri,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.textSec,
    marginBottom: 28,
    textAlign: "center",
    lineHeight: 20,
  },
  browseBtn: {
    backgroundColor: C.gold,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  browseBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },

  // ── Card label ──
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardLabelAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: C.textTer,
    letterSpacing: 0.8,
  },

  // ── Section ──
  section: { marginBottom: 22 },

  // ── Cart Item ──
  itemsList: { gap: 12 },
  cartItem: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    paddingTop: 18,
    flexDirection: "row",
    gap: 14,
    overflow: "hidden",
    position: "relative",
  },
  cartItemBusy: { opacity: 0.65 },

  // Per-item busy overlay
  itemBusyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247,245,240,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 12,
  },

  itemThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#F0EDE6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    alignSelf: "flex-start",
    marginTop: 0,
  },
  itemThumbIcon: { fontSize: 40 },

  itemInfo: { flex: 1, paddingRight: 24 },
  itemName: {
    fontSize: 14,
    fontWeight: "800",
    color: C.textPri,
    lineHeight: 19,
    marginBottom: 8,
  },

  itemTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  itemTag: {
    backgroundColor: "#F0EDE6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemTagText: { fontSize: 10, fontWeight: "700", color: C.textSec },

  // ── Footer row: Unit Price | divider | Qty | divider | Total ──
  itemFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F5F0",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  itemFooterDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.border,
  },

  itemPriceBlock: { alignItems: "flex-start", minWidth: 70 },
  itemPriceLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textTer,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemPriceValue: { fontSize: 13, fontWeight: "900", color: C.gold },

  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnBusy: { backgroundColor: C.border },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 18,
  },
  qtyNum: {
    fontSize: 15,
    fontWeight: "900",
    color: C.textPri,
    minWidth: 20,
    textAlign: "center",
  },

  lineTotalBlock: { alignItems: "flex-end", minWidth: 80 },
  lineTotalLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textTer,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lineTotalValue: { fontSize: 13, fontWeight: "900", color: C.gold },

  // ── Remove corner button ──
  removeCornerBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  removeCornerText: { fontSize: 16, lineHeight: 18, color: "#FFFFFF" },

  // Fixed checkout footer
  checkoutFooter: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E3D8",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 22,
  },

  // ── Summary Box ──
  summaryBox: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  summaryCircle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(184,137,26,0.03)",
    top: -50,
    right: -20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  summaryLabel: { fontSize: 13, color: C.textSec, fontWeight: "500" },
  summaryValue: { fontSize: 13, fontWeight: "700", color: C.textPri },
  summaryFree: { fontSize: 13, fontWeight: "800", color: C.success },
  summaryTotalDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  summaryTotalLabel: { fontSize: 15, fontWeight: "800", color: C.textPri },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: C.gold,
    letterSpacing: -0.5,
  },

  // ── Checkout Button ──
  checkoutBtn: {
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutBtnLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  checkoutBtnAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.3,
  },
  checkoutRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  checkoutBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  checkoutArrow: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },
});

export default PgCartScreen;
