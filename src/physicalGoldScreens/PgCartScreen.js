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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { setCartCount } from "../store/cartSlice";
import { apiGet, apiPost, apiDelete } from "../services/apiClient";
import { PHYSICAL_GOLD_BASE_URL } from "../constants/api";
import PgLayout from "../../components/physical/PgLayout";
import { getProductImages } from "./physicalGoldApi";

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
  red: "#E02424",
  border: "#EAE8E2",
  divider: "#F0EEE9",
  surfaceAlt: "#F7F6F3",
};

// ── Shimmer ───────────────────────────────────────────────────────────────────
const Shimmer = ({ w, h, r = 8, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });
  return (
    <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.goldMid, opacity }, style]} />
  );
};

// ── Skeleton Row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <View style={styles.itemCard}>
    <Shimmer w={100} h={100} r={14} />
    <View style={{ flex: 1, gap: 8 }}>
      <Shimmer w="80%" h={14} />
      <Shimmer w="50%" h={11} />
      <Shimmer w="40%" h={11} />
      <Shimmer w="100%" h={38} r={10} style={{ marginTop: 4 }} />
    </View>
  </View>
);

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ── Summary Row ───────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, isFree }) => (
  <View style={styles.specRow}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={isFree ? styles.specFree : styles.specValue}>{value}</Text>
  </View>
);

