import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Dimensions,
  BackHandler,
  Share,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { selectUserId } from "../../store/authSlice";
import { setCartCount } from "../../store/cartSlice";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import {
  getProductVariants,
  getProductAllImages,
  addToCart,
  getCart,
  generateModelImage,
} from "./physicalGoldApi";
import { performanceMonitor } from "../../utils/performanceMonitor";
import { useApiCall } from "../../hooks/useApiCall";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#0E6B57",
  goldLight: "#F7F4ED",
  goldMid: "#2FA085",
  goldDim: "rgba(14,107,87,0.10)",
  navy: "#1C1C1E",
  navyMid: "#48484C",
  navyLight: "#7A7A80",
  green: "#1F8A4C",
  greenDark: "#1F8A4C",
  greenLight: "#E8F5E9",
  red: "#C0392B",
  redDark: "#C0392B",
  redLight: "#FDECEA",
  border: "#E7E0DA",
  divider: "#EEEBE8",
};

const ALL_VIEWS = [
  { key: "frontViewUrl", label: "Front" },
  { key: "topViewUrl", label: "Top" },
  { key: "leftViewUrl", label: "Left" },
  { key: "rightViewUrl", label: "Right" },
  { key: "backViewUrl", label: "Back" },
  { key: "bottomViewUrl", label: "Bottom" },
];

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const TRUST_ICONS = [
  { icon: "shield-checkmark-outline", label: "BIS\nHallmarked" },
  { icon: "ribbon-outline", label: "Certified\nPurity" },
  { icon: "lock-closed-outline", label: "Secure\nPayment" },
  { icon: "checkmark-done-circle-outline", label: "100%\nAssured" },
];

// AI model preview card — hidden per request.
const SHOW_AI_MODEL_PREVIEW = false;

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <View style={s.secHead}>
    <Text style={s.secTitle}>{title}</Text>
  </View>
);

