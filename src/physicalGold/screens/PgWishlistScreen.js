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
import {
  getWishlist,
  removeFromWishlist,
  addToCart,
  getProductAllImages,
  getProductVariants,
  getCart,
} from "./physicalGoldApi";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#0E6B57",
  goldBright: "#14876D",
  goldMuted: "rgba(14,107,87,0.10)",
  goldBorder: "rgba(14,107,87,0.20)",
  goldText: "#0E6B57",
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
  imageUrl: raw.product?.imageUrl || raw.productVariant?.imageUrl || raw.imageUrl || null,
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
    <TouchableOpacity style={s.card} onPress={() => onViewDetails?.(item, raw)} activeOpacity={0.88}>

      {/* ── Image area — square, matches ProductCard on Home ─────────────── */}
      <View style={s.imageWrap}>
        {imgLoading ? (
          <ActivityIndicator size="small" color={C.goldBright} style={s.imgLoader} />
        ) : imgUrl ? (
          <Image source={{ uri: imgUrl }} style={s.image} resizeMode="contain" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="diamond-outline" size={30} color="#CF8B17" />
          </View>
        )}

        {/* Purity badge — top left, only when the item actually has one */}
        {!!item.purity && (
          <View style={s.karatBadge}>
            <Text style={s.karatBadgeText}>{item.purity}</Text>
          </View>
        )}

        {/* heart remove — top right, same circular chip as ProductCard's wishlist button */}
        <TouchableOpacity
          style={s.heartBtn}
          onPress={() => onRemove(item.wishlistId)}
          disabled={removing}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}
        >
          {removing
            ? <ActivityIndicator size="small" color={C.red} />
            : <Ionicons name="heart" size={15} color={C.red} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Info ───────────────────────────────────────── */}
      <View style={s.info}>
        {/* The weight already shows in the name ("10 Gram Gold"), so a
            separate weight badge underneath was just repeating it — dropped
            in favor of the price/MRP/offer block below. */}
        <Text style={s.name} numberOfLines={2}>{item.name}</Text>

        {/* Price on top, MRP + offer % on the line below, Add to Cart chip
            on the right of the whole block. */}
        <View style={s.bottomRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {!!item.price ? (
              <>
                <View style={s.priceRow}>
                  <Text style={s.priceRupee}>₹</Text>
                  <Text style={s.priceAmount}>
                    {Number(item.price).toLocaleString("en-IN")}
                  </Text>
                </View>
                {!!offer && (
                  <View style={s.offerRow}>
                    <Text style={s.priceStrike}>₹{offer.mrpDisplay}</Text>
                    <View style={s.offerPill}>
                      <Text style={s.offerPillText}>{offer.discountPct}% OFF</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <Text style={s.priceNA}>Price on request</Text>
            )}
          </View>

          <TouchableOpacity
            style={[s.cartBtn, inCart && s.cartBtnInCart]}
            onPress={() => (inCart ? onGoToCart() : onAddToCart(raw, item))}
            disabled={addingCart || removing}
            activeOpacity={0.82}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {addingCart ? (
              <ActivityIndicator size="small" color={inCart ? C.gold : "#fff"} />
            ) : inCart ? (
              <>
                <Ionicons name="checkmark-circle" size={13} color={C.gold} />
                <Text style={[s.cartBtnText, s.cartBtnTextInCart]}>In Cart</Text>
              </>
            ) : (
              <>
                <Ionicons name="cart-outline" size={13} color="#fff" />
                <Text style={s.cartBtnText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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

  // ── Grid ────────────────────────────────────────────────────────────────────
  row: { flexDirection: "row", paddingHorizontal: 10 },
  col: { width: "50%", padding: 5 },

  // ── Card — same shell as ProductCard on Home ─────────────────────────────────
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "rgba(34,30,28,0.09)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Image — square, "contain" + consistent padding so every product sits
  // the same size regardless of its own image's crop/aspect ratio (a coin
  // graphic doesn't get zoomed in and crop off its text) ─────────────────────
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F7F4ED",
    position: "relative",
    overflow: "hidden",
    padding: 14,
  },
  image: { width: "100%", height: "100%" },
  imgLoader: { flex: 1, alignSelf: "center" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(207,139,23,0.06)",
  },
  karatBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(34,30,28,0.72)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  karatBadgeText: { fontSize: 10, fontWeight: "800", color: "#E8A530", letterSpacing: 0.8 },

  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(34,30,28,0.15)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },

  // ── Info ─────────────────────────────────────────────────────────────────────
  info: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, gap: 6 },
  name: { fontSize: 13, fontWeight: "600", color: C.textPrimary, lineHeight: 18, height: 36 },
  // ── Bottom row — price block on the left, compact Add to Cart chip on the right ────
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 2,
    gap: 6,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  priceRupee: { fontSize: 11, fontWeight: "600", color: C.textPrimary },
  priceAmount: { fontSize: 16, fontWeight: "700", color: C.textPrimary, lineHeight: 20 },
  priceNA: { fontSize: 11, color: C.textMuted, fontStyle: "italic" },
  // MRP + discount % — the line right below the price
  offerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  priceStrike: { fontSize: 10.5, color: C.red, textDecorationLine: "line-through", fontWeight: "500" },
  offerPill: { backgroundColor: C.goldMuted, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  offerPillText: { fontSize: 9, fontWeight: "700", color: C.gold },

  // ── Cart Button — icon + short label, same height as ProductCard's "View Details" ──
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: C.gold,
  },
  cartBtnText: { fontSize: 11.5, fontWeight: "700", color: "#fff" },
  // ── Already-in-cart state — outlined instead of filled, so it visibly
  // differs from the "Add" button rather than silently doing nothing ──
  cartBtnInCart: {
    backgroundColor: C.goldMuted,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  cartBtnTextInCart: { color: C.gold },

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