import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { selectUserId } from "../../store/authSlice";
import { setWishlistCount, setCartCount } from "../../store/cartSlice";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import PgActionButton from "../components/PgActionButton";
import {
  getWishlist,
  removeFromWishlist,
  addToCart,
  getProductAllImages,
  getProductVariants,
  getCart,
} from "../api/physicalGoldApi";
import { resolveImageUrl } from "../utils/resolveImageUrl";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#6C4AB6",
  goldBright: "#8466C9",
  goldMuted: "rgba(108,74,182,0.10)",
  goldBorder: "rgba(108,74,182,0.20)",
  goldText: "#6C4AB6",
  textPrimary: "#1C1C1E",
  textSecondary: "#7A7A80",
  textMuted: "#A79C93",
  border: "#E7E0DA",
  green: "#1F8A4C",
  red: "#C0392B",
};

// ─── Resolve all possible field variations from API ───────────────────────────
const resolveItem = (raw) => ({
  wishlistId: raw.id || raw.wishlistId,
  productId:  raw.productId  || raw.product?.id,
  variantId:  raw.productVariantId || raw.productVariant?.id || raw.variantId,
  name:
    raw.product?.name ||
    raw.product?.productName ||
    raw.productName ||
    raw.name ||
    "Gold Product",
  price: raw.productVariant?.price || raw.product?.price || raw.price || 0,
  weight: raw.productVariant?.weight || raw.product?.weight || raw.weight || null,
  purity: raw.productVariant?.purity || raw.product?.purity || raw.purity || null,
  imageUrl: resolveImageUrl(raw.product?.imageUrl || raw.productVariant?.imageUrl || raw.imageUrl),
});

