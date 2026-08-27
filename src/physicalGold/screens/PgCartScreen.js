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
  Modal,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { selectUserId } from "../../store/authSlice";
import { setCartCount } from "../../store/cartSlice";
import { apiGet, apiPost, apiDelete } from "../../services/apiClient";
import { PHYSICAL_GOLD_BASE_URL } from "../../constants/api";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";
import { getProductImages } from "./physicalGoldApi";
import { performanceMonitor } from "../../utils/performanceMonitor";
import { FLATLIST_OPTIMIZATIONS, keyExtractor } from "../../utils/flatListOptimizations";

const C = {
  bg: "#F8F7F6",
  card: "#FFFFFF",
  gold: "#CF8B17",
  goldLight: "#F7F4ED",
  goldMid: "#E4BB67",
  goldDim: "rgba(207,139,23,0.10)",
  goldDimBorder: "rgba(207,139,23,0.25)",
  navy: "#1C1C1E",
  navyMid: "#48484C",
  navyLight: "#7A7A80",
  green: "#2ECC71",
  red: "#C85A54",
  border: "#E7E0DA",
  divider: "#EEEBE8",
  surfaceAlt: "#F8F7F6",
};

// ── Shimmer ───────────────────────────────────────────────────────────────────
const Shimmer = ({ w, h, r = 8, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    );
    shimmerLoop.start();
    return () => {
      shimmerLoop.stop();
      anim.stopAnimation();
    };
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
const CartItemRow = ({ item, busy, imageUrl, onRemove, onIncrement, onDecrement, onImagePress }) => (
  <View style={[styles.itemCard, busy && { opacity: 0.65 }]}>
    {busy && (
      <View style={styles.busyOverlay}>
        <ActivityIndicator size="small" color={C.gold} />
      </View>
    )}

    {/* ── LEFT: Product image ── */}
    <TouchableOpacity style={styles.imageBox} onPress={imageUrl ? onImagePress : null} activeOpacity={imageUrl ? 0.8 : 1}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="contain" />
      ) : (
        <View style={styles.imageFallback}>
          {item.weight ? (
            <Text style={styles.fallbackWeight}>{item.weight}g</Text>
          ) : (
            <Ionicons name="diamond-outline" size={20} color={C.goldMid} />
          )}
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
    </TouchableOpacity>

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
          <Ionicons name="trash-outline" size={14} color={C.red} />
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [totalCartValue, setTotalCartValue] = useState(0);
  const [totalGstCharges, setTotalGstCharges] = useState(0);
  const [totalMakingCharges, setTotalMakingCharges] = useState(0);
  const [totalPayableAmount, setTotalPayableAmount] = useState(0);


  useEffect(() => {
    performanceMonitor.startMeasure('PgCartScreen');
    if (userId) fetchCartData();
  }, [userId]);

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
      console.log('🛒 Cart API Response:', JSON.stringify(data, null, 2));
      applyCartData(data);
      if (!silent) performanceMonitor.endMeasure('PgCartScreen');
    } catch (err) {
      if (err?.status === 404) setCartItems([]);
      else setCartItems([]);
    } finally {
      const wait = silent ? 0 : Math.max(0, 800 - (Date.now() - t0));
      setTimeout(() => {
        setLoading(false);
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
          <View style={styles.emptyIconBox}>
            <Ionicons name="cart-outline" size={32} color={C.gold} />
          </View>
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
  const grand = totalPayableAmount || (subtotal + gst + making);

  return (
    <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
        <FadeSlideIn>
          <SectionHeader title={`${cartItems.length} ITEM${cartItems.length > 1 ? "S" : ""} IN CART`} />

          {/* ── Items list ── */}
          <View style={styles.listCard}>
            <FlatList
              data={cartItems}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <View>
                  <CartItemRow
                    item={item}
                    busy={!!itemLoading[item.cartId]}
                    imageUrl={itemImages[item.productId] || null}
                    onRemove={() => handleRemove(item)}
                    onIncrement={() => handleIncrement(item)}
                    onDecrement={() => handleDecrement(item)}
                    onImagePress={() => { setSelectedImage(itemImages[item.productId]); setShowImageModal(true); }}
                  />
                  {index < cartItems.length - 1 && <View style={styles.itemDivider} />}
                </View>
              )}
              {...FLATLIST_OPTIMIZATIONS.cartList}
            />
          </View>

          {/* ── Order Summary ── */}
          <View style={styles.summaryCard}>
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
        </FadeSlideIn>
        </ScrollView>

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
              {checkingOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.checkoutBtnText}>Checkout</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Image Modal ── */}
        <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowImageModal(false)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <ScrollView
              contentContainerStyle={styles.modalImageContainer}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              {selectedImage && <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />}
            </ScrollView>
          </View>
        </Modal>
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
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "rgba(34,30,28,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
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

  // Image — fixed 108×108 square, left side
  imageBox: {
    width: 108,
    height: 108,
    borderRadius: 14,
    backgroundColor: C.goldLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
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
    borderColor: "rgba(228,187,103,0.4)",
  },
  fallbackWeight: { fontSize: 13, fontWeight: "900", color: C.goldMid },
  fallbackDivider: { width: 22, height: 1, backgroundColor: "rgba(228,187,103,0.4)", marginVertical: 3 },
  fallbackPurity: { fontSize: 9, fontWeight: "700", color: "rgba(228,187,103,0.7)", letterSpacing: 0.4 },

  purityPill: {
    position: "absolute", bottom: 5, left: 5,
    backgroundColor: "rgba(34,30,28,0.88)",
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  purityPillText: { fontSize: 9, fontWeight: "800", color: C.goldMid, letterSpacing: 0.4 },

  // Details — right side, fills remaining width
  detailsCol: { flex: 1, gap: 5 },

  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  itemName: { flex: 1, fontSize: 14, fontWeight: "800", color: C.navy, lineHeight: 19 },

  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#FDECEA",
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: {
    backgroundColor: C.goldDim,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 2,
  },
  qtyStepper: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  stepBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.gold,
    justifyContent: "center", alignItems: "center",
  },
  stepBtnOff: { backgroundColor: C.border },
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
  },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  specDivider: { height: 1, backgroundColor: "rgba(34,30,28,0.07)" },
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
    flexDirection: "row",
    backgroundColor: "#CF8B17", borderRadius: 14, height: 52,
    justifyContent: "center", alignItems: "center",
  },
  checkoutBtnOff: { backgroundColor: C.border },
  checkoutBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },

  // ── Empty state ──
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.goldLight,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.navy, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: C.navyLight, marginBottom: 24, textAlign: "center" },
  browseBtn: {
    backgroundColor: "#CF8B17", borderRadius: 13, paddingHorizontal: 28, paddingVertical: 14,
  },
  browseBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.1 },

  // ── Image Modal ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  modalClose: { position: "absolute", top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  modalCloseText: { fontSize: 24, color: "#fff", fontWeight: "300" },
  modalImageContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  modalImage: { width: Dimensions.get("window").width * 0.9, height: Dimensions.get("window").height * 0.7 },
});

export default PgCartScreen;