// ─── Spec Row ─────────────────────────────────────────────────────────────────
const SpecRow = ({ label, value, accent, last }) => (
  <View style={[s.specRow, last && s.specLast]}>
    <Text style={s.specLabel}>{label}</Text>
    <Text style={[s.specVal, accent && s.specAccent]}>{value}</Text>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PgProductDetailsScreen = ({ navigation, route }) => {
  const { productId } = route.params;
  const userId = useSelector(selectUserId);
  const dispatch = useDispatch();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [productImages, setProductImages] = useState({});
  const [availableViews, setAvailableViews] = useState([]);
  const [selectedViewIdx, setSelectedViewIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartMsg, setCartMsg] = useState({ text: "", type: "" });
  const [showModal, setShowModal] = useState(false);
  const [specsExpanded, setSpecsExpanded] = useState(true);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [buyNowLoading, setBuyNowLoading] = useState(false);

  // ── Hardware back
  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      navigation.goBack();
      return true;
    });
    return () => h.remove();
  }, [navigation]);

  // ── Fetch data
  useEffect(() => {
    performanceMonitor.startMeasure('PgProductDetailsScreen');
    (async () => {
      const t0 = Date.now();
      try {
        const res = await getProductVariants(productId);
        const inner = res?.data || res;
        const rawList =
          inner?.listVariantResponse ||
          inner?.variants ||
          (Array.isArray(inner) ? inner : []);
        const rawProd = inner?.productResponse || inner?.product || null;

        let imgs = {};
        try {
          imgs = (await getProductAllImages(productId)) || {};
        } catch (_) {}

        const views = ALL_VIEWS.filter((v) => !!imgs[v.key]);
        setAvailableViews(views);
        setProductImages(imgs);
        setSelectedViewIdx(0);

        const mapped = rawList.map((v) => ({
          id: v.id?.toString(),
          price: v.price || 0,
          mrp: v.mrp || 0,
          imageUrl: v.imageUrl || imgs.frontViewUrl || "",
          purity: v.purity || "",
          size: v.size || "",
          sku: v.sku || "",
          status: v.status || "",
          stockQuantity: v.stockQuantity ?? 0,
          weight: v.weight || 0,
        }));
        setVariants(mapped);
        if (mapped.length) setSelectedVariant(mapped[0]);

        const src = rawProd || route.params?.product || null;
        if (src) {
          setProduct({
            id: src.id?.toString(),
            name: src.name || src.productName || "",
            imageUrl: src.imageUrl || imgs.frontViewUrl || "",
            description: src.description || "",
            status: src.status || "",
            gstPercentage: parseFloat(src.gstPercentage) || 0,
            makingPercentage: parseFloat(src.makingPercentage) || 0,
          });
        }
        performanceMonitor.endMeasure('PgProductDetailsScreen');
      } catch (_) {
        const fb = route.params?.product;
        if (fb) {
          let imgUrl = fb.imageUrl || "";
          if (!imgUrl) {
            try {
              const r2 = await getProductAllImages(productId);
              imgUrl = r2?.frontViewUrl || "";
              const views = ALL_VIEWS.filter((v) => !!r2[v.key]);
              setAvailableViews(views);
              setProductImages(r2 || {});
            } catch (_) {}
          }
          setProduct({
            id: fb.id?.toString(),
            name: fb.productName || fb.name || "",
            imageUrl: imgUrl,
            description: fb.description || "",
            status: fb.status || "",
            gstPercentage: parseFloat(fb.gstPercentage) || 0,
            makingPercentage: parseFloat(fb.makingPercentage) || 0,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  const switchView = (idx) => {
    setSelectedViewIdx(idx);
  };

  // How many units of the currently selected variant are already sitting in
  // the cart — checked on mount/variant-change so "Add to Cart" doesn't lie
  // about a variant the user has already added.
  const refreshCartQuantityForVariant = (cart, variantId) => {
    // selectedVariant.id is a string (.toString() at mapping time) but the
    // cart API returns productVariantId as a number — String() both sides
    // so the match isn't silently defeated by a strict-equality type mismatch.
    const match = cart?.itemsInCart?.find(
      (it) => String(it.productVariantId) === String(variantId)
    );
    setCartQuantity(match?.quantity || 0);
  };

  useEffect(() => {
    if (!userId || !selectedVariant?.id) {
      setCartQuantity(0);
      return;
    }
    let alive = true;
    getCart(userId)
      .then((cart) => { if (alive) refreshCartQuantityForVariant(cart, selectedVariant.id); })
      .catch(() => { if (alive) setCartQuantity(0); });
    return () => { alive = false; };
  }, [userId, selectedVariant?.id]);

  // Adds the selected variant, then switches the CTA into the quantity-stepper
  // state — no blocking alert, matching the web app's inline transition.
  const addSelectedVariantToCart = async () => {
    if (!selectedVariant?.id) {
      Alert.alert("Select Variant", "Please choose a variant first.");
      return false;
    }
    if (!userId) {
      Alert.alert("Session Expired", "Please login again.", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
      return false;
    }
    const t0 = Date.now();
    setCartLoading(true);
    setCartMsg({ text: "", type: "" });
    try {
      await addToCart(userId, product.id, selectedVariant.id, 1);
      getCart(userId)
        .then((cart) => {
          dispatch(setCartCount(cart?.itemsInCart?.length || 0));
          refreshCartQuantityForVariant(cart, selectedVariant.id);
        })
        .catch(() => {});
      return true;
    } catch (e) {
      setTimeout(
        () => {
          setCartMsg({
            text: e?.message || "Could not add to cart. Try again.",
            type: "error",
          });
          setTimeout(() => setCartMsg({ text: "", type: "" }), 4000);
        },
        Math.max(0, 700 - (Date.now() - t0)),
      );
      return false;
    } finally {
      setTimeout(
        () => setCartLoading(false),
        Math.max(0, 700 - (Date.now() - t0)),
      );
    }
  };

  const handleAddToCart = async () => {
    const ok = await addSelectedVariantToCart();
    if (ok) {
      setCartMsg({ text: "Added to cart", type: "success" });
      setTimeout(() => setCartMsg({ text: "", type: "" }), 2500);
    }
  };

  // Buy Now — adds this variant to the cart (if not already there), then
  // jumps straight to Checkout, skipping the Cart screen review step.
  // Order creation always works off the real server-side cart, so this
  // reuses the same add-to-cart + getCart round trip Cart screen itself
  // uses to build the exact params Checkout already expects.
  const handleBuyNow = async () => {
    if (!selectedVariant?.id) {
      Alert.alert("Select Variant", "Please choose a variant first.");
      return;
    }
    if (!userId) {
      Alert.alert("Session Expired", "Please login again.", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
      return;
    }
    setBuyNowLoading(true);
    try {
      if (cartQuantity <= 0) {
        const ok = await addSelectedVariantToCart();
        if (!ok) return;
      }
      const cart = await getCart(userId);
      const cartItems = cart?.itemsInCart || [];
      if (!cartItems.length) {
        Alert.alert("Cart Empty", "Could not add this item. Please try again.");
        return;
      }
      navigation.navigate("PgCheckout", {
        cartTotal: cart?.totalPayableAmount || 0,
        cartItems,
      });
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not proceed. Please try again.");
    } finally {
      setBuyNowLoading(false);
    }
  };

  const handleGenerateModelPreview = async () => {
    if (!currentImageUrl) {
      Alert.alert("No Image", "No product image available to generate preview.");
      return;
    }

    setGeneratingPreview(true);
    setPreviewImageUrl(null);

    try {
      console.log('========================================');
      console.log('[ProductDetails] Generating AI Model Preview');
      console.log('[ProductDetails] Image URL:', currentImageUrl);
      console.log('[ProductDetails] Current View:', currentView?.label);
      console.log('========================================');

      const result = await generateModelImage(currentImageUrl, 'MODEL');
      
      console.log('========================================');
      console.log('[ProductDetails] API Response:', result);
      console.log('========================================');
      
      // API returns { success: true, message: "<url>" }
      const imageUrl = result?.message || result?.generatedImageUrl || result;
      
      if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
        setPreviewImageUrl(imageUrl);
        setShowPreviewModal(true);
      } else {
        Alert.alert("Error", "Failed to generate preview. No image URL returned.");
      }
    } catch (error) {
      console.error('[ProductDetails] Preview generation error:', error);
      Alert.alert(
        "Error",
        error?.message || "Failed to generate preview. Please try again.",
      );
    } finally {
      setGeneratingPreview(false);
    }
  };

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <PgLayout
        title="Product Details"
        showBack
        onBack={() => navigation.goBack()}
      >
        <PgLoader label="Loading product..." />
      </PgLayout>
    );
  }

  // ─── Not found ────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <PgLayout
        title="Product Details"
        showBack
        onBack={() => navigation.goBack()}
      >
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="diamond-outline" size={32} color="#CF8B17" />
          </View>
          <Text style={s.emptyTitle}>Product Not Found</Text>
          <Text style={s.emptySub}>This item may no longer be available.</Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={15} color="#1C1C1E" style={{ marginRight: 6 }} />
            <Text style={s.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const price = selectedVariant?.price || 0;
  const mrp = selectedVariant?.mrp || price;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const inStock = (selectedVariant?.stockQuantity ?? 0) > 0;

  const currentView = availableViews[selectedViewIdx];
  const currentImageUrl = currentView
    ? productImages[currentView.key]
    : selectedVariant?.imageUrl || "";
  const hasImages = availableViews.length > 0;
  const hasMultiple = availableViews.length > 1;

  // ─── Share — native OS share sheet (WhatsApp, copy link, etc. all handled
  // by the OS itself), matching the web app's "Share this product" action. ──
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} on OXYGOLD.AI — ₹${fmt(price)}`,
      });
    } catch (err) {
      console.log("[ProductDetails] Share failed:", err?.message);
    }
  };

  return (
    <PgLayout
      title={product.name || "Product Details"}
      showBack
      onBack={() => navigation.goBack()}
      hideBottomBar={false}
    >
      <View style={s.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
        <FadeSlideIn key={product?.id || "product"}>
          {/* ──────────────── HERO ──────────────── */}
          <View style={s.hero}>
            {/* Offer badge — only shown when the API returns a real MRP vs. price discount */}
            {discount > 0 && (
              <View style={s.badgeOffer}>
                <Text style={s.badgeOfferText}>{discount}% OFF</Text>
              </View>
            )}

            {/* Image */}
            {hasImages ? (
              <TouchableOpacity
                style={s.heroImageWrap}
                onPress={() => setShowModal(true)}
                activeOpacity={0.95}
              >
                <Image
                  source={{ uri: currentImageUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : (
              <View style={s.coinFallback}>
                <Text style={s.coinWeight}>
                  {selectedVariant?.weight ? `${selectedVariant.weight}g` : "—"}
                </Text>
                <View style={s.coinLine} />
                <Text style={s.coinSub}>
                  {selectedVariant?.purity || product.name}
                </Text>
              </View>
            )}

            {/* Arrows */}
            {hasMultiple && (
              <TouchableOpacity
                style={[s.arrow, s.arrowLeft]}
                onPress={() =>
                  switchView(
                    (selectedViewIdx - 1 + availableViews.length) %
                      availableViews.length,
                  )
                }
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={18} color={C.navyLight} />
              </TouchableOpacity>
            )}
            {hasMultiple && (
              <TouchableOpacity
                style={[s.arrow, s.arrowRight]}
                onPress={() =>
                  switchView((selectedViewIdx + 1) % availableViews.length)
                }
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-forward" size={18} color={C.navyLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Dot indicators — below the image, not overlaid on it */}
          {hasMultiple && (
            <View style={s.dotBar}>
              {availableViews.map((v, i) => (
                <TouchableOpacity
                  key={v.key}
                  onPress={() => switchView(i)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <View
                    style={[s.dot, i === selectedViewIdx && s.dotActive]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ──────────────── BODY ──────────────── */}
          <View style={s.body}>
            {/* Title + price row */}
            <View style={s.titleRow}>
              <View style={s.titleRowLeft}>
                <Text style={s.name}>{product.name}</Text>
                <View style={s.trustRow}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#CF8B17" />
                  <Text style={s.trustText}>BIS Hallmarked</Text>
                </View>
                <TouchableOpacity
                  style={s.shareRow}
                  onPress={handleShare}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="share-social-outline" size={14} color={C.gold} />
                  <Text style={s.shareText}>Share this product</Text>
                </TouchableOpacity>
              </View>
              <View style={s.priceBlock}>
                <Text style={s.priceValue}>₹{fmt(price)}</Text>
                {mrp > price && (
                  <View style={s.priceStrikeRow}>
                    <Text style={s.priceStrike}>₹{fmt(mrp)}</Text>
                    <View style={s.discPill}>
                      <Text style={s.discPillText}>{discount}% OFF</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {product.description ? (
              <Text style={s.desc}>{product.description}</Text>
            ) : null}

            {/* ── Trust Icons Strip ── */}
            <View style={s.trustGrid}>
              {TRUST_ICONS.map((t, i) => (
                <React.Fragment key={t.label}>
                  <View style={s.trustGridItem}>
                    <Ionicons name={t.icon} size={20} color="#CF8B17" />
                    <Text style={s.trustGridLabel}>{t.label}</Text>
                  </View>
                  {i < TRUST_ICONS.length - 1 && <View style={s.trustGridDivider} />}
                </React.Fragment>
              ))}
            </View>

            {/* ── Delivery note + Variant Selector ── */}
            <View style={s.deliveryVariantWrap}>
              <View style={s.freeDeliveryNoteRow}>
                <Ionicons name="cube-outline" size={14} color={C.green} />
                <Text style={s.freeDeliveryNote}>Free Delivery · Pan India</Text>
              </View>

              {/* Variant Selector */}
              {variants.length > 1 && (
                <View style={s.variantInPrice}>
                  <Text style={s.variantInPriceLabel}>Select Weight / Variant</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.chipScroll}
                  >
                    {variants.map((v) => {
                      const active = selectedVariant?.id === v.id;
                      const vStock = (v.stockQuantity ?? 0) > 0;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[
                            s.chip,
                            active && s.chipActive,
                            !vStock && s.chipOos,
                          ]}
                          onPress={() => setSelectedVariant(v)}
                          activeOpacity={0.8}
                          disabled={!vStock}
                        >
                          {active && <View style={s.chipActiveBg} />}
                          <Text
                            style={[s.chipWeight, active && s.chipWeightActive]}
                          >
                            {v.weight}g
                          </Text>
                          {v.purity ? (
                            <Text
                              style={[s.chipPurity, active && s.chipPurityActive]}
                            >
                              {v.purity}
                            </Text>
                          ) : null}
                          <Text
                            style={[s.chipPrice, active && s.chipPriceActive]}
                          >
                            ₹{fmt(v.price)}
                          </Text>
                          {!vStock && <Text style={s.chipOosText}>Sold Out</Text>}
                          {active && <View style={s.chipDot} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ── Variant Selector ── */}
            {variants.length === 0 && (
              <View style={s.card}>
                <SectionHeader title="Availability" />
                <Text style={s.noVariant}>
                  No variants available yet. Please check back later.
                </Text>
              </View>
            )}



            {/* ── Specifications Dropdown ── */}
            {selectedVariant && (
              <View style={s.card}>
                <TouchableOpacity
                  style={s.specDropdownBtn}
                  onPress={() => setSpecsExpanded(!specsExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={s.specDropdownTitle}>Specifications</Text>
                  <View style={s.specViewMoreWrap}>
                    <Text style={s.specViewMoreText}>
                      {specsExpanded ? "View Less" : "View More"}
                    </Text>
                    <Ionicons
                      name={specsExpanded ? "chevron-up" : "chevron-forward"}
                      size={14}
                      color={C.gold}
                    />
                  </View>
                </TouchableOpacity>

                {specsExpanded && (
                  <View style={s.specDropdownContent}>
                    {selectedVariant.weight ? (
                      <SpecRow
                        label="Weight"
                        value={`${selectedVariant.weight} grams`}
                      />
                    ) : null}
                    {selectedVariant.purity ? (
                      <SpecRow
                        label="Purity"
                        value={selectedVariant.purity}
                        accent
                      />
                    ) : null}
                    {selectedVariant.size ? (
                      <SpecRow label="Size" value={selectedVariant.size} />
                    ) : null}
                    {selectedVariant.sku ? (
                      <SpecRow label="SKU" value={selectedVariant.sku} />
                    ) : null}
                    <SpecRow
                      label="Availability"
                      value={
                        inStock
                          ? `${selectedVariant.stockQuantity} units in stock`
                          : "Out of stock"
                      }
                      last
                    />
                  </View>
                )}
              </View>
            )}

            {/* ── AI Model Preview Button — hidden per request ── */}
            {SHOW_AI_MODEL_PREVIEW && hasImages && currentImageUrl && (
              <View style={s.card}>
                <SectionHeader title="AI Model Preview" />
                <Text style={s.previewDesc}>
                  Generate an AI model preview of this product
                </Text>
                
                <TouchableOpacity
                  style={[
                    s.previewBtn,
                    generatingPreview && s.previewBtnLoading,
                  ]}
                  onPress={handleGenerateModelPreview}
                  disabled={generatingPreview}
                  activeOpacity={0.8}
                >
                  {generatingPreview ? (
                    <>
                      <ActivityIndicator size="small" color={C.gold} />
                      <Text style={s.previewBtnText}>Generating Preview...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles-outline" size={16} color={C.gold} style={{ marginRight: 2 }} />
                      <Text style={s.previewBtnText}>Generate AI Model Preview</Text>
                      <Ionicons name="arrow-forward" size={15} color={C.gold} />
                    </>
                  )}
                </TouchableOpacity>

                <View style={s.previewNoteRow}>
                  <Ionicons name="information-circle-outline" size={13} color={C.navyLight} />
                  <Text style={s.previewNote}>Preview how this product looks on a model</Text>
                </View>
              </View>
            )}



            {/* Cart message */}
            {cartMsg.text ? (
              <View
                style={[
                  s.cartMsg,
                  cartMsg.type === "error" ? s.cartMsgErr : s.cartMsgOk,
                ]}
              >
                <Ionicons
                  name={cartMsg.type === "error" ? "close-circle" : "checkmark-circle"}
                  size={14}
                  color={cartMsg.type === "error" ? "#8B3A34" : "#1F8A4C"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    s.cartMsgText,
                    cartMsg.type === "error"
                      ? s.cartMsgErrText
                      : s.cartMsgOkText,
                  ]}
                >
                  {cartMsg.text}
                </Text>
                {cartMsg.type !== "error" && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("PgCart")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={s.viewCartLink}>View Cart</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>
        </FadeSlideIn>
        </ScrollView>

        {/* ──────────────── FOOTER ──────────────── */}
        <View style={s.footer}>
          <View style={s.footerPriceRow}>
            <Text style={s.footerLabel}>Price</Text>
            <Text style={s.footerPrice}>₹{fmt(price)}</Text>
          </View>
          {!inStock ? (
            <View style={s.outOfStockBtn}>
              <Text style={[s.cartBtnText, s.cartBtnTextDis]}>Out of Stock</Text>
            </View>
          ) : (
            <View style={s.footerActions}>
              <TouchableOpacity
                style={s.cartBtnOutline}
                onPress={cartQuantity > 0 ? () => navigation.navigate("PgCart") : handleAddToCart}
                disabled={!selectedVariant || cartLoading || buyNowLoading}
                activeOpacity={0.85}
              >
                {cartLoading ? (
                  <ActivityIndicator size="small" color={C.gold} />
                ) : cartQuantity > 0 ? (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color={C.gold} style={{ marginRight: 6 }} />
                    <Text style={s.cartBtnTextOutline}>Qty {cartQuantity}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={16} color={C.gold} style={{ marginRight: 6 }} />
                    <Text style={s.cartBtnTextOutline}>Add to Cart</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.buyNowBtn}
                onPress={handleBuyNow}
                disabled={!selectedVariant || cartLoading || buyNowLoading}
                activeOpacity={0.85}
              >
                {buyNowLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={s.cartBtnText}>Buy Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ──────────────── FULLSCREEN IMAGE MODAL ──────────────── */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={s.modal}>
          {/* Close */}
          <TouchableOpacity
            style={s.modalClose}
            onPress={() => setShowModal(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Image with pinch-zoom via ScrollView */}
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            contentContainerStyle={s.modalImgWrap}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            centerContent
          >
            <Image
              source={{ uri: currentImageUrl }}
              style={s.modalImg}
              resizeMode="contain"
            />
          </ScrollView>

          {/* Bottom: view label + nav */}
          <View style={s.modalBar}>
            {hasMultiple ? (
              <>
                <TouchableOpacity
                  style={s.modalNavBtn}
                  onPress={() =>
                    switchView(
                      (selectedViewIdx - 1 + availableViews.length) %
                        availableViews.length,
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text style={s.modalNavText}>‹ Prev</Text>
                </TouchableOpacity>

                <View style={{ alignItems: "center" }}>
                  <Text style={s.modalViewLabel}>
                    {currentView?.label || ""} View
                  </Text>
                  <Text style={s.modalCounter}>
                    {selectedViewIdx + 1} / {availableViews.length}
                  </Text>
                </View>

                <TouchableOpacity
                  style={s.modalNavBtn}
                  onPress={() =>
                    switchView((selectedViewIdx + 1) % availableViews.length)
                  }
                  activeOpacity={0.8}
                >
                  <Text style={s.modalNavText}>Next ›</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={s.modalViewLabel}>
                {currentView?.label || ""} View
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* ──────────────── AI MODEL PREVIEW MODAL ──────────────── */}
      <Modal
        visible={showPreviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={s.modal}>
          <TouchableOpacity
            style={s.modalClose}
            onPress={() => setShowPreviewModal(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            contentContainerStyle={s.modalImgWrap}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            centerContent
          >
            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                style={s.modalImg}
                resizeMode="contain"
              />
            ) : (
              <ActivityIndicator size="large" color={C.gold} />
            )}
          </ScrollView>

          <View style={s.modalBar}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={s.modalViewLabel}>AI Model Preview</Text>
              <Text style={s.modalCounter}>Generated with AI</Text>
            </View>
          </View>
        </View>
      </Modal>
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E0DA",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  heroImageWrap: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
  },

  // Offer badge — only shown when the API returns a real discount
  badgeOffer: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: C.redDark,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    zIndex: 4,
  },
  badgeOfferText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // Arrows
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E0DA",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },

  // Trust row — small BIS line under the title
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  trustText: { fontSize: 12, fontWeight: "600", color: "#CF8B17" },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  shareText: { fontSize: 11.5, fontWeight: "600", color: C.gold },

  // Dots
  dotBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E7E0DA",
  },
  dotActive: { width: 16, backgroundColor: C.gold },

  // Coin fallback
  coinFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: C.goldLight,
    borderWidth: 2,
    borderColor: "#CF8B17",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  coinWeight: {
    fontSize: 26,
    fontWeight: "700",
    color: "#CF8B17",
    lineHeight: 30,
  },
  coinLine: {
    width: 44,
    height: 1,
    backgroundColor: "rgba(14,107,87,0.3)",
    marginVertical: 4,
  },
  coinSub: { fontSize: 10, fontWeight: "600", color: "#CF8B17" },

  // ── Body ─────────────────────────────────────────────────────────────────
  body: { paddingHorizontal: 16 },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: C.navy,
    lineHeight: 28,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  desc: { fontSize: 13, color: C.navyLight, lineHeight: 20, marginBottom: 14 },

  // ── Title + Price row ──────────────────────────────────────────────────────
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  titleRowLeft: { flex: 1, marginRight: 12 },
  priceBlock: { alignItems: "flex-end" },
  priceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: C.green,
    letterSpacing: -0.5,
  },
  priceStrikeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  priceStrike: {
    fontSize: 13,
    color: C.red,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  discPill: {
    backgroundColor: C.goldLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discPillText: { fontSize: 10, fontWeight: "700", color: C.navy },

  // ── Trust icons strip ──────────────────────────────────────────────────────
  trustGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    marginBottom: 12,
  },
  trustGridItem: { flex: 1, alignItems: "center", gap: 6, paddingHorizontal: 4 },
  trustGridLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: C.navyMid,
    textAlign: "center",
    lineHeight: 13,
  },
  trustGridDivider: { width: 1, height: 30, backgroundColor: C.divider },

  // ── Delivery note + variant selector ──────────────────────────────────────
  deliveryVariantWrap: { marginBottom: 12 },
  freeDeliveryNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  freeDeliveryNote: { fontSize: 12, fontWeight: "600", color: C.navyLight },

  // Variant selector
  variantInPrice: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(14,107,87,0.20)",
  },
  variantInPriceLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.navyMid,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // Total charges row in green
  totalChargesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(14,107,87,0.20)",
  },
  totalChargesLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.greenDark,
  },
  totalChargesValue: {
    fontSize: 18,
    fontWeight: "700",
    color: C.green,
    letterSpacing: -0.3,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },

  // ── Section Header ────────────────────────────────────────────────────────
  secHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  secTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.navy,
  },

  // ── Specifications Dropdown ───────────────────────────────────────────────
  specDropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  specDropdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.navy,
  },
  specViewMoreWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  specViewMoreText: { fontSize: 12.5, fontWeight: "600", color: C.navyMid },
  specDropdownContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },

  // ── Variant Chips ─────────────────────────────────────────────────────────
  chipScroll: { paddingRight: 4, paddingTop: 2, paddingBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: "center",
    minWidth: 70,
    backgroundColor: C.bg,
    overflow: "hidden",
  },
  chipActive: { borderColor: C.gold },
  chipOos: { opacity: 0.45 },
  chipActiveBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.goldDim,
  },
  chipWeight: { fontSize: 15, fontWeight: "700", color: C.navy },
  chipWeightActive: { color: C.navy },
  chipPurity: { fontSize: 10, color: C.navyLight, marginTop: 1 },
  chipPurityActive: { color: "#CF8B17" },
  chipPrice: {
    fontSize: 11,
    fontWeight: "700",
    color: C.navyMid,
    marginTop: 3,
  },
  chipPriceActive: { color: C.navy },
  chipOosText: { fontSize: 9, color: C.red, marginTop: 3, fontWeight: "700" },
  chipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
    marginTop: 5,
  },

  // ── Spec Rows ─────────────────────────────────────────────────────────────
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  specLast: { borderBottomWidth: 0, paddingBottom: 0 },
  specLabel: { fontSize: 13, color: C.navyLight },
  specVal: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navy,
    flex: 1,
    textAlign: "right",
  },
  specAccent: { color: "#CF8B17" },

  // ── Cart Message ──────────────────────────────────────────────────────────
  cartMsg: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  cartMsgOk: { backgroundColor: "#E8F5E9", borderColor: "#E8F5E9" },
  cartMsgErr: { backgroundColor: "#FDECEA", borderColor: "#FDECEA" },
  cartMsgText: { flex: 1, fontSize: 13, fontWeight: "600" },
  cartMsgOkText: { color: C.green },
  cartMsgErrText: { color: C.red },
  viewCartLink: { fontSize: 12.5, fontWeight: "700", color: C.gold, marginLeft: 8 },

  // ── AI Model Preview ──────────────────────────────────────────────────────
  previewDesc: {
    fontSize: 12,
    color: C.navyLight,
    marginBottom: 14,
    lineHeight: 18,
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.goldLight,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  previewBtnLoading: {
    opacity: 0.6,
  },
  previewBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.navy,
  },
  previewNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 10,
  },
  previewNote: {
    fontSize: 10,
    color: C.navyLight,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E7E0DA",
    paddingBottom: 24,
  },
  footerPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.navyLight,
    letterSpacing: 0.3,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: C.green,
    letterSpacing: -0.5,
  },

  footerActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  cartBtnOutline: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBtnTextOutline: {
    fontSize: 14,
    fontWeight: "700",
    color: C.gold,
    letterSpacing: 0.2,
  },
  buyNowBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#CF8B17",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  outOfStockBtn: {
    flexDirection: "row",
    backgroundColor: C.border,
    borderRadius: 14,
    height: 50,
    marginHorizontal: 16,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  cartBtnTextDis: { color: C.navyLight },

  // ── Empty State ───────────────────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 90,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.goldLight,
    borderWidth: 1,
    borderColor: C.goldMid,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.navy,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: C.navyLight,
    textAlign: "center",
    marginBottom: 26,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "600", color: "#1C1C1E" },

  // ── Fullscreen Modal ──────────────────────────────────────────────────────
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 52,
    right: 18,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: { fontSize: 22, color: "#fff", fontWeight: "300" },
  modalImgWrap: {
    minHeight: SH,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImg: { width: SW, height: SH * 0.72 },
  modalBar: {
    position: "absolute",
    bottom: 38,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modalNavBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  modalNavText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  modalViewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
  modalCounter: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
    textAlign: "center",
  },
});

export default PgProductDetailsScreen;
