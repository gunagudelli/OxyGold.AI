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
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { selectUserId, selectAccessToken } from "../../store/authSlice";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import { apiPost, apiDelete } from "../../services/apiClient";
import { PHYSICAL_GOLD_BASE_URL } from "../../constants/api";
import {
  getUserProfile,
  getUserAddresses,
  createOrder,
  deleteAddress,
  getCart,
  getProductImages,
  getAvailableCoupons,
  applyCoupon as applyCouponApi,
} from "../api/physicalGoldApi";
import { resolveImageUrl } from "../utils/resolveImageUrl";
import GstWaiverModal from "../components/GstWaiverModal";
import CouponsSheet, { estimateCouponSaving } from "../components/CouponsSheet";
import BillDetailsCard from "../components/BillDetailsCard";
import PgQtyStepper from "../components/PgQtyStepper";

// ─── Design Tokens (mirrors PgCartScreen exactly) ────────────────────────────
// Colours follow the ASKOXY.AI app's payment screen — a deeper, calmer purple
// and neutral greys, easier on the eyes than the bright purple.
const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#503189",
  goldLight: "#F4F0FA",
  goldMid: "#8A73B8",
  goldDim: "rgba(80,49,137,0.08)",
  goldDimBorder: "rgba(80,49,137,0.22)",
  navy: "#333333",
  navyMid: "#555555",
  navyLight: "#757575",
  green: "#1F8A4C",
  greenBg: "#EAF8F1",
  greenBorder: "#EAF8F1",
  red: "#E53935",
  redBg: "#FDECEA",
  redBorder: "#FDECEA",
  border: "#E0E0E0",
  divider: "#EEEEF3",
  surfaceAlt: "#FFFFFF",
  grey: "#E0E0E0",
  warn: "#F59E0B",
  warnBg: "#FFF8E6",
  warnBorder: "#F59E0B",
};

// Soft lavender page behind the white section cards (no hard borders).
const PAGE_BG = "#F4F3F8";
// Thin grey band between flat sections (instead of boxed cards).
const SECTION_GAP = "#F7F7F9";
// Savings/discounts use the brand purple instead of bright green.
const SAVE = "#503189";
// Place Order — ASKOXY.AI's orange call-to-action.
const CTA = "#FB641B";

// Cash on Delivery is offered from this payable amount (₹1,00,000) upward;
// below it, online payment only — same rule as the ASKOXY.AI app.
const COD_MIN_AMOUNT = 100000;

// ─── Section Header (same as PgCartScreen) ───────────────────────────────────
const toTitleCase = (text) =>
  String(text || "").toLowerCase().replace(/(^|\s|\()(\S)/g, (m, sep, ch) => sep + ch.toUpperCase());

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{toTitleCase(title)}</Text>
  </View>
);

