 import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import GstWaiverModal from "../components/GstWaiverModal";
import BillDetailsCard from "../components/BillDetailsCard";
import PgQtyStepper from "../components/PgQtyStepper";
import { getProductImages, getUserAddresses } from "../api/physicalGoldApi";
import { performanceMonitor } from "../../utils/performanceMonitor";
import { FLATLIST_OPTIMIZATIONS, keyExtractor } from "../../utils/flatListOptimizations";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#503189",
  goldLight: "#F4F0FA",
  goldMid: "#8A73B8",
  goldDim: "rgba(80,49,137,0.10)",
  goldDimBorder: "rgba(80,49,137,0.25)",
  navy: "#333333",
  navyMid: "#555555",
  navyLight: "#757575",
  green: "#1F8A4C", // savings/FREE — ASKOXY.AI's softer green
  red: "#E53935",
  border: "#E0E0E0",
  divider: "#EEEEF3",
  surfaceAlt: "#FFFFFF",
};


// ── Section Header ────────────────────────────────────────────────────────────
const toTitleCase = (text) =>
  String(text || "").toLowerCase().replace(/(^|\s|\()(\S)/g, (m, sep, ch) => sep + ch.toUpperCase());

const SAVE_GREEN = "#15803D";

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{toTitleCase(title)}</Text>
  </View>
);

// ── Summary Row ───────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, isFree }) => (
  <View style={styles.specRow}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={isFree ? styles.specFree : styles.specValue}>{value}</Text>
  </View>
);

