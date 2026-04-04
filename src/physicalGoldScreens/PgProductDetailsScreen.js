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
import { PG_COLORS } from "../../constants/physicalGoldColors";
import PgButton from "../../components/physical/PgButton";
import PgLayout from "../../components/physical/PgLayout";
import { getProductVariants, getProductImages } from "./physicalGoldApi";

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
  heroText: "#F5EDD0",
  heroTextSec: "rgba(245,237,208,0.55)",
  textPri: "#1A1508",
  textSec: "#6B6050",
  textTer: "#A89880",
  success: "#1A7A4A",
  successBg: "#EDFBF3",
  successBorder: "#A3E6C4",
  error: "#C0392B",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
};

const SpecRow = ({ label, value, gold, last }) => (
  <View style={[styles.specRow, last && styles.specRowLast]}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={[styles.specValue, gold && styles.specGold]}>{value}</Text>
  </View>
);

const CardLabel = ({ text }) => (
  <View style={styles.cardLabelRow}>
    <View style={styles.cardLabelAccent} />
    <Text style={styles.cardLabel}>{text}</Text>
  </View>
);

const PgProductDetailsScreen = ({ navigation, route }) => {
  const { productId } = route.params;
  const accessToken = route?.params?.accessToken;
  const userId = route?.params?.userId;

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartMsg, setCartMsg] = useState({ text: "", type: "" });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    (async () => {
      const startTime = Date.now();
      try {
        const res = await getProductVariants(productId, accessToken);
        const raw = res;
        const inner = raw?.data || raw;
        const variantList =
          inner?.listVariantResponse ||
          inner?.variants ||
          (Array.isArray(inner) ? inner : []);
        const productData = inner?.productResponse || inner?.product || null;

        let productImages = [];
        try {
          const imgRes = await getProductImages(productId, accessToken);
          const d = imgRes;
          if (Array.isArray(d?.urls)) productImages = d.urls.filter(Boolean);
          else if (Array.isArray(d?.data?.urls))
            productImages = d.data.urls.filter(Boolean);
          else if (d?.url) productImages = [d.url];
          else if (d?.data?.url) productImages = [d.data.url];
        } catch {}

        const mapped = variantList.map((v, idx) => ({
          id: v.id?.toString(),
          price: v.price || 0,
          mrp: v.mrp || 0,
          imageUrl: v.imageUrl || productImages[idx] || productImages[0] || "",
          purity: v.purity || "",
          size: v.size || "",
          sku: v.sku || "",
          status: v.status || "",
          stockQuantity: v.stockQuantity ?? 0,
          weight: v.weight || 0,
        }));

        setVariants(mapped);
        if (mapped.length > 0) setSelectedVariant(mapped[0]);

        const src = productData || route.params?.product || null;
        if (src) {
          setProduct({
            id: src.id?.toString(),
            name: src.name || src.productName || "",
            imageUrl: src.imageUrl || "",
            description: src.description || "",
            status: src.status || "",
            gstPercentage: src.gstPercentage,
            makingPercentage: src.makingPercentage,
          });
        }
      } catch (e) {
        const fallback = route.params?.product;
        if (fallback) {
          let imgUrl = fallback.imageUrl || "";
          if (!imgUrl) {
            try {
              const imgRes = await getProductImages(productId, accessToken);
              const d = imgRes;
              imgUrl =
                d?.urls?.[0] ||
                d?.data?.urls?.[0] ||
                d?.url ||
                d?.data?.url ||
                "";
            } catch {}
          }
          setProduct({
            id: fallback.id?.toString(),
            name: fallback.productName || fallback.name || "",
            imageUrl: imgUrl,
            description: fallback.description || "",
            status: fallback.status || "",
          });
        }
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsedTime);
        setTimeout(() => setLoading(false), remainingTime);
      }
    })();
  }, [productId]);

  if (loading) {
    return (
      <PgLayout
        title="Product Details"
        showBack
        onBack={() => navigation.goBack()}
        hideBottomBar={false}
      >
        <View style={[styles.root, styles.center]}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </PgLayout>
    );
  }

  if (!product) {
    return (
      <PgLayout
        title="Product Details"
        showBack
        onBack={() => navigation.goBack()}
        hideBottomBar={false}
      >
        <View style={[styles.root, styles.center]}>
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity
            style={styles.goBackBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  const price = selectedVariant?.price || 0;
  const mrp = selectedVariant?.mrp || price;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const totalPrice = price * qty;
  const inStock = (selectedVariant?.stockQuantity ?? 0) > 0;

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) {
      Alert.alert("Error", "Please select a valid variant");
      return;
    }
    setCartLoading(true);
    setCartMsg({ text: "", type: "" });
    const startTime = Date.now();
    try {
      const user =
        typeof localStorage !== "undefined" && localStorage?.getItem?.("user")
          ? JSON.parse(localStorage.getItem("user"))
          : null;
      const uid = user?.userId || route?.params?.userId;
      const token = user?.accessToken || accessToken;
      const payload = {
        userId: uid,
        productId: product.id,
        productVariantId: selectedVariant.id,
        quantity: qty,
      };
      console.log("[AddToCart Payload]", JSON.stringify(payload, null, 2));

      const response = await fetch(
        "http://65.0.147.157:9900/api/cart/AddItemToCart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const responseData = await response.json();
      console.log("[AddToCart API Response]", responseData);
      console.log("[AddToCart Response Status]", response.status);

      if (response.ok) {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsedTime);
        Alert.alert(
          "Success",
          `${qty} item${qty > 1 ? "s" : ""} added to cart!`,
          [
            {
              text: "OK",
              onPress: () => {
                setTimeout(() => {
                  navigation.navigate("PgCart", { accessToken, userId: uid });
                }, remainingTime);
              },
            },
          ],
        );
      } else {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsedTime);
        setTimeout(() => {
          setCartMsg({
            text: responseData?.message || "Failed to add to cart",
            type: "error",
          });
          setTimeout(() => setCartMsg({ text: "", type: "" }), 4000);
        }, remainingTime);
      }
    } catch (e) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      const errorMsg = e?.message || "Failed to add to cart";
      console.log("[AddToCart Error]", e);
      setTimeout(() => {
        setCartMsg({ text: errorMsg, type: "error" });
        setTimeout(() => setCartMsg({ text: "", type: "" }), 4000);
      }, remainingTime);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => setCartLoading(false), remainingTime);
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
          {/* ── Image Panel ── */}
          <View style={styles.visualPanel}>
            <View style={styles.visualCircle1} />
            <View style={styles.visualCircle2} />

            {selectedVariant && selectedVariant.imageUrl ? (
              <Image
                source={{ uri: selectedVariant.imageUrl }}
                style={styles.productImage}
                resizeMode="contain"
              />
            ) : selectedVariant ? (
              <View style={styles.weightFallback}>
                <Text style={styles.weightDisplay}>
                  {selectedVariant.weight}g
                </Text>
                <Text style={styles.weightSub}>
                  {selectedVariant.purity || product.name}
                </Text>
              </View>
            ) : null}

            {selectedVariant?.purity ? (
              <View style={styles.purityBadge}>
                <Text style={styles.purityText}>{selectedVariant.purity}</Text>
              </View>
            ) : null}

            <View style={styles.certBadge}>
              <Text style={styles.certText}>BIS Hallmarked</Text>
            </View>

            {discount > 0 ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </View>
            ) : null}
          </View>

          {/* ── Body ── */}
          <Animated.View
            style={[
              styles.body,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Name + Stock */}
            <View style={styles.nameRow}>
              <Text style={styles.productName}>{product.name}</Text>
              <View
                style={[
                  styles.stockBadge,
                  inStock ? styles.stockIn : styles.stockOut,
                ]}
              >
                <View
                  style={[
                    styles.stockDot,
                    inStock ? styles.stockDotIn : styles.stockDotOut,
                  ]}
                />
                <Text
                  style={[
                    styles.stockText,
                    inStock ? styles.stockTextIn : styles.stockTextOut,
                  ]}
                >
                  {inStock ? "In Stock" : "Out of Stock"}
                </Text>
              </View>
            </View>

            {product.description ? (
              <Text style={styles.descText}>{product.description}</Text>
            ) : null}

            {/* Price Card */}
            <View style={styles.priceCard}>
              <View style={styles.priceCardCircle} />
              <View style={styles.priceMain}>
                <Text style={styles.priceLabelSmall}>Price</Text>
                <Text style={styles.priceValue}>
                  ₹{Number(price).toLocaleString("en-IN")}
                </Text>
              </View>
              {mrp > price ? (
                <View style={styles.priceMrpBlock}>
                  <Text style={styles.priceLabelSmall}>MRP</Text>
                  <Text style={styles.priceMrp}>
                    ₹{Number(mrp).toLocaleString("en-IN")}
                  </Text>
                </View>
              ) : null}
              <View style={styles.priceCardDivider} />
              <View style={styles.priceDelivery}>
                <Text style={styles.priceLabelSmall}>Delivery</Text>
                <Text style={styles.priceFree}>FREE</Text>
              </View>
            </View>

            {/* Variants */}
            {variants.length === 0 ? (
              <View style={styles.card}>
                <CardLabel text="AVAILABILITY" />
                <Text style={styles.noVariantText}>
                  No variants available yet. Please check back later.
                </Text>
              </View>
            ) : null}

            {variants.length > 1 ? (
              <View style={styles.card}>
                <CardLabel text="SELECT VARIANT" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 4 }}
                >
                  {variants.map((v) => {
                    const active = selectedVariant?.id === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.variantChip,
                          active && styles.variantChipActive,
                        ]}
                        onPress={() => setSelectedVariant(v)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.variantChipWeight,
                            active && styles.variantChipWeightActive,
                          ]}
                        >
                          {v.weight}g
                        </Text>
                        <Text
                          style={[
                            styles.variantChipPurity,
                            active && styles.variantChipPurityActive,
                          ]}
                        >
                          {v.purity || "—"}
                        </Text>
                        <Text
                          style={[
                            styles.variantChipPrice,
                            active && styles.variantChipPriceActive,
                          ]}
                        >
                          ₹{Number(v.price).toLocaleString("en-IN")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Specs */}
            {selectedVariant ? (
              <View style={styles.card}>
                <CardLabel text="SPECIFICATIONS" />
                {selectedVariant.weight ? (
                  <SpecRow
                    label="Weight"
                    value={`${selectedVariant.weight} grams`}
                  />
                ) : null}
                {selectedVariant.purity ? (
                  <SpecRow label="Purity" value={selectedVariant.purity} gold />
                ) : null}
                {selectedVariant.size ? (
                  <SpecRow label="Size" value={selectedVariant.size} />
                ) : null}
                {selectedVariant.sku ? (
                  <SpecRow label="SKU" value={selectedVariant.sku} />
                ) : null}
                {product.gstPercentage ? (
                  <SpecRow label="GST" value={`${product.gstPercentage}%`} />
                ) : null}
                {product.makingPercentage ? (
                  <SpecRow
                    label="Making"
                    value={`${product.makingPercentage}%`}
                  />
                ) : null}
                <SpecRow
                  label="Stock"
                  value={
                    inStock
                      ? `${selectedVariant.stockQuantity} available`
                      : "Out of stock"
                  }
                  last
                />
              </View>
            ) : null}

            {/* Quantity */}
            <View style={styles.card}>
              <CardLabel text="QUANTITY" />
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={[styles.qtyBtn, qty <= 1 && styles.qtyBtnOff]}
                  onPress={() => qty > 1 && setQty(qty - 1)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.qtyBtnText,
                      qty <= 1 && styles.qtyBtnTextOff,
                    ]}
                  >
                    −
                  </Text>
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

            {/* Cart Message */}
            {cartMsg.text ? (
              <View
                style={[
                  styles.cartMsg,
                  cartMsg.type === "success"
                    ? styles.cartMsgSuccess
                    : styles.cartMsgError,
                ]}
              >
                <Text
                  style={[
                    styles.cartMsgText,
                    cartMsg.type === "success"
                      ? styles.cartMsgTextSuccess
                      : styles.cartMsgTextError,
                  ]}
                >
                  {cartMsg.type === "success" ? "✓  " : "✕  "}
                  {cartMsg.text}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>

        {/* ── Footer ── */}
        <View style={styles.footer}>
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
            style={[
              styles.cartBtn,
              (!selectedVariant || !inStock) && styles.cartBtnDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={!selectedVariant || !inStock || cartLoading}
            activeOpacity={0.85}
          >
            {cartLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.cartBtnInner}>
                <Text style={styles.cartBtnIcon}>🛒</Text>
                <Text style={styles.cartBtnText}>Add to Cart</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 110 },
  loadingText: { marginTop: 12, fontSize: 13, color: C.textSec },
  errorText: { fontSize: 16, fontWeight: "700", color: C.error },
  goBackBtn: {
    marginTop: 14,
    backgroundColor: C.gold,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  goBackText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Visual panel
  visualPanel: {
    height: 260,
    backgroundColor: C.heroBase,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  visualCircle1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(212,175,55,0.08)",
    top: -80,
    right: -60,
  },
  visualCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(212,175,55,0.05)",
    bottom: -60,
    left: 40,
  },
  productImage: { width: "80%", height: "80%" },
  weightFallback: { alignItems: "center" },
  weightDisplay: { fontSize: 52, fontWeight: "900", color: C.goldBright },
  weightSub: { fontSize: 13, color: C.heroTextSec, marginTop: 4 },
  purityBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: C.goldBright,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  purityText: { fontSize: 11, fontWeight: "800", color: C.heroBase },
  certBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(26,122,74,0.18)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(163,230,196,0.4)",
  },
  certText: { fontSize: 10, fontWeight: "700", color: "#5DEBA8" },
  discountBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#E02424",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discountText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 20 },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 10,
  },
  productName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    color: C.textPri,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
    marginTop: 3,
  },
  stockIn: {
    backgroundColor: C.successBg,
    borderWidth: 1,
    borderColor: C.successBorder,
  },
  stockOut: {
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.errorBorder,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockDotIn: { backgroundColor: C.success },
  stockDotOut: { backgroundColor: C.error },
  stockText: { fontSize: 11, fontWeight: "700" },
  stockTextIn: { color: C.success },
  stockTextOut: { color: C.error },
  descText: {
    fontSize: 13,
    color: C.textSec,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Price card
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.heroBase,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.heroBorder,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  priceCardCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(212,175,55,0.07)",
    top: -30,
    right: 20,
  },
  priceMain: { flex: 1 },
  priceLabelSmall: {
    fontSize: 10,
    fontWeight: "600",
    color: C.heroTextSec,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "900",
    color: C.goldBright,
    letterSpacing: -0.5,
  },
  priceMrpBlock: { alignItems: "center", marginRight: 12 },
  priceMrp: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(245,237,208,0.35)",
    textDecorationLine: "line-through",
  },
  priceCardDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginHorizontal: 14,
  },
  priceDelivery: { alignItems: "center" },
  priceFree: { fontSize: 14, fontWeight: "800", color: "#5DEBA8" },

  // Cards
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
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
  noVariantText: { fontSize: 13, color: C.textTer, lineHeight: 20 },

  // Variant chips
  variantChip: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginRight: 10,
    alignItems: "center",
    backgroundColor: C.surfaceAlt,
  },
  variantChipActive: {
    borderColor: C.gold,
    backgroundColor: "rgba(184,137,26,0.08)",
  },
  variantChipWeight: {
    fontSize: 15,
    fontWeight: "800",
    color: C.textPri,
    marginBottom: 2,
  },
  variantChipWeightActive: { color: C.gold },
  variantChipPurity: { fontSize: 11, color: C.textTer, marginBottom: 4 },
  variantChipPurityActive: { color: C.goldLight },
  variantChipPrice: { fontSize: 12, fontWeight: "700", color: C.textSec },
  variantChipPriceActive: { color: C.gold },

  // Spec rows
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  specRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  specLabel: { fontSize: 13, color: C.textSec },
  specValue: { fontSize: 13, fontWeight: "700", color: C.textPri },
  specGold: { color: C.gold },

  // Quantity
  qtyRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  qtyBtnOff: { backgroundColor: C.border, shadowOpacity: 0 },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 22,
  },
  qtyBtnTextOff: { color: C.textTer },
  qtyNum: {
    fontSize: 20,
    fontWeight: "900",
    color: C.textPri,
    marginHorizontal: 20,
    minWidth: 28,
    textAlign: "center",
  },
  qtyTotalBlock: { flex: 1, alignItems: "flex-end" },
  qtyTotalLabel: { fontSize: 10, color: C.textTer, marginBottom: 3 },
  qtyTotalValue: { fontSize: 18, fontWeight: "900", color: C.gold },

  // Cart message
  cartMsg: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  cartMsgSuccess: {
    backgroundColor: C.successBg,
    borderColor: C.successBorder,
  },
  cartMsgError: { backgroundColor: C.errorBg, borderColor: C.errorBorder },
  cartMsgText: { fontSize: 13, fontWeight: "600" },
  cartMsgTextSuccess: { color: C.success },
  cartMsgTextError: { color: C.error },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },

  // Left price block
  footerLeft: {
    flex: 1,
    justifyContent: "center",
  },
  footerPriceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textTer,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  footerPriceValue: {
    fontSize: 21,
    fontWeight: "900",
    color: C.textPri,
    letterSpacing: -0.5,
  },
  footerPriceSub: {
    fontSize: 11,
    color: C.textTer,
    marginTop: 2,
  },

  // Add to Cart button
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.gold,
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 26,
    minWidth: 155,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  cartBtnDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  cartBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartBtnIcon: {
    fontSize: 18,
  },
  cartBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
  },
});

export default PgProductDetailsScreen;
