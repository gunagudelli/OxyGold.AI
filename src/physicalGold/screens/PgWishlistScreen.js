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
import { setWishlistCount } from "../../store/cartSlice";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";
import {
  getWishlist,
  removeFromWishlist,
  addToCart,
  getProductAllImages,
} from "./physicalGoldApi";

const C = {
  bg: "#F8F7F6",
  card: "#FFFFFF",
  gold: "#CF8B17",
  goldBright: "#E8A530",
  goldMuted: "rgba(207,139,23,0.10)",
  goldBorder: "rgba(207,139,23,0.20)",
  goldText: "#CF8B17",
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
const WishlistCard = ({ raw, onRemove, onAddToCart, onViewDetails, removing, addingCart }) => {
  const item = resolveItem(raw);
  const [imgUrl, setImgUrl]         = useState(item.imageUrl);
  const [imgLoading, setImgLoading] = useState(!item.imageUrl && !!item.productId);

  React.useEffect(() => {
    if (!item.imageUrl && item.productId) {
      setImgLoading(true);
      getProductAllImages(item.productId)
        .then((res) => setImgUrl(res?.frontViewUrl || null))
        .catch(() => {})
        .finally(() => setImgLoading(false));
    }
  }, [item.productId]);

  return (
    <View style={s.card}>

      {/* ── Image area ─────────────────────────────────── */}
      <TouchableOpacity style={s.imageWrap} onPress={onViewDetails} activeOpacity={0.88}>
        {imgLoading ? (
          <ActivityIndicator size="small" color={C.goldBright} />
        ) : imgUrl ? (
          <Image source={{ uri: imgUrl }} style={s.image} resizeMode="contain" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="diamond-outline" size={28} color={C.goldBright} />
          </View>
        )}

        {/* Purity badge — top left, only when the item actually has one */}
        {!!item.purity && (
          <View style={s.karatBadge}>
            <Text style={s.karatBadgeText}>{item.purity}</Text>
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
            : <Ionicons name="heart" size={15} color={C.red} />
          }
        </TouchableOpacity>
      </TouchableOpacity>

      {/* ── Info ───────────────────────────────────────── */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>{item.name}</Text>

        {!!item.weight && (
          <View style={s.weightPill}>
            <Text style={s.weightText}>{item.weight}g</Text>
          </View>
        )}

        {!!item.price && (
          <Text style={s.price}>
            ₹{Number(item.price).toLocaleString("en-IN")}
          </Text>
        )}
      </View>

      {/* ── Add to Cart ────────────────────────────────── */}
      <TouchableOpacity
        style={s.cartBtn}
        onPress={() => onAddToCart(raw, item)}
        disabled={addingCart || removing}
        activeOpacity={0.82}
      >
        {addingCart
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={s.cartBtnText}>Add to Cart</Text>
        }
      </TouchableOpacity>

    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
const PgWishlistScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const dispatch = useDispatch();
  const [items, setItems]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [removingId, setRemovingId]       = useState(null);
  const [cartLoadingId, setCartLoadingId] = useState(null);

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
    }, [userId, dispatch]),
  );

  const handleRemove = async (wishlistId) => {
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
  };

  const handleAddToCart = async (raw, item) => {
    if (!item.productId || !item.variantId) {
      Alert.alert("Error", "Product info missing");
      return;
    }
    setCartLoadingId(item.wishlistId);
    try {
      await addToCart(userId, item.productId, item.variantId, 1);
      Alert.alert("Added to Cart", `${item.name} added to your cart`, [
        { text: "View Cart", onPress: () => navigation.navigate("PgCart") },
        { text: "OK" },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to add to cart");
    } finally {
      setCartLoadingId(null);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PgLayout title="My Wishlist" showBack onBack={() => navigation.goBack()}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.goldBright} />
        </View>
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

  // ── Grid — pair items into rows of 2 ─────────────────────────────────────────
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] || null]);
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
                      onRemove={handleRemove}
                      onAddToCart={handleAddToCart}
                      onViewDetails={() =>
                        navigation.navigate("PgProductDetails", {
                          productId: item.productId,
                          product: raw.product || raw,
                        })
                      }
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
  countText: { fontSize: 11, fontWeight: "700", color: C.goldText },

  // ── Grid ────────────────────────────────────────────────────────────────────
  row: { flexDirection: "row", paddingHorizontal: 10 },
  col: { width: "50%", padding: 5 },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "rgba(34,30,28,0.09)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Image ────────────────────────────────────────────────────────────────────
  imageWrap: {
    width: "100%",
    height: 148,
    backgroundColor: "#F7F4ED",
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
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
  karatBadgeText: { fontSize: 10, fontWeight: "800", color: C.goldBright, letterSpacing: 0.8 },

  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(200,90,84,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Info ─────────────────────────────────────────────────────────────────────
  info: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6 },
  name: { fontSize: 13, fontWeight: "700", color: C.textPrimary, lineHeight: 18, marginBottom: 6 },
  weightPill: {
    alignSelf: "flex-start",
    backgroundColor: C.goldMuted,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.goldBorder,
    marginBottom: 5,
  },
  weightText: { fontSize: 10, fontWeight: "700", color: C.goldText },
  price: { fontSize: 16, fontWeight: "800", color: C.green, letterSpacing: -0.3, marginBottom: 4 },

  // ── Cart Button ───────────────────────────────────────────────────────────────
  cartBtn: {
    backgroundColor: C.gold,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  cartBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },

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