const getCartItemTotal = (item) => {
  const explicitTotal = Number(item?.totalPrice);
  if (item?.totalPrice != null && Number.isFinite(explicitTotal)) return explicitTotal;

  const unitPrice = Number(item?.price ?? item?.unitPrice ?? item?.variantPrice);
  if (!Number.isFinite(unitPrice)) return 0;
  const quantity = Number(item?.quantity);
  return unitPrice * (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
};

const getCartItemMrpTotal = (item) => Number(item?.mrp || 0) * (Number(item?.quantity) || 1);

// ── Cart Item Row — Image LEFT, Details RIGHT ─────────────────────────────────
// Size text for the subtitle — skipped when it just repeats the weight
// ("10 Gram" vs 10g), and "Gram" is only added to a bare number.
const getSizeLabel = (item) => {
  const size = String(item?.size ?? "").trim();
  if (!size) return null;
  const num = parseFloat(size);
  if (item?.weight != null && Number.isFinite(num) && num === Number(item.weight)) return null;
  return /[a-z]/i.test(size) ? size : `${size} Gram`;
};

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
            <Ionicons name="diamond-outline" size={20} color="#E4BB67" />
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

      {/* Attribute subtitle */}
      {(item.purity || item.weight || item.size) ? (
        <Text style={styles.itemSubtitle} numberOfLines={1}>
          {[
            item.purity || null,
            item.weight ? `${item.weight}g` : null,
            getSizeLabel(item),
          ].filter(Boolean).join(" · ")}
        </Text>
      ) : null}

      {/* Qty stepper + Line total */}
      <View style={styles.qtyTotalRow}>
        {/* Same − qty + pill as the Home product cards; at qty 1 the
            left button is a bin (handleDecrement removes the item). */}
        <PgQtyStepper
          qty={item.quantity ?? 1}
          loading={busy}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          style={styles.qtyPill}
        />

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.lineTotalValue}>₹{getCartItemTotal(item).toLocaleString("en-IN")}</Text>
          {/* Offer/MRP — only renders once the cart API actually sends an mrp
              field on the line item; nothing to show otherwise. */}
          {!!item.mrp && getCartItemMrpTotal(item) > getCartItemTotal(item) && (
            <View style={styles.offerRow}>
              <Text style={styles.offerStrike}>₹{getCartItemMrpTotal(item).toLocaleString("en-IN")}</Text>
              <Text style={styles.offerPct}>
                {Math.round(((getCartItemMrpTotal(item) - getCartItemTotal(item)) / getCartItemMrpTotal(item)) * 100)}% OFF
              </Text>
            </View>
          )}
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
  const [itemLoading, setItemLoading] = useState({});
  const [itemImages, setItemImages] = useState({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [totalCartValue, setTotalCartValue] = useState(0);
  const [totalGstCharges, setTotalGstCharges] = useState(0);
  const [totalMakingCharges, setTotalMakingCharges] = useState(0);
  const [totalPayableAmount, setTotalPayableAmount] = useState(0);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
  const [totalDiscountPercentage, setTotalDiscountPercentage] = useState(0);

  // "100% GST Paid by OxyGold.ai" popup — same as the web cart: shown once
  // automatically when the cart has a discount, and again on tapping the
  // Discount row.
  const [showGstModal, setShowGstModal] = useState(false);
  const gstModalShownRef = useRef(false);

  // Distance-based delivery — mirrors the web cart: fetched by passing the
  // customer's default address (the first one with lat/long) as addressId
  // alongside the cart-info call. Falls back to 0/null when no address has
  // coordinates yet, same as web.
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState(null);
  const [ratePerKm, setRatePerKm] = useState(null);
  const selectedAddressIdRef = useRef(null);

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
    setTotalMakingCharges(
      data?.totalMakingCharges ?? data?.totalMakingCharge ?? data?.makingCharges ?? 0,
    );
    setTotalPayableAmount(data?.totalPayableAmount || 0);
    setTotalDiscountAmount(Number(data?.totalDiscountAmount ?? data?.discountAmount ?? 0) || 0);
    setTotalDiscountPercentage(Number(data?.totalDiscountPercentage ?? data?.discountPercentage ?? 0) || 0);
    setDeliveryFee(data?.deliveryFee || 0);
    setDeliveryDistanceKm(data?.deliveryDistanceKm ?? null);
    setRatePerKm(data?.ratePerKm ?? null);
    dispatch(setCartCount(data?.itemsInCart?.length || 0));
  };

  // Picks the same "preferred default" address the web cart uses: the first
  // address that actually has coordinates, falling back to the first address
  // overall (which then just won't produce a delivery fee).
  const resolveDefaultAddressId = async () => {
    if (selectedAddressIdRef.current) return selectedAddressIdRef.current;
    try {
      const addresses = await getUserAddresses(userId);
      const preferred = addresses.find((a) => a.latitude && a.longitude) || addresses[0];
      selectedAddressIdRef.current = preferred?.id ?? null;
    } catch (e) {
      selectedAddressIdRef.current = null;
    }
    return selectedAddressIdRef.current;
  };

  const fetchCartData = async (silent = false) => {
    if (!silent) setLoading(true);
    const t0 = Date.now();
    try {
      const addressId = await resolveDefaultAddressId();
      const data = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/cart/customer-cart-info`, {
        params: addressId ? { customerId: userId, addressId } : { customerId: userId },
      });
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
      const addressId = selectedAddressIdRef.current;
      const data = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/cart/customer-cart-info`, {
        params: addressId ? { customerId: userId, addressId } : { customerId: userId },
      });
      applyCartData(data);
    } catch (err) {
      if (err?.status === 404) setCartItems([]);
    } finally {
      setItemLoading((p) => ({ ...p, [cartId]: false }));
    }
  };

  useEffect(() => {
    if (totalDiscountAmount <= 0 || cartItems.length === 0) {
      setShowGstModal(false);
      return;
    }
    if (gstModalShownRef.current) return;
    const timer = setTimeout(() => {
      setShowGstModal(true);
      gstModalShownRef.current = true;
    }, 600);
    return () => clearTimeout(timer);
  }, [totalDiscountAmount, cartItems.length]);

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
          } catch (err) {
            setBusy(item.cartId, false);
            Alert.alert("Error", err?.message || "Could not remove item. Please try again.");
          }
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
    } catch (err) {
      setBusy(item.cartId, false);
      Alert.alert("Error", err?.message || "Could not update quantity. Please try again.");
    }
  };

  const handleDecrement = async (item) => {
    if (item.quantity === 1) { handleRemove(item); return; }
    setBusy(item.cartId, true);
    try {
      await apiPost(`${PHYSICAL_GOLD_BASE_URL}/cart/decrementCartItems`, {
        userId, id: item.cartId, productId: item.productId, productVariantId: item.productVariantId, quantity: 1,
      });
      await silentRefresh(item.cartId);
    } catch (err) {
      setBusy(item.cartId, false);
      Alert.alert("Error", err?.message || "Could not update quantity. Please try again.");
    }
  };

  const handleCheckout = () => {
    if (!userId) {
      Alert.alert("Session Expired", "Please login again", [{ text: "OK", onPress: () => navigation.replace("Login") }]);
      return;
    }
    navigation.navigate("PgCheckout", { cartTotal: totalPayableAmount, cartItems });
  };

  // ── Loading ──
  if (loading) {
    return (
      <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
        <PgLoader label="Loading cart..." />
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

  const subtotal = totalCartValue || cartItems.reduce((sum, item) => sum + getCartItemTotal(item), 0);
  const gst = totalGstCharges || 0;
  const making = Number(totalMakingCharges) || 0;
  const grand = totalPayableAmount || (subtotal + gst + making + deliveryFee - totalDiscountAmount);
  const isSilverCart = cartItems.some(
    (item) => /silver/i.test(String(item?.productName || "")) || /silver/i.test(String(item?.purity || "")),
  );

  return (
    <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
        <FadeSlideIn>
          {/* ── Items list (heading inside the card) ── */}
          <View style={styles.listCard}>
            <SectionHeader title={`${cartItems.length} ITEM${cartItems.length > 1 ? "S" : ""} IN CART`} />
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

          {/* ── Bill details — shared with Checkout so both look the same ── */}
          <BillDetailsCard
            itemCount={cartItems.length}
            subtotal={subtotal}
            making={making}
            gst={gst}
            discount={totalDiscountAmount}
            deliveryFee={deliveryFee}
            deliveryDistanceKm={deliveryDistanceKm}
            ratePerKm={ratePerKm}
            total={grand}
            onDiscountPress={() => setShowGstModal(true)}
          />

          <View style={styles.secureNoteRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={C.navyLight} />
            <Text style={styles.secureNoteText}>Secure & Encrypted Checkout</Text>
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
              style={styles.checkoutBtn}
              activeOpacity={0.85}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutBtnText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>

        <GstWaiverModal
          visible={showGstModal}
          onClose={() => setShowGstModal(false)}
          isSilver={isSilverCart}
          gstPercentage={totalDiscountPercentage}
          gstAmount={gst}
          waiverAmount={totalDiscountAmount}
        />

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
  // Light grey page with white cards — same look as My Orders / Checkout.
  root: { flex: 1, backgroundColor: "#F4F3F8" },
  scroll: { paddingTop: 12, paddingBottom: 24 },

  sectionHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "500", color: C.navy },

  // ── Items — flat full-width section (no boxed card) ──
  listCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECEAF2",
    shadowColor: "#2A1F4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
    backgroundColor: "#F7F7F9",
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
  fallbackWeight: { fontSize: 13, fontWeight: "600", color: "#E4BB67" },
  fallbackDivider: { width: 22, height: 1, backgroundColor: "rgba(228,187,103,0.4)", marginVertical: 3 },
  fallbackPurity: { fontSize: 9, fontWeight: "600", color: "rgba(228,187,103,0.7)", letterSpacing: 0.4 },

  purityPill: {
    position: "absolute", bottom: 5, left: 5,
    backgroundColor: "rgba(34,30,28,0.88)",
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  purityPillText: { fontSize: 9, fontWeight: "500", color: "#E4BB67", letterSpacing: 0.4 },

  // Details — right side, fills remaining width
  detailsCol: { flex: 1, gap: 5 },

  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  itemName: { flex: 1, fontSize: 15, fontWeight: "500", color: C.navy, lineHeight: 20 },

  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#FDECEA",
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },

  itemSubtitle: { fontSize: 13, color: C.navyLight },

  // Qty stepper + line total — plain row, no boxed background
  qtyTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  qtyStepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyPill: { width: 112 },
  stepBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    justifyContent: "center", alignItems: "center",
  },
  stepBtnOff: { backgroundColor: C.divider },
  stepBtnText: { fontSize: 16, fontWeight: "500", color: C.navy, lineHeight: 18 },
  qtyValue: { fontSize: 14, fontWeight: "500", color: C.navy, minWidth: 18, textAlign: "center" },

  lineTotalValue: { fontSize: 15, fontWeight: "600", color: C.navy },
  offerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  offerStrike: {
    fontSize: 11,
    color: C.navyLight, // grey strike-through MRP (red was harsh)
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  offerPct: { fontSize: 11, fontWeight: "600", color: "#1F8A4C" },

  // ── Summary card ──
  // Flat summary section; rows spaced rather than ruled.
  summaryCard: {
    backgroundColor: C.card,
    paddingBottom: 14,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEF3",
  },
  priceHeaderText: { fontSize: 16, fontWeight: "700", color: "#333333" },
  priceBody: { paddingHorizontal: 16, paddingTop: 6 },
  priceDivider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    marginVertical: 8,
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#EAF8F1",
    borderRadius: 8,
  },
  savingsText: { fontSize: 13, fontWeight: "600", color: SAVE_GREEN },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7 },
  specDivider: { height: 0 },
  specLabel: { fontSize: 14, color: C.navyMid },
  specValue: { fontSize: 14, fontWeight: "500", color: C.navy },
  specFree: { fontSize: 14, fontWeight: "600", color: C.green },
  discountLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  discountText: { fontSize: 14, fontWeight: "500", color: C.green },
  strikeValue: { fontSize: 12, color: C.navyLight, textDecorationLine: "line-through" },
  deliveryRateNote: { fontSize: 11, color: C.navyLight, textAlign: "right", marginTop: -3, marginBottom: 6 },
  grandRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 4,
  },
  grandLabel: { fontSize: 15, fontWeight: "700", color: "#333333" },
  grandValue: { fontSize: 18, fontWeight: "700", color: "#333333" },
  secureNoteRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, marginTop: 14, marginBottom: 6,
  },
  secureNoteText: { fontSize: 12, fontWeight: "500", color: C.navyLight },

  // ── Footer ──
  footer: {
    backgroundColor: C.card,
    paddingBottom: 18,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
  },
  footerInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 16 },
  footerLeft: { flex: 1 },
  footerLabel: { fontSize: 11, fontWeight: "500", color: C.navyLight, letterSpacing: 0.3, marginBottom: 1 },
  footerAmount: { fontSize: 20, fontWeight: "600", color: C.navy, letterSpacing: -0.2 },
  footerSub: { fontSize: 11, color: C.navyLight, marginTop: 2 },
  checkoutBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FB641B", borderRadius: 6, height: 48,
    justifyContent: "center", alignItems: "center",
  },
  checkoutBtnText: { fontSize: 15, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },

  // ── Empty state ──
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.goldLight,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: C.navy, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: C.navyLight, marginBottom: 24, textAlign: "center" },
  browseBtn: {
    backgroundColor: C.gold, borderRadius: 13, paddingHorizontal: 28, paddingVertical: 14,
  },
  browseBtnText: { fontSize: 14, fontWeight: "600", color: "#fff", letterSpacing: 0.1 },

  // ── Image Modal ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  modalClose: { position: "absolute", top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  modalCloseText: { fontSize: 24, color: "#fff", fontWeight: "300" },
  modalImageContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  modalImage: { width: Dimensions.get("window").width * 0.9, height: Dimensions.get("window").height * 0.7 },
});

export default PgCartScreen;