const getCheckoutItemTotal = (item) => {
  const total = Number(item?.totalPrice);
  if (item?.totalPrice != null && Number.isFinite(total)) return total;
  const price = Number(item?.price ?? item?.unitPrice ?? item?.variantPrice);
  if (!Number.isFinite(price)) return 0;
  const quantity = Number(item?.quantity);
  return price * (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
};

const getCheckoutItemName = (item) =>
  item?.productName || item?.name || item?.product?.productName || item?.product?.name || "Gold product";

const getCheckoutItemDetails = (item) => {
  const weight = item?.weight ?? item?.variant?.weight;
  const purity = item?.purity ?? item?.variant?.purity;
  const rawSize = String(item?.size ?? item?.variant?.size ?? "").trim();
  // Skip a size that just repeats the weight ("10 Gram" vs 10g).
  const sizeNum = parseFloat(rawSize);
  const size =
    rawSize && !(weight != null && Number.isFinite(sizeNum) && sizeNum === Number(weight))
      ? (/[a-z]/i.test(rawSize) ? rawSize : `${rawSize} Gram`)
      : null;
  return [purity, weight != null ? `${weight}g` : null, size]
    .filter(Boolean)
    .join(" · ");
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PgCheckoutScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const { cartTotal: routeCartTotal, cartItems: routeCartItems, showGstPopup } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const hadAddressesRef = useRef(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  // Online payment (Cashfree) by default; Cash on Delivery is offered only
  // when the payable amount is COD_MIN_AMOUNT or more.
  const [paymentMode, setPaymentMode] = useState("CASHFREE");
  const [profileComplete, setProfileComplete] = useState(false);

  // Store cart data in state so it persists when navigating back
  const [cartTotal, setCartTotal] = useState(routeCartTotal || 0);
  const [cartItems, setCartItems] = useState(routeCartItems || []);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartGst, setCartGst] = useState(0);
  const [cartMaking, setCartMaking] = useState(0);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [cartDiscountPct, setCartDiscountPct] = useState(0);

  // ── Coupons & offers (same flow as the oxygold.ai web cart) ──
  // The backend validates a code against the current cart (/coupons/apply);
  // the code is then sent with createOrder, which applies it to the order.
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCouponCode, setApplyingCouponCode] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponsSheet, setShowCouponsSheet] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const couponDiscount = Number(appliedCoupon?.discountAmount || 0);

  // "100% GST Paid by OXYGOLD.AI" popup. Auto-shown only when the user came
  // straight from Home's Buy Now (showGstPopup) — they skipped the Cart, which
  // is where it normally pops up, so it isn't shown twice. Tapping the GST
  // row still opens it any time.
  const [showGstModal, setShowGstModal] = useState(false);
  const gstModalShownRef = useRef(false);
  const [cartItemImages, setCartItemImages] = useState({});
  const [cartUpdating, setCartUpdating] = useState({});

  // Distance-based delivery — same as PgCartScreen: recomputed by the
  // backend whenever we pass the currently-selected address's id, so this
  // updates automatically if the user switches addresses.
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState(null);
  const [ratePerKm, setRatePerKm] = useState(null);

  useEffect(() => {
    let active = true;
    cartItems.forEach((item) => {
      const productId = item?.productId ?? item?.product?.id;
      const inlineImage = item?.imageUrl || item?.productImage || item?.frontViewurl || item?.product?.imageUrl || item?.product?.image || item?.product?.frontViewurl;
      if (!productId || inlineImage) return;
      getProductImages(productId)
        .then((images) => {
          const imageUrl = images?.frontViewUrl || images?.topViewUrl || images?.backViewUrl || null;
          if (active && imageUrl) {
            setCartItemImages((current) => ({ ...current, [String(productId)]: imageUrl }));
          }
        })
        .catch(() => {});
    });
    return () => { active = false; };
  }, [cartItems]);

  useEffect(() => {
    if (cartDiscount <= 0 || cartItems.length === 0) {
      setShowGstModal(false);
      return;
    }
    if (!showGstPopup || gstModalShownRef.current || loading) return;
    const timer = setTimeout(() => {
      setShowGstModal(true);
      gstModalShownRef.current = true;
    }, 600);
    return () => clearTimeout(timer);
  }, [cartDiscount, cartItems.length, loading, showGstPopup]);

  const isSilverCart = cartItems.some(
    (item) => /silver/i.test(String(item?.productName || "")) || /silver/i.test(String(item?.purity || "")),
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useFocusEffect(
    useCallback(() => {
      loadCheckoutData();
      loadCoupons();
    }, [userId]),
  );

  const loadCoupons = async () => {
    if (!userId) return;
    setCouponsLoading(true);
    try {
      setAvailableCoupons(await getAvailableCoupons());
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleApplyCoupon = async (code) => {
    const clean = String(code || "").trim().toUpperCase();
    if (!clean) return;
    setApplyingCouponCode(clean);
    setCouponError("");
    try {
      const result = await applyCouponApi(clean);
      setAppliedCoupon({ ...result, couponCode: result?.couponCode || clean });
      setShowCouponsSheet(false);
    } catch (err) {
      setCouponError(err?.message || "Failed to apply coupon.");
    } finally {
      setApplyingCouponCode(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  // The coupon's discount depends on the cart, so whenever the cart total
  // changes (qty edit, item removed, address/delivery change) re-validate it;
  // if it no longer qualifies, drop it and say why.
  const couponCheckedTotalRef = useRef(null);
  useEffect(() => {
    if (!appliedCoupon?.couponCode) {
      couponCheckedTotalRef.current = null;
      return;
    }
    if (couponCheckedTotalRef.current === null) {
      couponCheckedTotalRef.current = cartTotal;
      return;
    }
    if (couponCheckedTotalRef.current === cartTotal) return;
    couponCheckedTotalRef.current = cartTotal;
    const code = appliedCoupon.couponCode;
    applyCouponApi(code)
      .then((result) => setAppliedCoupon({ ...result, couponCode: result?.couponCode || code }))
      .catch((err) => {
        setAppliedCoupon(null);
        setCouponError(`Coupon ${code} removed: ${err?.message || "no longer applicable"}`);
      });
  }, [cartTotal]);

  // What the user actually pays once the coupon is taken off.
  // Cart emptied (last item removed here, or emptied elsewhere) — there's
  // nothing to check out, so leave Checkout for the Cart, which shows its
  // "Your Cart is Empty" state. Goes back if we came from the Cart, otherwise
  // replaces this screen with it (e.g. Buy Now from Home).
  const leftEmptyRef = useRef(false);
  useEffect(() => {
    if (loading || leftEmptyRef.current) return;
    if (cartItems && cartItems.length > 0) return;
    leftEmptyRef.current = true;
    const routes = navigation.getState?.()?.routes || [];
    const prev = routes[routes.length - 2]?.name;
    if (prev === "PgCart") navigation.goBack();
    else navigation.replace("PgCart");
  }, [loading, cartItems]);

  const payableAmount = Math.max(0, Number(cartTotal || 0) - couponDiscount);
  const codAvailable = payableAmount >= COD_MIN_AMOUNT;

  // If the payable amount drops below ₹1,00,000 (item removed, coupon
  // applied), COD isn't allowed any more — fall back to online.
  useEffect(() => {
    if (!codAvailable && paymentMode === "COD") setPaymentMode("CASHFREE");
  }, [codAvailable, paymentMode]);
  // Best saving among coupons this cart already qualifies for — shown as a hint.
  const bestCouponSaving = availableCoupons
    .filter((c) => Number(cartSubtotal || 0) >= Number(c.minimumOrderAmount || 0))
    .reduce((best, c) => Math.max(best, estimateCouponSaving(c, cartSubtotal)), 0);

  const refreshCartAfterEdit = async () => {
    const cart = await getCart(userId, selectedAddressId);
    setCartItems(cart?.itemsInCart || []);
    setCartTotal(cart?.totalPayableAmount || 0);
    setCartSubtotal(cart?.totalCartValue || 0);
    setCartGst(cart?.totalGstCharges || 0);
    setCartMaking(cart?.totalMakingCharges || 0);
    setCartDiscount(cart?.totalDiscountAmount || 0);
    setCartDiscountPct(cart?.totalDiscountPercentage || 0);
    setDeliveryFee(cart?.deliveryFee || 0);
    setDeliveryDistanceKm(cart?.deliveryDistanceKm ?? null);
    setRatePerKm(cart?.ratePerKm ?? null);
  };

  const updateCheckoutItem = async (item, action) => {
    const itemKey = String(item?.cartId ?? item?.productVariantId ?? item?.id);
    const quantity = Number(item?.quantity) || 1;
    if (!itemKey || itemKey === "undefined") return;
    setCartUpdating((current) => ({ ...current, [itemKey]: true }));
    try {
      if (action === "remove") {
        if (!item?.cartId) throw new Error("This cart item cannot be removed right now.");
        await apiDelete(`${PHYSICAL_GOLD_BASE_URL}/cart/${item.cartId}`, { params: { userId } });
      } else if (action === "increment") {
        const productId = item?.productId ?? item?.product?.id;
        const variantId = item?.productVariantId ?? item?.variantId ?? item?.variant?.id;
        if (!productId || !variantId) throw new Error("Product details are missing. Please refresh the cart.");
        await apiPost(`${PHYSICAL_GOLD_BASE_URL}/cart/AddItemToCart`, {
          userId,
          productId,
          productVariantId: variantId,
          quantity: 1,
        });
      } else {
        if (quantity <= 1) return;
        await apiPost(`${PHYSICAL_GOLD_BASE_URL}/cart/decrementCartItems`, {
          userId,
          id: item.cartId,
          productId: item.productId ?? item?.product?.id,
          productVariantId: item.productVariantId ?? item.variantId ?? item?.variant?.id,
          quantity: 1,
        });
      }
      await refreshCartAfterEdit();
    } catch (error) {
      Alert.alert("Cart Update Failed", error?.message || "Please try again.");
    } finally {
      setCartUpdating((current) => ({ ...current, [itemKey]: false }));
    }
  };

  const confirmRemoveCheckoutItem = (item) => {
    Alert.alert(
      "Remove Item",
      `Remove "${getCheckoutItemName(item)}" from your cart?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => updateCheckoutItem(item, "remove") },
      ],
    );
  };

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
        setCartDiscount(cart?.totalDiscountAmount || 0);
        setCartDiscountPct(cart?.totalDiscountPercentage || 0);
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
        setCartDiscount(cart?.totalDiscountAmount || 0);
        setCartDiscountPct(cart?.totalDiscountPercentage || 0);
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
      `Are you sure you want to place this order?\n\nTotal Amount: ₹${Number(payableAmount).toLocaleString("en-IN")}${appliedCoupon ? `\nCoupon: ${appliedCoupon.couponCode} (-₹${couponDiscount.toLocaleString("en-IN")})` : ""}\nPayment: ${paymentMode === "COD" ? "Cash on Delivery" : "Online Payment"}`,
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
        ...(appliedCoupon?.couponCode && { couponCode: appliedCoupon.couponCode }),
      };
      const orderRes = await createOrder(orderPayload);
      if (!orderRes) throw new Error("Failed to create order");

      const orderId = orderRes?.orderId || orderRes?.id;
      const orderNumber = orderRes?.orderNumber;
      const txnId = orderRes?.txnId;
      const totalAmount = orderRes?.totalAmount;

      if (paymentMode === "COD") {
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
        return;
      }

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

          {/* Order: Delivery Address → Your Items → Apply Coupon (right above
              the bill, so the saving shows at once) → Bill details. */}
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
                                color={C.gold}
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

          {cartItems?.length > 0 && (
            <View style={styles.card}>
              <SectionHeader title={`YOUR ITEMS (${cartItems.length})`} />
              {cartItems.map((item, index) => {
                const quantity = Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
                const details = getCheckoutItemDetails(item);
                const productId = item?.productId ?? item?.product?.id;
                const inlineImage = item?.imageUrl || item?.productImage || item?.frontViewurl || item?.product?.imageUrl || item?.product?.image || item?.product?.frontViewurl;
                const imageUrl = resolveImageUrl(inlineImage) || cartItemImages[String(productId)];
                return (
                  <View key={item?.cartId ?? item?.productVariantId ?? item?.id ?? index}>
                    {index > 0 && <View style={styles.itemDivider} />}
                    {(() => {
                      const busyKey = String(item?.cartId ?? item?.productVariantId ?? item?.id ?? index);
                      const busy = !!cartUpdating[busyKey];
                      return (
                        <View style={[styles.checkoutProductRow, busy && { opacity: 0.6 }]}>
                          <View style={styles.checkoutProductImageBox}>
                            {imageUrl ? (
                              <Image source={{ uri: imageUrl }} style={styles.checkoutProductImage} resizeMode="contain" />
                            ) : (
                              <Ionicons name="diamond-outline" size={22} color={C.gold} />
                            )}
                          </View>
                          <View style={styles.checkoutProductInfo}>
                            <View style={styles.checkoutNameRow}>
                              <Text style={styles.checkoutProductName} numberOfLines={2}>
                                {getCheckoutItemName(item)}
                              </Text>
                              <TouchableOpacity
                                style={styles.removeProductAction}
                                onPress={() => confirmRemoveCheckoutItem(item)}
                                disabled={busy}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Remove item from cart"
                              >
                                <Ionicons name="trash-outline" size={14} color={C.red} />
                              </TouchableOpacity>
                            </View>
                            {!!details && (
                              <Text style={styles.checkoutProductDetails} numberOfLines={1}>
                                {details}
                              </Text>
                            )}
                            <View style={styles.checkoutQtyPriceRow}>
                              {/* Same − qty + pill as the Home product cards and the
                                  Cart; at qty 1 the left button removes the item. */}
                              <PgQtyStepper
                                qty={quantity}
                                loading={busy}
                                onIncrement={() => updateCheckoutItem(item, "increment")}
                                onDecrement={() =>
                                  quantity <= 1
                                    ? confirmRemoveCheckoutItem(item)
                                    : updateCheckoutItem(item, "decrement")
                                }
                                style={styles.qtyPill}
                              />
                              <Text style={styles.checkoutProductPrice}>
                                ₹{getCheckoutItemTotal(item).toLocaleString("en-IN")}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Coupons & Offers — inline code input like the ASKOXY.AI app,
              with the full offers list one tap away. ── */}
          <View style={styles.card}>
            <View style={styles.couponHeaderRow}>
              <View style={styles.couponTitleRow}>
                <Ionicons name="pricetag-outline" size={16} color={C.gold} />
                <Text style={styles.couponTitle}>Apply Coupon</Text>
              </View>
              {availableCoupons.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowCouponsSheet(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.couponViewAll}>
                    View offers ({availableCoupons.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {appliedCoupon ? (
              <View style={styles.couponAppliedRow}>
                <Ionicons name="checkmark-circle" size={18} color={C.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.couponAppliedCode}>'{appliedCoupon.couponCode}' applied</Text>
                  <Text style={styles.couponAppliedSave}>
                    You saved ₹{couponDiscount.toLocaleString("en-IN")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    handleRemoveCoupon();
                    setCouponInput("");
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.couponRemove}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.couponInputRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter coupon code"
                    placeholderTextColor={C.navyLight}
                    value={couponInput}
                    onChangeText={(t) => {
                      setCouponInput(t.toUpperCase());
                      setCouponError("");
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => couponInput.trim() && handleApplyCoupon(couponInput)}
                  />
                  <TouchableOpacity
                    style={[
                      styles.couponApplyBtn,
                      (!couponInput.trim() || !!applyingCouponCode) && styles.couponApplyBtnDisabled,
                    ]}
                    disabled={!couponInput.trim() || !!applyingCouponCode}
                    onPress={() => handleApplyCoupon(couponInput)}
                    activeOpacity={0.8}
                  >
                    {applyingCouponCode ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.couponApplyText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {bestCouponSaving > 0 && !couponError && (
                  <Text style={styles.couponHint}>
                    Save up to ₹{bestCouponSaving.toLocaleString("en-IN")} with available offers
                  </Text>
                )}
              </>
            )}
            {!!couponError && !showCouponsSheet && (
              <Text style={styles.couponErrorText}>{couponError}</Text>
            )}
          </View>

          {/* ── Bill details — same shared card as the Cart ── */}
          <View style={styles.billWrap}>
            <BillDetailsCard
              itemCount={cartItems?.length || 0}
              subtotal={cartSubtotal}
              making={cartMaking}
              gst={cartGst}
              discount={cartDiscount}
              deliveryFee={deliveryFee}
              deliveryDistanceKm={deliveryDistanceKm}
              ratePerKm={ratePerKm}
              couponCode={appliedCoupon?.couponCode}
              couponDiscount={couponDiscount}
              total={payableAmount}
              onDiscountPress={() => setShowGstModal(true)}
            />
          </View>
        </Animated.ScrollView>

        {/* ── Bottom panel (same layout as the ASKOXY.AI app's payment
            screen): choose payment method, then total + Place Order. ── */}
        <View style={styles.footer}>
          <Text style={styles.payHeaderText}>Choose Payment Method</Text>

          <View style={styles.payOptionsRow}>
            {[
              { id: "CASHFREE", icon: "card-outline", label: "Online" },
              ...(codAvailable ? [{ id: "COD", icon: "cash-outline", label: "Cash on Delivery" }] : []),
            ].map((opt) => {
              const selected = paymentMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.payOption, selected && styles.payOptionSelected]}
                  onPress={() => setPaymentMode(opt.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={opt.icon} size={18} color={selected ? C.gold : C.navyLight} />
                  <Text style={[styles.payOptionText, selected && styles.payOptionTextSelected]}>
                    {opt.label}
                  </Text>
                  {selected && <View style={styles.payOptionDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {!codAvailable && (
            <View style={styles.payNote}>
              <Ionicons name="information-circle-outline" size={15} color={C.gold} />
              <Text style={styles.payNoteText}>
                Gold & Silver products are online payment only. Cash on Delivery isn't available for this order.
              </Text>
            </View>
          )}

          <View style={styles.footerBottomBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.footerPriceLabel}>Total Amount</Text>
              <Text style={styles.footerPriceValue}>
                ₹{Number(payableAmount).toLocaleString("en-IN")}
              </Text>
              {couponDiscount > 0 && (
                <Text style={styles.footerPriceSub}>Coupon {appliedCoupon?.couponCode} applied</Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                (checkoutLoading || !selectedAddressId || !profileComplete || Object.values(cartUpdating).some(Boolean)) &&
                  styles.checkoutBtnDisabled,
              ]}
              disabled={
                checkoutLoading || !selectedAddressId || !profileComplete || Object.values(cartUpdating).some(Boolean)
              }
              activeOpacity={0.85}
              onPress={handlePay}
            >
              {checkoutLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.checkoutBtnText}>Place Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CouponsSheet
        visible={showCouponsSheet}
        onClose={() => {
          setShowCouponsSheet(false);
          setCouponError("");
        }}
        coupons={availableCoupons}
        loading={couponsLoading}
        amount={cartSubtotal}
        appliedCode={appliedCoupon?.couponCode}
        applyingCode={applyingCouponCode}
        error={couponError}
        onApply={handleApplyCoupon}
        onRemove={handleRemoveCoupon}
      />
      <GstWaiverModal
        visible={showGstModal}
        onClose={() => setShowGstModal(false)}
        isSilver={isSilverCart}
        gstPercentage={cartDiscountPct}
        gstAmount={cartGst}
        waiverAmount={cartDiscount}
      />
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  scrollContent: { paddingTop: 12, paddingBottom: 16 },

  // ── Section Header (same as PgCartScreen) ──
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.navy,
  },

  // ── Cards ──
  // Flat section — full width, no box; a grey band separates sections.
  // White rounded card on the light grey page (same look as Cart / Orders).
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manageText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.navyMid,
    marginBottom: 14,
  },

  // ── Warning box ──
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.warnBg,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.warnBorder,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: C.warn,
    fontWeight: "600",
    lineHeight: 18,
  },

  // ── Address ──
  addressList: { gap: 0 },
  itemDivider: { height: 1, backgroundColor: C.divider, marginVertical: 12 },

  // ── Item rows — same look as the Cart's item rows ──
  checkoutProductRow: { flexDirection: "row", gap: 12, paddingVertical: 4 },
  checkoutProductImageBox: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: "#F7F7F9",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  checkoutProductImage: { width: "100%", height: "100%" },
  checkoutProductInfo: { flex: 1, minWidth: 0, gap: 4 },
  checkoutNameRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  checkoutProductName: { flex: 1, fontSize: 14, fontWeight: "500", color: C.navy, lineHeight: 19 },
  checkoutProductDetails: { fontSize: 13, color: C.navyLight },
  checkoutQtyPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  checkoutProductQuantity: { fontSize: 14, fontWeight: "500", color: C.navy, minWidth: 18, textAlign: "center" },
  checkoutProductPrice: { fontSize: 15, fontWeight: "600", color: C.navy },
  checkoutProductActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyPill: { width: 112 },
  quantityAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityActionOff: { backgroundColor: "#F7F7F9" },
  quantityActionText: { fontSize: 16, fontWeight: "500", color: C.navy, lineHeight: 18 },
  removeProductAction: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FDECEA",
    alignItems: "center",
    justifyContent: "center",
  },

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
  emptyAddressText: { fontSize: 13, color: C.navyMid, fontWeight: "500" },

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
    fontWeight: "600",
    color: C.navyMid,
    letterSpacing: 0.8,
  },
  addrMainText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.navy,
    lineHeight: 18,
    marginBottom: 3,
  },
  addrSubText: { fontSize: 11, color: C.navyLight, marginBottom: 3 },
  addrPinText: {
    fontSize: 10,
    fontWeight: "600",
    color: C.navyLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Coupons & Offers (flat, inline input) ──
  couponHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  couponTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  couponTitle: { fontSize: 14, fontWeight: "600", color: C.navy },
  couponViewAll: { fontSize: 13, fontWeight: "600", color: C.gold },
  couponInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  couponInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: "#D8D2E6",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: C.navy,
  },
  couponApplyBtn: {
    height: 42,
    minWidth: 76,
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  couponApplyBtnDisabled: { opacity: 0.45 },
  couponApplyText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  couponHint: { fontSize: 12, color: C.navyLight, marginTop: 8 },
  couponAppliedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  couponAppliedCode: { fontSize: 14, fontWeight: "600", color: C.navy },
  couponAppliedSave: { fontSize: 12, color: SAVE, fontWeight: "500", marginTop: 2 },
  couponRemove: { fontSize: 13, fontWeight: "600", color: "#E53935" },
  couponErrorText: { fontSize: 12, color: C.red, fontWeight: "500", marginTop: 8 },

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
    fontWeight: "600",
    color: C.navy,
  },

  billWrap: { paddingTop: 0, paddingBottom: 6 },

  // ── Summary Card (matches PgCartScreen summaryCard) ──
  summaryCard: {
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  // Rows are spaced instead of ruled — one line per row looked cramped.
  specDivider: { height: 0 },
  specLabel: { fontSize: 14, color: C.navyMid },
  specValue: { fontSize: 14, fontWeight: "500", color: C.navy },
  specFree: { fontSize: 14, fontWeight: "600", color: SAVE },
  discountLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  discountText: { fontSize: 14, fontWeight: "500", color: SAVE },
  strikeValue: { fontSize: 12, color: C.navyLight, textDecorationLine: "line-through" },
  deliveryRateNote: { fontSize: 11, color: C.navyLight, textAlign: "right", marginTop: -3, marginBottom: 6 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    borderStyle: "dashed",
  },
  grandTotalLabel: { fontSize: 15, fontWeight: "700", color: C.navy },
  grandTotalValue: { fontSize: 20, fontWeight: "700", color: C.navy },
  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F4F0FA",
  },
  savingsText: { flex: 1, fontSize: 13, fontWeight: "600", color: SAVE },

  // ── Bottom panel (ASKOXY.AI payment-screen layout, OxyGold purple) ──
  footer: {
    backgroundColor: C.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "#2A1F4A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  payHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.navy,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F7F9",
  },
  payOptionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  payOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#F7F7F9",
  },
  payOptionSelected: { borderColor: C.gold, backgroundColor: "#F4F0FA" },
  payOptionText: { fontSize: 13, fontWeight: "500", color: C.navyMid },
  payOptionTextSelected: { color: C.gold, fontWeight: "600" },
  payOptionDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.gold,
  },
  payNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F4F0FA",
  },
  payNoteText: { flex: 1, fontSize: 12, fontWeight: "500", color: "#4B3A7A" },
  footerBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  footerPriceLabel: { fontSize: 12, color: C.navyLight, marginBottom: 2 },
  footerPriceValue: { fontSize: 20, fontWeight: "700", color: C.navy, letterSpacing: -0.3 },
  footerPriceSub: { fontSize: 11, color: C.gold, fontWeight: "500", marginTop: 2 },

  checkoutBtn: {
    backgroundColor: CTA,
    borderRadius: 6,
    height: 48,
    paddingHorizontal: 28,
    minWidth: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  checkoutBtnDisabled: { backgroundColor: "#BDBDBD" },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
});

export default PgCheckoutScreen;