// ─── Single product card ──────────────────────────────────────────────────────
// Wrapped in memo, with every callback below a stable parent reference (see
// handleRemove/handleAddToCart/handleGoToCart/handleViewDetails) — that's
// what lets a wishlist action on one row skip re-rendering every other row.
const WishlistCard = React.memo(({ raw, onRemove, onAddToCart, onGoToCart, onViewDetails, removing, addingCart, inCart }) => {
  const item = resolveItem(raw);
  const [imgUrl, setImgUrl]         = useState(item.imageUrl);
  const [imgLoading, setImgLoading] = useState(!item.imageUrl && !!item.productId);
  const [offer, setOffer]           = useState(null); // { mrpDisplay, discountPct }

  React.useEffect(() => {
    if (!item.imageUrl && item.productId) {
      setImgLoading(true);
      getProductAllImages(item.productId)
        .then((res) => setImgUrl(res?.frontViewUrl || null))
        .catch(() => {})
        .finally(() => setImgLoading(false));
    }
  }, [item.productId]);

  // MRP lives on the variant, not the wishlist list response — same lookup
  // ProductCard does on Home, so wishlist cards show the same offer badge.
  React.useEffect(() => {
    if (!item.productId) return;
    getProductVariants(item.productId)
      .then((res) => {
        const inner = res?.data || res;
        const list = inner?.listVariantResponse || inner?.variants || (Array.isArray(inner) ? inner : []);
        // Pick the exact variant this wishlist item is for — a product can
        // have several variants (different weights), each with its own MRP,
        // so blindly using list[0] shows the wrong one whenever the
        // wishlisted variant isn't the first in the list.
        const v =
          list.find((x) => String(x?.id) === String(item.variantId)) ||
          list?.[0];
        const mrp = v?.mrp || 0;
        const price = v?.price || item.price || 0;
        if (mrp > price && price > 0) {
          setOffer({
            mrpDisplay: mrp.toLocaleString("en-IN"),
            discountPct: Math.round(((mrp - price) / mrp) * 100),
          });
        }
      })
      .catch(() => {});
  }, [item.productId, item.variantId]);

  return (
    <TouchableOpacity style={s.card} onPress={() => onViewDetails?.(item, raw)} activeOpacity={0.9}>

      {/* ── Image — white square tile, same as ProductCard ───────────────── */}
      <View style={s.imageWrap}>
        {imgLoading ? (
          <ActivityIndicator size="small" color={C.goldBright} style={s.imgLoader} />
        ) : imgUrl ? (
          <Image source={{ uri: imgUrl }} style={s.image} resizeMode="contain" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="diamond-outline" size={30} color="#C8962E" />
          </View>
        )}

        {/* Discount — top left */}
        {!!offer && (
          <View style={s.offBadge}>
            <Text style={s.offBadgeText}>{offer.discountPct}% OFF</Text>
          </View>
        )}

        {/* heart remove — top right */}
        <TouchableOpacity
          style={s.heartBtn}
          onPress={() => onRemove(item.wishlistId)}
          disabled={removing}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}
        >
          {removing
            ? <ActivityIndicator size="small" color={C.red} />
            : <Ionicons name="heart" size={16} color={C.red} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Name, purity, price, action ───────────────────────────────────── */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>{item.name}</Text>

        {!!item.purity && (
          <View style={s.metaRow}>
            <View style={s.metaBadge}>
              <Text style={s.metaText}>{item.purity}</Text>
            </View>
          </View>
        )}

        <View style={s.priceBlock}>
          {!!item.price ? (
            <View style={s.priceRow}>
              <Text style={s.priceRupee}>₹</Text>
              <Text style={s.priceAmount} numberOfLines={1}>
                {Number(item.price).toLocaleString("en-IN")}
              </Text>
              {!!offer && (
                <Text style={s.priceStrike} numberOfLines={1}>₹{offer.mrpDisplay}</Text>
              )}
            </View>
          ) : (
            <Text style={s.priceNA}>Price on request</Text>
          )}
        </View>

        {inCart ? (
          <TouchableOpacity
            style={[s.cta, s.inCartBtn]}
            onPress={onGoToCart}
            disabled={addingCart || removing}
            activeOpacity={0.82}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark-circle" size={14} color="#176B4D" />
            <Text style={s.inCartText}>In Cart</Text>
          </TouchableOpacity>
        ) : (
          <PgActionButton
            label="Add to Cart"
            onPress={() => onAddToCart(raw, item)}
            disabled={removing}
            loading={addingCart}
            style={s.cta}
          />
        )}
      </View>

    </TouchableOpacity>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const PgWishlistScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const dispatch = useDispatch();
  const [items, setItems]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [removingId, setRemovingId]       = useState(null);
  const [cartLoadingId, setCartLoadingId] = useState(null);
  const [cartVariantIds, setCartVariantIds] = useState(new Set());

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      setLoading(true);
      getWishlist(userId)
        .then((data) => {
          setItems(data || []);
          dispatch(setWishlistCount(data?.length || 0));
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));

      getCart(userId)
        .then((cartData) => {
          const ids = (cartData?.itemsInCart || []).map((it) =>
            String(it.productVariantId),
          );
          setCartVariantIds(new Set(ids));
        })
        .catch(() => {});
    }, [userId, dispatch]),
  );

  // useCallback + stable references passed straight to WishlistCard below
  // (not wrapped in a fresh per-item arrow at the call site) is what lets
  // WishlistCard's React.memo actually skip re-rendering rows that didn't
  // change.
  const handleRemove = useCallback(
    async (wishlistId) => {
      setRemovingId(wishlistId);
      try {
        await removeFromWishlist(wishlistId);
        const updated = items.filter((w) => (w.id || w.wishlistId) !== wishlistId);
        setItems(updated);
        dispatch(setWishlistCount(updated.length));
      } catch (e) {
        Alert.alert("Error", e?.message || "Failed to remove");
      } finally {
        setRemovingId(null);
      }
    },
    [items, dispatch],
  );

  const handleAddToCart = useCallback(
    async (raw, item) => {
      if (!item.productId || !item.variantId) {
        Alert.alert("Error", "Product info missing");
        return;
      }
      setCartLoadingId(item.wishlistId);
      try {
        await addToCart(userId, item.productId, item.variantId, 1);
        setCartVariantIds((prev) => new Set(prev).add(String(item.variantId)));
        try {
          const cartData = await getCart(userId);
          dispatch(setCartCount(cartData?.totalItemsInCart || 0));
        } catch {}
        Alert.alert("Added to Cart", `${item.name} added to your cart`, [
          { text: "View Cart", onPress: () => navigation.navigate("PgCart") },
          { text: "OK" },
        ]);
      } catch (e) {
        Alert.alert("Error", e?.message || "Failed to add to cart");
      } finally {
        setCartLoadingId(null);
      }
    },
    [userId, dispatch, navigation],
  );

  const handleGoToCart = useCallback(
    () => navigation.navigate("PgCart"),
    [navigation],
  );

  const handleViewDetails = useCallback(
    (item, raw) =>
      navigation.navigate("PgProductDetails", {
        productId: item.productId,
        product: raw.product || raw,
      }),
    [navigation],
  );

  // ── Grid — pair items into rows of 2. Memoized so an unrelated re-render
  // (removingId/cartLoadingId/cartVariantIds changing for one row) doesn't
  // rebuild this array and force FlatList to re-render every row. Must run
  // before the early returns below — hooks can't be conditional. ──────────
  const rows = React.useMemo(() => {
    const r = [];
    for (let i = 0; i < items.length; i += 2) {
      r.push([items[i], items[i + 1] || null]);
    }
    return r;
  }, [items]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PgLayout title="My Wishlist" showBack onBack={() => navigation.goBack()}>
        <PgLoader />
      </PgLayout>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <PgLayout title="My Wishlist" showBack onBack={() => navigation.goBack()}>
        <View style={s.center}>
          <View style={s.emptyCircle}>
            <Ionicons name="heart-outline" size={34} color={C.gold} />
          </View>
          <Text style={s.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={s.emptySubtitle}>
            Save products you love to find them easily later
          </Text>
          <TouchableOpacity
            style={s.browseBtn}
            onPress={() => navigation.navigate("PgHome")}
            activeOpacity={0.8}
          >
            <Text style={s.browseBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  return (
    <PgLayout title="My Wishlist" showBack onBack={() => navigation.goBack()}>
      <View style={s.container}>
        <FadeSlideIn style={{ flex: 1 }}>
        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <View style={s.header}>
              <View style={s.headerAccent} />
              <Text style={s.headerTitle}>Saved Items</Text>
              <View style={s.countPill}>
                <Text style={s.countText}>{items.length}</Text>
              </View>
            </View>
          }
          renderItem={({ item: row }) => (
            <View style={s.row}>
              {row.map((raw, idx) => {
                if (!raw) return <View key="empty" style={s.col} />;
                const item = resolveItem(raw);
                return (
                  <View key={String(raw.id || raw.wishlistId || idx)} style={s.col}>
                    <WishlistCard
                      raw={raw}
                      removing={removingId === item.wishlistId}
                      addingCart={cartLoadingId === item.wishlistId}
                      inCart={cartVariantIds.has(String(item.variantId))}
                      onRemove={handleRemove}
                      onAddToCart={handleAddToCart}
                      onGoToCart={handleGoToCart}
                      onViewDetails={handleViewDetails}
                    />
                  </View>
                );
              })}
            </View>
          )}
        />
        </FadeSlideIn>
      </View>
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  listContent: { paddingBottom: 24, backgroundColor: C.bg },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 14,
  },
  headerAccent: { width: 3, height: 18, borderRadius: 2, backgroundColor: C.gold },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, letterSpacing: -0.3 },
  countPill: {
    backgroundColor: C.goldMuted,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  countText: { fontSize: 11, fontWeight: "700", color: C.textPrimary },

  // ── Grid — 10px gutters, cards in a row share one height ──────────────────
  row: { flexDirection: "row", alignItems: "stretch", paddingHorizontal: 11 },
  col: { width: "50%", padding: 5 },

  // ── Card — same shell as ProductCard on Home ─────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE8E0",
    shadowColor: "#2A1F4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Image — white square, "contain" so every product sits the same size ──
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
    padding: 12,
  },
  image: { width: "100%", height: "100%" },
  imgLoader: { flex: 1, alignSelf: "center" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  offBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#1F8A4C",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  offBadgeText: { fontSize: 9.5, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.2 },

  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(34,30,28,0.18)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },

  // ── Info ─────────────────────────────────────────────────────────────────────
  info: { flex: 1, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, backgroundColor: "#FFFFFF" },
  name: { fontSize: 13, fontWeight: "600", color: C.textPrimary, lineHeight: 18, minHeight: 36 },
  metaRow: { flexDirection: "row", marginTop: 6 },
  metaBadge: { backgroundColor: "#F7F1E6", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  metaText: { fontSize: 10, fontWeight: "600", color: "#8B5A2B" },
  priceBlock: { flex: 1, justifyContent: "flex-end", marginTop: 8 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  priceRupee: { fontSize: 11, fontWeight: "700", color: "#0E6B57" },
  priceAmount: { fontSize: 15, fontWeight: "900", color: "#0E6B57", lineHeight: 19, flexShrink: 1 },
  priceStrike: {
    fontSize: 11,
    color: "#C0392B",
    textDecorationLine: "line-through",
    fontWeight: "600",
    marginLeft: 6,
    flexShrink: 1,
  },
  priceNA: { fontSize: 11, color: C.textMuted, fontStyle: "italic", lineHeight: 19 },

  // ── Action — full card width under the price ──────────────────────────────
  cta: { marginTop: 10, height: 34 },
  inCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1.3,
    backgroundColor: "#EAF3EE",
    borderColor: "#B7D2C2",
  },
  inCartText: { fontSize: 12, fontWeight: "700", color: "#176B4D", textTransform: "uppercase" },

  // ── Empty ────────────────────────────────────────────────────────────────────
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.goldMuted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.goldBorder,
    marginBottom: 18,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center", marginBottom: 26, lineHeight: 19 },
  browseBtn: {
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  browseBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});

export default PgWishlistScreen;