// ── Cart Item Row — Image LEFT, Details RIGHT ─────────────────────────────────
const CartItemRow = ({ item, busy, imageUrl, onRemove, onIncrement, onDecrement }) => (
  <View style={[styles.itemCard, busy && { opacity: 0.65 }]}>
    {busy && (
      <View style={styles.busyOverlay}>
        <ActivityIndicator size="small" color={C.gold} />
      </View>
    )}

    {/* ── LEFT: Product image ── */}
    <View style={styles.imageBox}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="contain" />
      ) : (
        <View style={styles.imageFallback}>
          <Text style={styles.fallbackWeight}>{item.weight ? `${item.weight}g` : "🏆"}</Text>
          {item.weight ? (
            <>
              <View style={styles.fallbackDivider} />
              <Text style={styles.fallbackPurity}>{item.purity || "—"}</Text>
            </>
          ) : null}
        </View>
      )}
      {item.purity ? (
        <View style={styles.purityPill}>
          <Text style={styles.purityPillText}>{item.purity}</Text>
        </View>
      ) : null}
    </View>

    {/* ── RIGHT: Product details ── */}
    <View style={styles.detailsCol}>

      {/* Name + Delete btn */}
      <View style={styles.nameRow}>
        <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onRemove}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Attribute chips */}
      <View style={styles.chipRow}>
        {item.purity ? <View style={styles.chip}><Text style={styles.chipText}>{item.purity}</Text></View> : null}
        {item.weight ? <View style={styles.chip}><Text style={styles.chipText}>{item.weight}g</Text></View> : null}
        {item.size   ? <View style={styles.chip}><Text style={styles.chipText}>Size {item.size}</Text></View> : null}
      </View>

      {/* Unit price */}
      <Text style={styles.unitPrice}>
        ₹{item.price?.toLocaleString("en-IN") || "0"}
        <Text style={styles.unitPriceSuffix}> / unit</Text>
      </Text>

      {/* Qty stepper + Line total */}
      <View style={styles.qtyTotalRow}>
        <View style={styles.qtyStepper}>
          <TouchableOpacity style={[styles.stepBtn, busy && styles.stepBtnOff]} onPress={onDecrement} disabled={busy} activeOpacity={0.8}>
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <TouchableOpacity style={[styles.stepBtn, busy && styles.stepBtnOff]} onPress={onIncrement} disabled={busy} activeOpacity={0.8}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vDivider} />

        <View style={styles.lineTotalBox}>
          <Text style={styles.lineTotalLabel}>Total</Text>
          <Text style={styles.lineTotalValue}>₹{item.totalPrice?.toLocaleString("en-IN") || "0"}</Text>
        </View>
      </View>

    </View>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const PgCartScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const dispatch = useDispatch();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [itemLoading, setItemLoading] = useState({});
  const [itemImages, setItemImages] = useState({});

  const [totalCartValue, setTotalCartValue] = useState(0);
  const [totalGstCharges, setTotalGstCharges] = useState(0);
  const [totalMakingCharges, setTotalMakingCharges] = useState(0);
  const [totalPayableAmount, setTotalPayableAmount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => { if (userId) fetchCartData(); }, [userId]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => { if (userId) fetchCartData(); });
    return unsub;
  }, [navigation, userId]);

  useEffect(() => {
    cartItems.forEach((item) => {
      if (item.productId && !itemImages[item.productId]) {
        getProductImages(item.productId)
          .then((res) => setItemImages((p) => ({ ...p, [item.productId]: res?.frontViewUrl || null })))
          .catch(() => {});
      }
    });
  }, [cartItems]);

  const applyCartData = (data) => {
    setCartItems(data?.itemsInCart || []);
    setTotalCartValue(data?.totalCartValue || 0);
    setTotalGstCharges(data?.totalGstCharges || 0);
    setTotalMakingCharges(data?.totalMakingCharges || 0);
    setTotalPayableAmount(data?.totalPayableAmount || 0);
    dispatch(setCartCount(data?.itemsInCart?.length || 0));
  };

  const fetchCartData = async (silent = false) => {
    if (!silent) setLoading(true);
    const t0 = Date.now();
    try {
      const data = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/cart/customer-cart-info`, { params: { customerId: userId } });
      applyCartData(data);
    } catch (err) {
      if (err?.status === 404) setCartItems([]);
      else setCartItems([]);
    } finally {
      const wait = silent ? 0 : Math.max(0, 800 - (Date.now() - t0));
      setTimeout(() => {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]).start();
      }, wait);
    }
  };

  const silentRefresh = async (cartId) => {
    try {
      const data = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/cart/customer-cart-info`, { params: { customerId: userId } });
      applyCartData(data);
    } catch (err) {
      if (err?.status === 404) setCartItems([]);
    } finally {
      setItemLoading((p) => ({ ...p, [cartId]: false }));
    }
  };

  const setBusy = (cartId, v) => setItemLoading((p) => ({ ...p, [cartId]: v }));

  const handleRemove = (item) => {
    Alert.alert("Remove Item", `Remove "${item.productName}" from cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          setBusy(item.cartId, true);
          try {
            await apiDelete(`${PHYSICAL_GOLD_BASE_URL}/cart/${item.cartId}`, { params: { userId } });
            await silentRefresh(item.cartId);
          } catch { setBusy(item.cartId, false); }
        },
      },
    ]);
  };

  const handleIncrement = async (item) => {
    setBusy(item.cartId, true);
    try {
      await apiPost(`${PHYSICAL_GOLD_BASE_URL}/cart/AddItemToCart`, {
        userId, productId: item.productId, productVariantId: item.productVariantId, quantity: 1,
      });
      await silentRefresh(item.cartId);
    } catch { setBusy(item.cartId, false); }
  };

  const handleDecrement = async (item) => {
    if (item.quantity === 1) { handleRemove(item); return; }
    setBusy(item.cartId, true);
    try {
      await apiPost(`${PHYSICAL_GOLD_BASE_URL}/cart/decrementCartItems`, {
        userId, id: item.cartId, productId: item.productId, productVariantId: item.productVariantId, quantity: 1,
      });
      await silentRefresh(item.cartId);
    } catch { setBusy(item.cartId, false); }
  };

  const handleCheckout = () => {
    if (!userId) {
      Alert.alert("Session Expired", "Please login again", [{ text: "OK", onPress: () => navigation.replace("Login") }]);
      return;
    }
    navigation.navigate("PgCheckout", { cartTotal: totalPayableAmount, cartItems });
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <SectionHeader title="ITEMS IN CART" />
          <View style={styles.listCard}>
            <SkeletonRow />
            <View style={styles.itemDivider} />
            <SkeletonRow />
            <View style={styles.itemDivider} />
            <SkeletonRow />
          </View>
        </ScrollView>
      </PgLayout>
    );
  }

  // ── Empty state ──
  if (cartItems.length === 0) {
    return (
      <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}><Text style={styles.emptyIcon}>🛒</Text></View>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>Add gold products to get started</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate("PgHome")} activeOpacity={0.85}>
            <Text style={styles.browseBtnText}>Browse Store</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  const subtotal = totalCartValue || cartItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const gst = totalGstCharges || 0;
  const making = totalMakingCharges || 0;
  const grand = totalPayableAmount || subtotal + gst;

  return (
    <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
      <View style={styles.root}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <SectionHeader title={`${cartItems.length} ITEM${cartItems.length > 1 ? "S" : ""} IN CART`} />

          {/* ── Items list ── */}
          <View style={styles.listCard}>
            {cartItems.map((item, idx) => (
              <View key={item.cartId}>
                <CartItemRow
                  item={item}
                  busy={!!itemLoading[item.cartId]}
                  imageUrl={itemImages[item.productId] || null}
                  onRemove={() => handleRemove(item)}
                  onIncrement={() => handleIncrement(item)}
                  onDecrement={() => handleDecrement(item)}
                />
                {idx < cartItems.length - 1 && <View style={styles.itemDivider} />}
              </View>
            ))}
          </View>

          {/* ── Order Summary ── */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRing1} />
            <View style={styles.summaryRing2} />
            <SectionHeader title="ORDER SUMMARY" />
            <SummaryRow label={`Subtotal (${cartItems.length} items)`} value={`₹${subtotal.toLocaleString("en-IN")}`} />
            <View style={styles.specDivider} />
            {making > 0 && (
              <>
                <SummaryRow label="Making Charges" value={`₹${making.toLocaleString("en-IN")}`} />
                <View style={styles.specDivider} />
              </>
            )}
            <SummaryRow label="GST (3%)" value={`₹${gst.toLocaleString("en-IN")}`} />
            <View style={styles.specDivider} />
            <SummaryRow label="Delivery" value="FREE" isFree />
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Grand Total</Text>
              <Text style={styles.grandValue}>₹{grand.toLocaleString("en-IN")}</Text>
            </View>
          </View>
        </Animated.ScrollView>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerLabel}>Payable Amount</Text>
              <Text style={styles.footerAmount}>₹{grand.toLocaleString("en-IN")}</Text>
              <Text style={styles.footerSub}>{cartItems.length} item{cartItems.length > 1 ? "s" : ""}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, checkingOut && styles.checkoutBtnOff]}
              disabled={checkingOut}
              activeOpacity={0.85}
              onPress={handleCheckout}
            >
              {checkingOut
                ? <ActivityIndicator size="small" color={C.navy} />
                : <Text style={styles.checkoutBtnText}>Checkout →</Text>
              }
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
  scroll: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionAccent: { width: 3, height: 18, borderRadius: 2, backgroundColor: C.gold },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: C.navyMid, letterSpacing: 0.6 },

  // ── List card wrapper ──
  listCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  itemDivider: { height: 1, backgroundColor: C.divider, marginHorizontal: 14 },

  // ── Item row: Image left + Details right ──
  itemCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    position: "relative",
  },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.78)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  // Image — fixed 100×100 square, left side
  imageBox: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: C.goldLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.goldDimBorder,
    flexShrink: 0,
    position: "relative",
  },
  productImage: { width: "100%", height: "100%" },
  imageFallback: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.navy,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(232,201,122,0.4)",
  },
  fallbackWeight: { fontSize: 13, fontWeight: "900", color: C.goldMid },
  fallbackDivider: { width: 22, height: 1, backgroundColor: "rgba(232,201,122,0.4)", marginVertical: 3 },
  fallbackPurity: { fontSize: 8, fontWeight: "700", color: "rgba(232,201,122,0.7)", letterSpacing: 0.4 },

  purityPill: {
    position: "absolute", bottom: 5, left: 5,
    backgroundColor: "rgba(28,35,64,0.88)",
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  purityPillText: { fontSize: 8, fontWeight: "800", color: C.goldMid, letterSpacing: 0.4 },

  // Details — right side, fills remaining width
  detailsCol: { flex: 1, gap: 5 },

  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  itemName: { flex: 1, fontSize: 14, fontWeight: "800", color: C.navy, lineHeight: 19 },

  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.red,
    justifyContent: "center", alignItems: "center", flexShrink: 0,
    shadowColor: C.red, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: {
    backgroundColor: C.goldDim,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: C.goldDimBorder,
  },
  chipText: { fontSize: 10, fontWeight: "700", color: C.gold },

  unitPrice: { fontSize: 15, fontWeight: "900", color: C.gold },
  unitPriceSuffix: { fontSize: 11, fontWeight: "400", color: C.navyLight },

  // Qty + total bar
  qtyTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 2,
  },
  qtyStepper: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  stepBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.gold,
    justifyContent: "center", alignItems: "center",
    shadowColor: C.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 3,
  },
  stepBtnOff: { backgroundColor: C.border, shadowOpacity: 0 },
  stepBtnText: { fontSize: 18, fontWeight: "700", color: "#fff", lineHeight: 20 },
  qtyValue: { fontSize: 16, fontWeight: "900", color: C.navy, minWidth: 20, textAlign: "center" },

  vDivider: { width: 1, height: 28, backgroundColor: C.border, marginHorizontal: 8 },

  lineTotalBox: { alignItems: "flex-end" },
  lineTotalLabel: { fontSize: 9, fontWeight: "600", color: C.navyLight, letterSpacing: 0.3 },
  lineTotalValue: { fontSize: 14, fontWeight: "900", color: C.navy },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: C.goldLight,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.goldMid,
    overflow: "hidden",
  },
  summaryRing1: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(232,201,122,0.10)", top: -40, right: 10,
  },
  summaryRing2: {
    position: "absolute", width: 75, height: 75, borderRadius: 38,
    borderWidth: 1, borderColor: "rgba(232,201,122,0.15)", right: 85, bottom: -28,
  },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, zIndex: 1 },
  specDivider: { height: 1, backgroundColor: "rgba(28,35,64,0.07)" },
  specLabel: { fontSize: 13, color: C.navyLight },
  specValue: { fontSize: 13, fontWeight: "700", color: C.navy },
  specFree: { fontSize: 13, fontWeight: "800", color: C.green },
  grandRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 14, paddingTop: 14, borderTopWidth: 1.5, borderTopColor: C.goldMid,
  },
  grandLabel: { fontSize: 15, fontWeight: "800", color: C.navy },
  grandValue: { fontSize: 22, fontWeight: "900", color: C.gold },

  // ── Footer ──
  footer: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: 24,
    paddingTop: 12,
  },
  footerInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 16 },
  footerLeft: { flex: 1 },
  footerLabel: { fontSize: 11, fontWeight: "600", color: C.navyLight, letterSpacing: 0.3, marginBottom: 1 },
  footerAmount: { fontSize: 22, fontWeight: "900", color: C.navy, letterSpacing: -0.5 },
  footerSub: { fontSize: 11, color: C.navyLight, marginTop: 2 },
  checkoutBtn: {
    flex: 1,
    backgroundColor: C.gold, borderRadius: 16, height: 54,
    justifyContent: "center", alignItems: "center",
    shadowColor: C.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  checkoutBtnOff: { backgroundColor: C.border, shadowOpacity: 0, elevation: 0 },
  checkoutBtnText: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: 0.3 },

  // ── Empty state ──
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.goldLight,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.goldMid, marginBottom: 16,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.navy, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: C.navyLight, marginBottom: 24, textAlign: "center" },
  browseBtn: {
    backgroundColor: C.gold, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  browseBtnText: { fontSize: 14, fontWeight: "800", color: "#1C2340" },
});

export default PgCartScreen;