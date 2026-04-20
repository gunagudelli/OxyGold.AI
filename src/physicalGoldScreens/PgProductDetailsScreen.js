import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
} from "react-native";
import { useSelector } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { apiPost } from "../services/apiClient";
import { PHYSICAL_GOLD_BASE_URL } from "../constants/api";
import PgLayout from "../../components/physical/PgLayout";
import { getProductVariants, getProductAllImages, addToCart } from "./physicalGoldApi";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:            '#FAFAF8',
  card:          '#FFFFFF',
  gold:          '#C8952A',
  goldLight:     '#FDF3DC',
  goldMid:       '#E8C97A',
  goldDim:       'rgba(200,149,42,0.10)',
  goldDimBorder: 'rgba(200,149,42,0.35)',
  navy:          '#1C2340',
  navyMid:       '#3D4463',
  navyLight:     '#8891AF',
  green:         '#0E9F6E',
  greenBg:       '#ECFDF5',
  greenBorder:   '#A7F3D0',
  red:           '#E02424',
  redBg:         '#FEF2F2',
  redBorder:     '#FECACA',
  border:        '#EBEBEB',
  divider:       '#F4F3F0',
  surfaceAlt:    '#FAFAF8',
};

const ALL_VIEWS = [
  { key: 'frontViewUrl',  label: 'Front'  },
  { key: 'topViewUrl',    label: 'Top'    },
  { key: 'leftViewUrl',   label: 'Left'   },
  { key: 'rightViewUrl',  label: 'Right'  },
  { key: 'backViewUrl',   label: 'Back'   },
  { key: 'bottomViewUrl', label: 'Bottom' },
];

