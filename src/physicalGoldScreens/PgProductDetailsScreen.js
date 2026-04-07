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
import { BASE_URL } from "../constants/api";
import PgLayout from "../../components/physical/PgLayout";
import { getProductVariants, getProductImages } from "./physicalGoldApi";

// ─── Design Tokens (mirrors PgHomeScreen exactly) ─────────────────────────────
const C = {
  bg:            '#F7F6F3',
  card:          '#FFFFFF',
  gold:          '#C8952A',
  goldLight:     '#F5ECD7',
  goldMid:       '#E8C97A',
  goldDim:       'rgba(200,149,42,0.10)',
  goldDimBorder: 'rgba(200,149,42,0.25)',
  navy:          '#1C2340',
  navyMid:       '#3D4463',
  navyLight:     '#8891AF',
  green:         '#0E9F6E',
  greenBg:       '#ECFDF5',
  greenBorder:   '#A7F3D0',
  red:           '#E02424',
  redBg:         '#FEF2F2',
  redBorder:     '#FECACA',
  border:        '#EAE8E2',
  divider:       '#F0EEE9',
  surfaceAlt:    '#F7F6F3',
};

// ─── Shimmer (same as PgHomeScreen) ───────────────────────────────────────────
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

// ─── Section Header (same pattern as PgHomeScreen) ────────────────────────────
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

  const [product,         setProduct]         = useState(null);
  const [variants,        setVariants]        = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty,             setQty]             = useState(1);
  const [loading,         setLoading]         = useState(true);
  const [cartLoading,     setCartLoading]     = useState(false);
  const [cartMsg,         setCartMsg]         = useState({ text: "", type: "" });

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const heroAnim  = useRef(new Animated.Value(0)).current;

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
        const raw = res;
        const inner = raw?.data || raw;
        const variantList =
          inner?.listVariantResponse ||
          inner?.variants ||
          (Array.isArray(inner) ? inner : []);
        const productData = inner?.productResponse || inner?.product || null;

        let productImages = [];
        try {
          const imgRes = await getProductImages(productId);
          const d = imgRes;
          if (Array.isArray(d?.urls)) productImages = d.urls.filter(Boolean);
          else if (Array.isArray(d?.data?.urls)) productImages = d.data.urls.filter(Boolean);
          else if (d?.url) productImages = [d.url];
          else if (d?.data?.url) productImages = [d.data.url];
        } catch {}

        const mapped = variantList.map((v, idx) => ({
          id:            v.id?.toString(),
          price:         v.price || 0,
          mrp:           v.mrp || 0,
          imageUrl:      v.imageUrl || productImages[idx] || productImages[0] || "",
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
            imageUrl:         src.imageUrl || "",
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
              const imgRes = await getProductImages(productId);
              const d = imgRes;
              imgUrl = d?.urls?.[0] || d?.data?.urls?.[0] || d?.url || d?.data?.url || "";
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
        const remaining = Math.max(0, 2000 - (Date.now() - startTime));
        setTimeout(() => setLoading(false), remaining);
      }
    })();
  }, [productId]);

  // ── Loading ──
  if (loading) {
    return (
      <PgLayout title="Product Details" showBack onBack={() => navigation.goBack()}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero shimmer */}
          <View style={styles.heroShimmerWrap}>
            <ShimmerBox width="100%" height={280} borderRadius={0} />
          </View>
          <View style={styles.shimmerBody}>
            <ShimmerBox width="65%" height={20} />
            <View style={{ height: 10 }} />
            <ShimmerBox width="40%" height={14} />
            <View style={{ height: 20 }} />
            <ShimmerBox width="100%" height={90} borderRadius={18} />
            <View style={{ height: 16 }} />
            <ShimmerBox width="100%" height={130} borderRadius={16} />
            <View style={{ height: 16 }} />
            <ShimmerBox width="100%" height={110} borderRadius={16} />
          </View>
        </ScrollView>
      </PgLayout>
    );
  }

  // ── Not found ──
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
  const totalPrice = price * qty;
  const inStock    = (selectedVariant?.stockQuantity ?? 0) > 0;

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) {
      Alert.alert("Error", "Please select a valid variant");
      return;
    }
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
      await apiPost(`${BASE_URL}/cart/AddItemToCart`, {
        userId,
        productId: product.id,
        productVariantId: selectedVariant.id,
        quantity: qty,
      });
      const elapsed = Date.now() - startTime;
      setTimeout(() => {
        Alert.alert(
          "Success",
          `${qty} item${qty > 1 ? "s" : ""} added to cart!`,
          [{ text: "OK", onPress: () => navigation.navigate("PgCart") }],
        );
      }, Math.max(0, 2000 - elapsed));
    } catch (e) {
      const elapsed = Date.now() - startTime;
      setTimeout(() => {
        setCartMsg({ text: e?.message || "Failed to add to cart", type: "error" });
        setTimeout(() => setCartMsg({ text: "", type: "" }), 4000);
      }, Math.max(0, 2000 - elapsed));
    } finally {
      const elapsed = Date.now() - startTime;
      setTimeout(() => setCartLoading(false), Math.max(0, 2000 - elapsed));
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* ── Hero Panel (navy, mirrors PgHomeScreen hero) ── */}
          <Animated.View
            style={[
              styles.hero,
              { opacity: heroAnim, transform: [{ translateY: heroTranslate }] },
            ]}
          >
            {/* Decorative rings — same as PgHomeScreen */}
            <View style={styles.heroRing1} />
            <View style={styles.heroRing2} />
            <View style={styles.heroRing3} />

            {/* Badges row */}
            <View style={styles.heroBadgeRow}>
              {selectedVariant?.purity ? (
                <View style={styles.heroBadgePill}>
                  <View style={styles.heroBadgeDot} />
                  <Text style={styles.heroBadgePillText}>{selectedVariant.purity}</Text>
                </View>
              ) : null}
              <View style={styles.heroCertPill}>
                <Text style={styles.heroCertText}>BIS Hallmarked</Text>
              </View>
              {discount > 0 && (
                <View style={styles.heroDiscountPill}>
                  <Text style={styles.heroDiscountText}>{discount}% OFF</Text>
                </View>
              )}
            </View>

            {/* Product image or weight fallback */}
            <View style={styles.heroImageWrap}>
              {selectedVariant?.imageUrl ? (
                <Image
                  source={{ uri: selectedVariant.imageUrl }}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.heroCoin}>
                  <Text style={styles.heroCoinWeight}>
                    {selectedVariant?.weight ? `${selectedVariant.weight}g` : "—"}
                  </Text>
                  <View style={styles.heroCoinDivider} />
                  <Text style={styles.heroCoinSub}>{selectedVariant?.purity || product.name}</Text>
                </View>
              )}
            </View>

            {/* Stock badge bottom-right */}
            <View style={[styles.heroStockPill, inStock ? styles.heroStockIn : styles.heroStockOut]}>
              <View style={[styles.heroStockDot, inStock ? styles.heroStockDotIn : styles.heroStockDotOut]} />
              <Text style={[styles.heroStockText, inStock ? styles.heroStockTextIn : styles.heroStockTextOut]}>
                {inStock ? "In Stock" : "Out of Stock"}
              </Text>
            </View>
          </Animated.View>

          {/* ── Body ── */}
          <Animated.View
            style={[
              styles.body,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >

            {/* Name + description */}
            <Text style={styles.productName}>{product.name}</Text>
            {product.description ? (
              <Text style={styles.descText}>{product.description}</Text>
            ) : null}

            {/* ── Price Card (navy, same as hero) ── */}
            <View style={styles.priceCard}>
              <View style={styles.priceRing1} />
              <View style={styles.priceRing2} />

              <View style={styles.priceMain}>
                <Text style={styles.priceLabelSmall}>Price</Text>
                <Text style={styles.priceValue}>
                  ₹{Number(price).toLocaleString("en-IN")}
                </Text>
              </View>

              {mrp > price && (
                <View style={styles.priceMrpBlock}>
                  <Text style={styles.priceLabelSmall}>MRP</Text>
                  <Text style={styles.priceMrp}>
                    ₹{Number(mrp).toLocaleString("en-IN")}
                  </Text>
                </View>
              )}

              <View style={styles.priceCardDivider} />

              <View style={styles.priceDelivery}>
                <Text style={styles.priceLabelSmall}>Delivery</Text>
                <Text style={styles.priceFree}>FREE</Text>
              </View>
            </View>

            {/* ── Variants ── */}
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
                  contentContainerStyle={{ paddingRight: 8, paddingTop: 4 }}
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
                        <Text style={[styles.variantChipWeight, active && styles.variantChipWeightActive]}>
                          {v.weight}g
                        </Text>
                        <Text style={[styles.variantChipPurity, active && styles.variantChipPurityActive]}>
                          {v.purity || "—"}
                        </Text>
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

            {/* ── Specifications ── */}
            {selectedVariant && (
              <View style={styles.card}>
                <SectionHeader title="Specifications" />
                {selectedVariant.weight     ? <SpecRow label="Weight"  value={`${selectedVariant.weight} grams`} /> : null}
                {selectedVariant.purity     ? <SpecRow label="Purity"  value={selectedVariant.purity} gold /> : null}
                {selectedVariant.size       ? <SpecRow label="Size"    value={selectedVariant.size} /> : null}
                {selectedVariant.sku        ? <SpecRow label="SKU"     value={selectedVariant.sku} /> : null}
                {product.gstPercentage      ? <SpecRow label="GST"     value={`${product.gstPercentage}%`} /> : null}
                {product.makingPercentage   ? <SpecRow label="Making"  value={`${product.makingPercentage}%`} /> : null}
                <SpecRow
                  label="Stock"
                  value={inStock ? `${selectedVariant.stockQuantity} available` : "Out of stock"}
                  last
                />
              </View>
            )}

            {/* ── Quantity ── */}
            <View style={styles.card}>
              <SectionHeader title="Quantity" />
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={[styles.qtyBtn, qty <= 1 && styles.qtyBtnOff]}
                  onPress={() => qty > 1 && setQty(qty - 1)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.qtyBtnText, qty <= 1 && styles.qtyBtnTextOff]}>−</Text>
                </TouchableOpacity>

                <Text style={styles.qtyNum}>{qty}</Text>

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQty(qty + 1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>

                <View style={styles.qtyTotalBlock}>
                  <Text style={styles.qtyTotalLabel}>Total</Text>
                  <Text style={styles.qtyTotalValue}>
                    ₹{Number(totalPrice).toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Cart Message ── */}
            {cartMsg.text ? (
              <View style={[
                styles.cartMsg,
                cartMsg.type === "success" ? styles.cartMsgSuccess : styles.cartMsgError,
              ]}>
                <Text style={[
                  styles.cartMsgText,
                  cartMsg.type === "success" ? styles.cartMsgTextSuccess : styles.cartMsgTextError,
                ]}>
                  {cartMsg.type === "success" ? "✓  " : "✕  "}{cartMsg.text}
                </Text>
              </View>
            ) : null}

          </Animated.View>
        </ScrollView>

        {/* ── Footer (trust strip + CTA) ── */}
        <View style={styles.footer}>
          {/* Trust micro-strip */}
          <View style={styles.footerMain}>
            {/* Left: price summary */}
            <View style={styles.footerLeft}>
              <Text style={styles.footerPriceLabel}>Total Amount</Text>
              <Text style={styles.footerPriceValue}>
                ₹{Number(totalPrice).toLocaleString("en-IN")}
              </Text>
              {qty > 1 && (
                <Text style={styles.footerPriceSub}>
                  {qty} × ₹{Number(price).toLocaleString("en-IN")}
                </Text>
              )}
            </View>

            {/* Right: Add to Cart */}
            <TouchableOpacity
              style={[styles.cartBtn, (!selectedVariant || !inStock) && styles.cartBtnDisabled]}
              onPress={handleAddToCart}
              disabled={!selectedVariant || !inStock || cartLoading}
              activeOpacity={0.85}
            >
              {cartLoading ? (
                <ActivityIndicator size="small" color="#1C2340" />
              ) : (
                <Text style={styles.cartBtnText}>Add to Cart</Text>
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
  root:        { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 36 },

  // Loading shimmer
  heroShimmerWrap: { marginBottom: 0 },
  shimmerBody:     { padding: 16, gap: 0 },

  // ── Hero (navy — same as PgHomeScreen hero) ──
  hero: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: C.navy,
    borderRadius: 22,
    padding: 24,
    minHeight: 240,
    borderWidth: 1,
    borderColor: 'rgba(232,201,122,0.25)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRing1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', right: -60, top: -70,
  },
  heroRing2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', right: -10, top: -10,
  },
  heroRing3: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.06)', left: -50, bottom: -50,
  },
  heroBadgeRow: {
    position: 'absolute', top: 16, left: 16, right: 16,
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, zIndex: 2,
  },
  heroBadgePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(232,201,122,0.15)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.30)',
  },
  heroBadgeDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: C.goldMid, marginRight: 6,
  },
  heroBadgePillText: { fontSize: 9, fontWeight: '800', color: C.goldMid, letterSpacing: 1.2 },
  heroCertPill: {
    backgroundColor: 'rgba(14,159,110,0.18)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(167,243,208,0.40)',
  },
  heroCertText: { fontSize: 9, fontWeight: '700', color: '#5DEBA8' },
  heroDiscountPill: {
    backgroundColor: C.red, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  heroDiscountText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  heroImageWrap: { marginTop: 36, marginBottom: 20 },
  heroImage:     { width: 170, height: 170 },
  heroCoin: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2, borderColor: C.goldMid,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  heroCoinWeight:  { fontSize: 28, fontWeight: '900', color: C.goldMid, lineHeight: 32 },
  heroCoinDivider: { width: 50, height: 1, backgroundColor: 'rgba(232,201,122,0.4)', marginVertical: 4 },
  heroCoinSub:     { fontSize: 11, fontWeight: '600', color: 'rgba(232,201,122,0.65)', letterSpacing: 0.5 },

  heroStockPill: {
    position: 'absolute', bottom: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1,
  },
  heroStockIn:      { backgroundColor: 'rgba(14,159,110,0.18)', borderColor: 'rgba(167,243,208,0.40)' },
  heroStockOut:     { backgroundColor: 'rgba(224,36,36,0.18)',  borderColor: 'rgba(254,202,202,0.40)' },
  heroStockDot:     { width: 6, height: 6, borderRadius: 3 },
  heroStockDotIn:   { backgroundColor: '#5DEBA8' },
  heroStockDotOut:  { backgroundColor: '#FF6B6B' },
  heroStockText:    { fontSize: 11, fontWeight: '700' },
  heroStockTextIn:  { color: '#5DEBA8' },
  heroStockTextOut: { color: '#FF6B6B' },

  // ── Body ──
  body: { paddingHorizontal: 16 },
  productName: {
    fontSize: 22, fontWeight: '900', color: C.navy,
    lineHeight: 28, letterSpacing: -0.4, marginBottom: 6,
  },
  descText: {
    fontSize: 13, color: C.navyLight, lineHeight: 20, marginBottom: 16,
  },

  // ── Price Card (navy, same as hero) ──
  priceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.navy, borderRadius: 18, padding: 20,
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.25)',
    overflow: 'hidden',
    shadowColor: C.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  priceRing1: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(232,201,122,0.07)', top: -30, right: 20,
  },
  priceRing2: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 1, borderColor: 'rgba(232,201,122,0.10)', right: 80, bottom: -20,
  },
  priceMain:       { flex: 1, zIndex: 1 },
  priceLabelSmall: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.40)', marginBottom: 4 },
  priceValue:      { fontSize: 24, fontWeight: '900', color: C.goldMid, letterSpacing: -0.5 },
  priceMrpBlock:   { alignItems: 'center', marginRight: 12, zIndex: 1 },
  priceMrp:        { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.30)', textDecorationLine: 'line-through' },
  priceCardDivider:{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.10)', marginHorizontal: 14 },
  priceDelivery:   { alignItems: 'center', zIndex: 1 },
  priceFree:       { fontSize: 14, fontWeight: '800', color: '#5DEBA8' },

  // ── Section Header (same as PgHomeScreen) ──
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent: { width: 3, height: 18, borderRadius: 2, backgroundColor: C.gold },
  sectionTitle:  { fontSize: 13, fontWeight: '800', color: C.navyMid, letterSpacing: 0.5 },

  // ── Cards (same surface/border as PgHomeScreen trustStrip) ──
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
    shadowColor: 'rgba(28,35,64,0.06)', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  noVariantText: { fontSize: 13, color: C.navyLight, lineHeight: 20 },

  // ── Variant chips (match subChip from PgHomeScreen) ──
  variantChip: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, marginRight: 10,
    alignItems: 'center', backgroundColor: C.surfaceAlt,
    shadowColor: 'rgba(28,35,64,0.05)', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 3, elevation: 1,
  },
  variantChipActive:        { backgroundColor: C.goldDim, borderColor: C.gold },
  variantChipWeight:        { fontSize: 16, fontWeight: '900', color: C.navy, marginBottom: 2 },
  variantChipWeightActive:  { color: C.gold },
  variantChipPurity:        { fontSize: 11, color: C.navyLight, marginBottom: 4 },
  variantChipPurityActive:  { color: C.gold },
  variantChipPrice:         { fontSize: 12, fontWeight: '700', color: C.navyMid },
  variantChipPriceActive:   { color: C.gold },
  variantActiveDot:         { width: 4, height: 4, borderRadius: 2, backgroundColor: C.gold, marginTop: 6 },

  // ── Spec rows ──
  specRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  specRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  specLabel:   { fontSize: 13, color: C.navyLight },
  specValue:   { fontSize: 13, fontWeight: '700', color: C.navy },
  specGold:    { color: C.gold },

  // ── Quantity ──
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  qtyBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 3,
  },
  qtyBtnOff:     { backgroundColor: C.border, shadowOpacity: 0 },
  qtyBtnText:    { fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 24 },
  qtyBtnTextOff: { color: C.navyLight },
  qtyNum: {
    fontSize: 22, fontWeight: '900', color: C.navy,
    marginHorizontal: 22, minWidth: 28, textAlign: 'center',
  },
  qtyTotalBlock: { flex: 1, alignItems: 'flex-end' },
  qtyTotalLabel: { fontSize: 10, color: C.navyLight, marginBottom: 3 },
  qtyTotalValue: { fontSize: 18, fontWeight: '900', color: C.gold },

  // ── Cart message ──
  cartMsg: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  cartMsgSuccess:     { backgroundColor: C.greenBg,  borderColor: C.greenBorder },
  cartMsgError:       { backgroundColor: '#FEF2F2',  borderColor: '#FECACA' },
  cartMsgText:        { fontSize: 13, fontWeight: '600' },
  cartMsgTextSuccess: { color: C.green },
  cartMsgTextError:   { color: C.red },

  // ── Footer ──
  footer: {
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: 'rgba(28,35,64,0.10)', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 10,
    paddingBottom: 22,
  },

  // Trust micro-strip (matches PgHomeScreen trustStrip style)
  trustStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider,
    gap: 0,
  },
  trustItem:   { fontSize: 10, fontWeight: '700', color: C.navyLight, paddingHorizontal: 12 },
  trustDivider:{ width: 1, height: 14, backgroundColor: C.border },

  footerMain: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, gap: 16,
  },
  footerLeft:       { flex: 1 },
  footerPriceLabel: { fontSize: 11, fontWeight: '600', color: C.navyLight, letterSpacing: 0.3, marginBottom: 2 },
  footerPriceValue: { fontSize: 22, fontWeight: '900', color: C.navy, letterSpacing: -0.5 },
  footerPriceSub:   { fontSize: 11, color: C.navyLight, marginTop: 2 },

  cartBtn: {
    backgroundColor: C.gold, borderRadius: 16,
    height: 54, paddingHorizontal: 26, minWidth: 155,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  cartBtnDisabled: { backgroundColor: C.border, shadowOpacity: 0, elevation: 0 },
  cartBtnText: { fontSize: 15, fontWeight: '900', color: '#1C2340', letterSpacing: 0.3 },

  // ── Empty state (matches PgHomeScreen) ──
  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.goldLight, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.goldMid, marginBottom: 16,
  },
  emptyIcon:     { fontSize: 36 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: C.navy, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: C.navyLight, marginBottom: 24, textAlign: 'center' },
  goBackBtn: {
    backgroundColor: C.gold, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 13,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  goBackText: { fontSize: 14, fontWeight: '800', color: '#1C2340' },
});

export default PgProductDetailsScreen;