// ─── Shimmer ──────────────────────────────────────────────────────────────────
const ShimmerBox = ({ width, height, borderRadius = 8 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });
  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: C.goldMid, opacity }}
    />
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ─── Spec Row ─────────────────────────────────────────────────────────────────
const SpecRow = ({ label, value, gold, last }) => (
  <View style={[styles.specRow, last && styles.specRowLast]}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={[styles.specValue, gold && styles.specGold]}>{value}</Text>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PgProductDetailsScreen = ({ navigation, route }) => {
  const { productId } = route.params;
  const userId = useSelector(selectUserId);

  const [product,           setProduct]           = useState(null);
  const [variants,          setVariants]          = useState([]);
  const [selectedVariant,   setSelectedVariant]   = useState(null);
  const [productImages,     setProductImages]     = useState({});
  const [availableViews,    setAvailableViews]    = useState([]);
  const [selectedViewIndex, setSelectedViewIndex] = useState(0);
  const [loading,           setLoading]           = useState(true);
  const [cartLoading,       setCartLoading]       = useState(false);
  const [cartMsg,           setCartMsg]           = useState({ text: "", type: "" });

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const heroAnim  = useRef(new Animated.Value(0)).current;
  const imgFade   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.spring(heroAnim,  { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    (async () => {
      const startTime = Date.now();
      try {
        const res = await getProductVariants(productId);
        const inner = res?.data || res;
        const variantList =
          inner?.listVariantResponse ||
          inner?.variants ||
          (Array.isArray(inner) ? inner : []);
        const productData = inner?.productResponse || inner?.product || null;

        let allProductImages = {};
        try {
          const imgRes = await getProductAllImages(productId);
          console.log('[PgProductDetails] Product images:', imgRes);
          allProductImages = imgRes || {};
        } catch (err) {
          console.log('[PgProductDetails] Error fetching product images:', err);
        }

        const available = ALL_VIEWS.filter((v) => !!allProductImages[v.key]);
        setAvailableViews(available);
        setProductImages(allProductImages);
        setSelectedViewIndex(0);

        const mapped = variantList.map((v) => ({
          id:            v.id?.toString(),
          price:         v.price || 0,
          mrp:           v.mrp || 0,
          imageUrl:      v.imageUrl || allProductImages?.frontViewUrl || "",
          purity:        v.purity || "",
          size:          v.size || "",
          sku:           v.sku || "",
          status:        v.status || "",
          stockQuantity: v.stockQuantity ?? 0,
          weight:        v.weight || 0,
        }));
        setVariants(mapped);
        if (mapped.length > 0) setSelectedVariant(mapped[0]);

        const src = productData || route.params?.product || null;
        if (src) {
          setProduct({
            id:               src.id?.toString(),
            name:             src.name || src.productName || "",
            imageUrl:         src.imageUrl || allProductImages?.frontViewUrl || "",
            description:      src.description || "",
            status:           src.status || "",
            gstPercentage:    src.gstPercentage,
            makingPercentage: src.makingPercentage,
          });
        }
      } catch (e) {
        const fallback = route.params?.product;
        if (fallback) {
          let imgUrl = fallback.imageUrl || "";
          if (!imgUrl) {
            try {
              const imgRes = await getProductAllImages(productId);
              imgUrl = imgRes?.frontViewUrl || "";
              const available = ALL_VIEWS.filter((v) => !!imgRes[v.key]);
              setAvailableViews(available);
              setProductImages(imgRes);
            } catch {}
          }
          setProduct({
            id:          fallback.id?.toString(),
            name:        fallback.productName || fallback.name || "",
            imageUrl:    imgUrl,
            description: fallback.description || "",
            status:      fallback.status || "",
          });
        }
      } finally {
        const remaining = Math.max(0, 800 - (Date.now() - startTime));
        setTimeout(() => setLoading(false), remaining);
      }
    })();
  }, [productId]);

  const switchImage = (newIndex) => {
    Animated.timing(imgFade, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setSelectedViewIndex(newIndex);
      Animated.timing(imgFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const goPrev = () => switchImage((selectedViewIndex - 1 + availableViews.length) % availableViews.length);
  const goNext = () => switchImage((selectedViewIndex + 1) % availableViews.length);

  // Auto-slide every 3 seconds
  const autoSlideRef = useRef(null);
  const selectedViewIndexRef = useRef(selectedViewIndex);
  selectedViewIndexRef.current = selectedViewIndex;

  useEffect(() => {
    if (availableViews.length <= 1) return;
    autoSlideRef.current = setInterval(() => {
      const next = (selectedViewIndexRef.current + 1) % availableViews.length;
      switchImage(next);
    }, 3000);
    return () => clearInterval(autoSlideRef.current);
  }, [availableViews.length]);

  if (loading) {
    return (
      <PgLayout title="Product Details" showBack onBack={() => navigation.goBack()}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroShimmerWrap}>
            <ShimmerBox width="100%" height={300} borderRadius={22} />
          </View>
          <View style={styles.shimmerBody}>
            <ShimmerBox width="65%" height={20} />
            <View style={{ height: 10 }} />
            <ShimmerBox width="40%" height={14} />
            <View style={{ height: 20 }} />
            <ShimmerBox width="100%" height={80} borderRadius={18} />
            <View style={{ height: 16 }} />
            <ShimmerBox width="100%" height={120} borderRadius={16} />
            <View style={{ height: 16 }} />
            <ShimmerBox width="100%" height={100} borderRadius={16} />
          </View>
        </ScrollView>
      </PgLayout>
    );
  }

  if (!product) {
    return (
      <PgLayout title="Product Details" showBack onBack={() => navigation.goBack()}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIcon}>🪙</Text>
          </View>
          <Text style={styles.emptyTitle}>Product Not Found</Text>
          <Text style={styles.emptySubtitle}>This item may no longer be available</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  const price      = selectedVariant?.price || 0;
  const mrp        = selectedVariant?.mrp || price;
  const discount   = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const totalPrice = price;
  const inStock    = (selectedVariant?.stockQuantity ?? 0) > 0;

  const heroTranslate   = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const currentView     = availableViews[selectedViewIndex];
  const currentImageUrl = currentView
    ? productImages[currentView.key]
    : (selectedVariant?.imageUrl || "");
  const hasImages   = availableViews.length > 0;
  const hasMultiple = availableViews.length > 1;

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) { Alert.alert("Error", "Please select a valid variant"); return; }
    if (!userId) {
      Alert.alert("Session Expired", "Please login again", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
      return;
    }
    setCartLoading(true);
    setCartMsg({ text: "", type: "" });
    const startTime = Date.now();
    try {
      await addToCart(userId, product.id, selectedVariant.id, 1);
      const elapsed = Date.now() - startTime;
      setTimeout(() => {
        Alert.alert("Success", "Item added to cart!", [
          { text: "OK", onPress: () => navigation.navigate("PgCart") },
        ]);
      }, Math.max(0, 800 - elapsed));
    } catch (e) {
      const elapsed = Date.now() - startTime;
      setTimeout(() => {
        setCartMsg({ text: e?.message || "Failed to add to cart", type: "error" });
        setTimeout(() => setCartMsg({ text: "", type: "" }), 4000);
      }, Math.max(0, 800 - elapsed));
    } finally {
      const elapsed = Date.now() - startTime;
      setTimeout(() => setCartLoading(false), Math.max(0, 800 - elapsed));
    }
  };

  return (
    <PgLayout
      title={product.name || "Product Details"}
      showBack
      onBack={() => navigation.goBack()}
      hideBottomBar={false}
    >
      <View style={styles.root}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ── Hero Panel ── */}
          <Animated.View
            style={[styles.hero, { opacity: heroAnim, transform: [{ translateY: heroTranslate }] }]}
          >
            <View style={styles.heroRing1} />
            <View style={styles.heroRing2} />
            <View style={styles.heroRing3} />

            {hasImages ? (
              <View style={styles.heroImageWrap}>
                <Animated.Image
                  source={{ uri: currentImageUrl }}
                  style={[styles.heroImage, { opacity: imgFade }]}
                  resizeMode="cover"
                  onError={(e) => console.log('[Image Error]', currentView?.key, e.nativeEvent.error)}
                />
                <View style={styles.heroImageGradient} />
              </View>
            ) : (
              <View style={styles.heroCoin}>
                <Text style={styles.heroCoinWeight}>
                  {selectedVariant?.weight ? `${selectedVariant.weight}g` : "—"}
                </Text>
                <View style={styles.heroCoinDivider} />
                <Text style={styles.heroCoinSub}>{selectedVariant?.purity || product.name}</Text>
              </View>
            )}

            {/* ── Badges row — top left ── */}
            <View style={styles.heroBadgeRow}>
              {selectedVariant?.purity ? (
                <View style={styles.heroBadgePill}>
                  <View style={styles.heroBadgeDot} />
                  <Text style={styles.heroBadgePillText}>{selectedVariant.purity}</Text>
                </View>
              ) : null}

              {/* FIX: BIS badge — solid dark bg + bright gold text for full contrast */}
              <View style={styles.heroCertPill}>
                <Text style={styles.heroCertText}>✓ BIS Hallmarked</Text>
              </View>

              {discount > 0 && (
                <View style={styles.heroDiscountPill}>
                  <Text style={styles.heroDiscountText}>{discount}% OFF</Text>
                </View>
              )}
            </View>

            {hasMultiple && (
              <TouchableOpacity style={styles.arrowLeft} onPress={goPrev} activeOpacity={0.75}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
            )}
            {hasMultiple && (
              <TouchableOpacity style={styles.arrowRight} onPress={goNext} activeOpacity={0.75}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            )}

            {/* FIX: Stock badge — solid opaque bg for strong visibility */}
            <View style={[styles.heroStockPill, inStock ? styles.heroStockIn : styles.heroStockOut]}>
              <View style={[styles.heroStockDot, inStock ? styles.heroStockDotIn : styles.heroStockDotOut]} />
              <Text style={[styles.heroStockText, inStock ? styles.heroStockTextIn : styles.heroStockTextOut]}>
                {inStock ? "In Stock" : "Out of Stock"}
              </Text>
            </View>

            {hasImages && hasMultiple && (
              <View style={styles.heroBottom}>
                <View style={styles.dotRow}>
                  {availableViews.map((_, idx) => (
                    <View key={idx} style={[styles.dot, idx === selectedViewIndex && styles.dotActive]} />
                  ))}
                </View>
              </View>
            )}
          </Animated.View>

          {/* ── Body ── */}
          <Animated.View style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            <Text style={styles.productName}>{product.name}</Text>
            {product.description ? <Text style={styles.descText}>{product.description}</Text> : null}

            {/* ── FIX: Price Card — 3 columns, compact, clear hierarchy ── */}
            <View style={styles.priceCard}>
              <View style={styles.priceRing1} />
              <View style={styles.priceRing2} />

              {/* Price column */}
              <View style={styles.priceCol}>
                <Text style={styles.priceColLabel}>PRICE</Text>
                <Text style={styles.priceColValue}>₹{Number(price).toLocaleString("en-IN")}</Text>
              </View>

              <View style={styles.priceDividerV} />

              {/* MRP column */}
              <View style={styles.priceCol}>
                <Text style={styles.priceColLabel}>MRP</Text>
                {mrp > price ? (
                  <>
                    <Text style={styles.priceMrpStrike}>₹{Number(mrp).toLocaleString("en-IN")}</Text>
                    <View style={styles.priceDiscBadge}>
                      <Text style={styles.priceDiscText}>-{discount}%</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.priceColValue}>₹{Number(mrp).toLocaleString("en-IN")}</Text>
                )}
              </View>

              <View style={styles.priceDividerV} />

              {/* Delivery column */}
              <View style={styles.priceCol}>
                <Text style={styles.priceColLabel}>DELIVERY</Text>
                <Text style={styles.priceFreeText}>FREE</Text>
                <Text style={styles.priceDeliveryNote}>Pan India</Text>
              </View>
            </View>

            {/* ── FIX: Variants — compact horizontal chips ── */}
            {variants.length === 0 && (
              <View style={styles.card}>
                <SectionHeader title="Availability" />
                <Text style={styles.noVariantText}>No variants available yet. Please check back later.</Text>
              </View>
            )}
            {variants.length > 1 && (
              <View style={styles.card}>
                <SectionHeader title="Select Variant" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.variantScroll}
                >
                  {variants.map((v) => {
                    const active = selectedVariant?.id === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.variantChip, active && styles.variantChipActive]}
                        onPress={() => setSelectedVariant(v)}
                        activeOpacity={0.8}
                      >
                        {/* Weight — prominent */}
                        <Text style={[styles.variantChipWeight, active && styles.variantChipWeightActive]}>
                          {v.weight}g
                        </Text>
                        {/* Purity — small below */}
                        {v.purity ? (
                          <Text style={[styles.variantChipPurity, active && styles.variantChipPurityActive]}>
                            {v.purity}
                          </Text>
                        ) : null}
                        {/* Price */}
                        <Text style={[styles.variantChipPrice, active && styles.variantChipPriceActive]}>
                          ₹{Number(v.price).toLocaleString("en-IN")}
                        </Text>
                        {active && <View style={styles.variantActiveDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Specifications */}
            {selectedVariant && (
              <View style={styles.card}>
                <SectionHeader title="Specifications" />
                {selectedVariant.weight   ? <SpecRow label="Weight" value={`${selectedVariant.weight} grams`} /> : null}
                {selectedVariant.purity   ? <SpecRow label="Purity" value={selectedVariant.purity} gold /> : null}
                {selectedVariant.size     ? <SpecRow label="Size"   value={selectedVariant.size} /> : null}
                {selectedVariant.sku      ? <SpecRow label="SKU"    value={selectedVariant.sku} /> : null}
                {product.gstPercentage    ? <SpecRow label="GST"    value={`${product.gstPercentage}%`} /> : null}
                {product.makingPercentage ? <SpecRow label="Making" value={`${product.makingPercentage}%`} /> : null}
                <SpecRow label="Stock" value={inStock ? `${selectedVariant.stockQuantity} available` : "Out of stock"} last />
              </View>
            )}

            {cartMsg.text ? (
              <View style={[styles.cartMsg, cartMsg.type === "success" ? styles.cartMsgSuccess : styles.cartMsgError]}>
                <Text style={[styles.cartMsgText, cartMsg.type === "success" ? styles.cartMsgTextSuccess : styles.cartMsgTextError]}>
                  {cartMsg.type === "success" ? "✓  " : "✕  "}{cartMsg.text}
                </Text>
              </View>
            ) : null}

          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerMain}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerPriceLabel}>Price</Text>
              <Text style={styles.footerPriceValue}>₹{Number(totalPrice).toLocaleString("en-IN")}</Text>
            </View>
            <TouchableOpacity
              style={[styles.cartBtn, (!selectedVariant || !inStock) && styles.cartBtnDisabled]}
              onPress={handleAddToCart}
              disabled={!selectedVariant || !inStock || cartLoading}
              activeOpacity={0.85}
            >
              {cartLoading
                ? <ActivityIndicator size="small" color="#1C2340" />
                : <Text style={styles.cartBtnText}>Add to Cart</Text>
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
  root:          { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 36 },

  heroShimmerWrap: { marginHorizontal: 16, marginTop: 20, marginBottom: 16 },
  shimmerBody:     { padding: 16 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    marginHorizontal: 16, marginTop: 20, marginBottom: 16,
    backgroundColor: C.navy, borderRadius: 22,
    height: 300,                                   // slightly shorter
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.25)',
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  heroRing1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', right: -60, top: -70, zIndex: 1,
  },
  heroRing2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', right: -10, top: -10, zIndex: 1,
  },
  heroRing3: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.06)', left: -50, bottom: -50, zIndex: 1,
  },

  heroImageWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  heroImage:     { width: '100%', height: '100%' },
  heroImageGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 110,
    backgroundColor: 'rgba(20,28,56,0.55)',
  },

  // ── Badges ────────────────────────────────────────────────────────────────
  heroBadgeRow: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, zIndex: 4,
  },
  heroBadgePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(20,28,56,0.75)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.50)',
  },
  heroBadgeDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: C.goldMid, marginRight: 6 },
  heroBadgePillText: { fontSize: 9, fontWeight: '800', color: C.goldMid, letterSpacing: 1.2 },

  // FIX: BIS pill — solid dark bg, bright white text so it's always readable
  heroCertPill: {
    backgroundColor: '#0E9F6E',              // solid green, not transparent
    borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 0,
  },
  heroCertText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

  heroDiscountPill: { backgroundColor: C.red, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  heroDiscountText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // ── Arrow buttons ─────────────────────────────────────────────────────────
  arrowLeft: {
    position: 'absolute', left: 10, top: '50%', marginTop: -22,
    width: 38, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(20,28,56,0.70)',
    borderWidth: 1.5, borderColor: 'rgba(232,201,122,0.40)',
    alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  arrowRight: {
    position: 'absolute', right: 10, top: '50%', marginTop: -22,
    width: 38, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(20,28,56,0.70)',
    borderWidth: 1.5, borderColor: 'rgba(232,201,122,0.40)',
    alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  arrowText: { fontSize: 28, fontWeight: '300', color: C.goldMid, lineHeight: 34 },

  // FIX: Stock badge — solid opaque backgrounds, no more transparency issues
  heroStockPill: {
    position: 'absolute', bottom: 46, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    zIndex: 4,
  },
  heroStockIn:      { backgroundColor: '#065F46' },   // solid dark green
  heroStockOut:     { backgroundColor: '#7F1D1D' },   // solid dark red
  heroStockDot:     { width: 6, height: 6, borderRadius: 3 },
  heroStockDotIn:   { backgroundColor: '#6EE7B7' },
  heroStockDotOut:  { backgroundColor: '#FCA5A5' },
  heroStockText:    { fontSize: 11, fontWeight: '700' },
  heroStockTextIn:  { color: '#D1FAE5' },             // bright on dark green bg
  heroStockTextOut: { color: '#FEE2E2' },             // bright on dark red bg

  // ── Bottom strip ──────────────────────────────────────────────────────────
  heroBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10,
    backgroundColor: 'rgba(20,28,56,0.55)',
    alignItems: 'center',
    zIndex: 4,
  },

  dotRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(232,201,122,0.28)' },
  dotActive: { width: 14, backgroundColor: C.goldMid },

  // Fallback coin
  heroCoin: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2, borderColor: C.goldMid,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10, zIndex: 2,
  },
  heroCoinWeight:  { fontSize: 26, fontWeight: '900', color: C.goldMid, lineHeight: 30 },
  heroCoinDivider: { width: 44, height: 1, backgroundColor: 'rgba(232,201,122,0.4)', marginVertical: 4 },
  heroCoinSub:     { fontSize: 10, fontWeight: '600', color: 'rgba(232,201,122,0.65)', letterSpacing: 0.5 },

  // ── Body ──────────────────────────────────────────────────────────────────
  body:        { paddingHorizontal: 16 },
  productName: { fontSize: 20, fontWeight: '900', color: C.navy, lineHeight: 26, letterSpacing: -0.4, marginBottom: 4 },
  descText:    { fontSize: 13, color: C.navyLight, lineHeight: 20, marginBottom: 14 },

  // ── Price Card — warm gold-tinted light card, easy to read ──────────────
  priceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBF2',
    borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1.5, borderColor: '#E8C97A',
    shadowColor: '#C8952A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  priceRing1: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(200,149,42,0.06)', top: -20, right: 10 },
  priceRing2: { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(200,149,42,0.10)', right: 70, bottom: -15 },

  priceCol:       { flex: 1, alignItems: 'center', zIndex: 1 },
  priceColLabel:  { fontSize: 9, fontWeight: '700', color: '#9A7B3A', letterSpacing: 1, marginBottom: 5 },
  priceColValue:  { fontSize: 18, fontWeight: '900', color: '#7A5C1E' },
  priceMrpStrike: { fontSize: 13, fontWeight: '600', color: '#B0A090', textDecorationLine: 'line-through', marginBottom: 3 },
  priceDiscBadge: { backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  priceDiscText:  { fontSize: 9, fontWeight: '800', color: '#fff' },
  priceFreeText:  { fontSize: 15, fontWeight: '900', color: '#0E9F6E', marginBottom: 2 },
  priceDeliveryNote: { fontSize: 9, fontWeight: '600', color: '#9A7B3A' },
  priceDividerV:  { width: 1, height: 40, backgroundColor: 'rgba(200,149,42,0.25)', marginHorizontal: 4 },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionAccent: { width: 3, height: 16, borderRadius: 2, backgroundColor: C.gold },
  sectionTitle:  { fontSize: 12, fontWeight: '800', color: C.navyMid, letterSpacing: 0.5 },

  // Cards
  card: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 10,
    shadowColor: 'rgba(28,35,64,0.05)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3, elevation: 1,
  },
  noVariantText: { fontSize: 13, color: C.navyLight, lineHeight: 20 },

  // ── FIX: Variant chips — compact, tighter, no wasted height ──────────────
  variantScroll: { paddingRight: 4, paddingTop: 2, paddingBottom: 4 },
  variantChip: {
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    minWidth: 72,
  },
  variantChipActive:       { backgroundColor: C.goldDim, borderColor: C.gold },
  variantChipWeight:       { fontSize: 15, fontWeight: '900', color: C.navy },
  variantChipWeightActive: { color: C.gold },
  variantChipPurity:       { fontSize: 10, color: C.navyLight, marginTop: 1 },
  variantChipPurityActive: { color: '#C8952A' },
  variantChipPrice:        { fontSize: 11, fontWeight: '700', color: C.navyMid, marginTop: 3 },
  variantChipPriceActive:  { color: C.gold },
  variantActiveDot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: C.gold, marginTop: 5 },

  // Spec rows
  specRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.divider },
  specRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  specLabel:   { fontSize: 13, color: C.navyLight },
  specValue:   { fontSize: 13, fontWeight: '700', color: C.navy },
  specGold:    { color: C.gold },

  // Quantity
  qtyRow:        { flexDirection: 'row', alignItems: 'center' },
  qtyBtn:        { width: 36, height: 36, borderRadius: 11, backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center', shadowColor: C.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 5, elevation: 3 },
  qtyBtnOff:     { backgroundColor: C.border, shadowOpacity: 0 },
  qtyBtnText:    { fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 24 },
  qtyBtnTextOff: { color: C.navyLight },
  qtyNum:        { fontSize: 22, fontWeight: '900', color: C.navy, marginHorizontal: 20, minWidth: 28, textAlign: 'center' },
  qtyTotalBlock: { flex: 1, alignItems: 'flex-end' },
  qtyTotalLabel: { fontSize: 10, color: C.navyLight, marginBottom: 2 },
  qtyTotalValue: { fontSize: 18, fontWeight: '900', color: C.gold },

  // Cart message
  cartMsg:            { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  cartMsgSuccess:     { backgroundColor: C.greenBg, borderColor: C.greenBorder },
  cartMsgError:       { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  cartMsgText:        { fontSize: 13, fontWeight: '600' },
  cartMsgTextSuccess: { color: C.green },
  cartMsgTextError:   { color: C.red },

  // Footer
  footer: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EAE8E2',
    shadowColor: 'rgba(28,35,64,0.12)', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 10, paddingBottom: 22,
  },
  footerMain:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 16 },
  footerLeft:       { flex: 1 },
  footerPriceLabel: { fontSize: 11, fontWeight: '600', color: C.navyLight, letterSpacing: 0.3, marginBottom: 2 },
  footerPriceValue: { fontSize: 22, fontWeight: '900', color: C.navy, letterSpacing: -0.5 },
  footerPriceSub:   { fontSize: 11, color: C.navyLight, marginTop: 2 },
  cartBtn: {
    backgroundColor: C.gold,
    borderRadius: 16, height: 52, paddingHorizontal: 24, minWidth: 150,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  cartBtnDisabled:  { backgroundColor: C.border, shadowOpacity: 0, elevation: 0 },
  cartBtnText:      { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },

  // Empty state
  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyIconBox:  { width: 80, height: 80, borderRadius: 40, backgroundColor: C.goldLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.goldMid, marginBottom: 16 },
  emptyIcon:     { fontSize: 36 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: C.navy, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: C.navyLight, marginBottom: 24, textAlign: 'center' },
  goBackBtn:     { backgroundColor: C.gold, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, shadowColor: C.gold, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  goBackText:    { fontSize: 14, fontWeight: '800', color: '#1C2340' },
});

export default PgProductDetailsScreen;