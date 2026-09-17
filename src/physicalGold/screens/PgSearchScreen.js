import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { selectUserId } from "../../store/authSlice";
import { incrementWishlistCount, decrementWishlistCount, setCartCount } from "../../store/cartSlice";
import ProductCard from "../components/ProductCard";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import GuestLoginSheet from "../components/GuestLoginSheet";
import { showCartActionError } from "../utils/cartErrors";
import {
  searchAllProducts,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getProductVariants,
  addToCart,
  getCart,
} from "../api/physicalGoldApi";
import { debounce } from "../../utils/debounce";

const C = {
  bg: "#FFFFFF",
  bgCard: "#FFFFFF",
  gold: "#0E6B57",
  goldBright: "#14876D",
  goldText: "#0E6B57",
  textPrimary: "#1C1C1E",
  textSecondary: "#7A7A80",
  textMuted: "#A79C93",
  border: "#E7E0DA",
};

const PgSearchScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const dispatch = useDispatch();

  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // ── Wishlist — same pattern as PgHomeScreen ──────────────────────────────
  const [wishlistMap, setWishlistMap] = useState({});
  const [wishlistLoading, setWishlistLoading] = useState({});
  const variantCache = useRef({});

  // ── Cart — same pattern as PgHomeScreen ──────────────────────────────────
  const [cartVariantIds, setCartVariantIds] = useState(new Set());
  const [cartLoadingId, setCartLoadingId] = useState(null);

  // ── Guest gate — same pattern as PgHomeScreen ─────────────────────────────
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const pendingActionRef = useRef(null);
  const requireAuth = useCallback((type, product, variant) => {
    pendingActionRef.current = { type, product, variant };
    setShowGuestSheet(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      getWishlist(userId)
        .then((items) => {
          const map = {};
          (items || []).forEach((w) => {
            const pid = String(w.productId || w.product?.id);
            if (pid) map[pid] = w.id || w.wishlistId;
          });
          setWishlistMap(map);
        })
        .catch(() => {});

      getCart(userId)
        .then((cartData) => {
          const ids = (cartData?.itemsInCart || []).map((it) =>
            String(it.productVariantId),
          );
          setCartVariantIds(new Set(ids));
        })
        .catch(() => {});
    }, [userId])
  );

  const handleCardAddToCart = useCallback(
    async (product, variant) => {
      if (!userId) {
        requireAuth("cart", product, variant);
        return;
      }
      const variantId = variant?.id;
      const pid = String(product?.id);
      if (cartVariantIds.has(String(variantId))) {
        navigation.navigate("PgCart");
        return;
      }
      if (!product?.id || !variantId) return;
      setCartLoadingId(pid);
      try {
        await addToCart(userId, product.id, variantId, 1);
        setCartVariantIds((prev) => new Set(prev).add(String(variantId)));
        const cartData = await getCart(userId).catch(() => null);
        if (cartData) dispatch(setCartCount(cartData.totalItemsInCart || 0));
      } catch (e) {
        console.log("[PgSearchScreen] Add to cart failed:", e?.message);
        showCartActionError(e, navigation);
      } finally {
        setCartLoadingId(null);
      }
    },
    [userId, cartVariantIds, dispatch, navigation, requireAuth],
  );

  // Stable reference so every ProductCard gets the same function instead of
  // a fresh closure per item per render — lets ProductCard's React.memo
  // actually skip re-rendering cards that didn't change.
  const handleProductPress = useCallback(
    (item) =>
      navigation.navigate("PgProductDetails", {
        productId: item?.id,
        product: item,
      }),
    [navigation],
  );

  const handleWishlistToggle = useCallback(async (item) => {
    if (!userId) {
      requireAuth("wishlist", item, null);
      return;
    }
    const pid = String(item?.id);
    if (wishlistLoading[pid]) return;
    setWishlistLoading((p) => ({ ...p, [pid]: true }));
    try {
      if (wishlistMap[pid]) {
        await removeFromWishlist(wishlistMap[pid]);
        setWishlistMap((p) => { const n = { ...p }; delete n[pid]; return n; });
        dispatch(decrementWishlistCount());
      } else {
        let v = variantCache.current[pid];
        if (!v) {
          const r = await getProductVariants(item.id);
          const inner = r?.data || r;
          const list = inner?.listVariantResponse || inner?.variants || (Array.isArray(inner) ? inner : []);
          v = list[0];
          if (v) variantCache.current[pid] = v;
        }
        if (!v?.id) return;
        const res = await addToWishlist(userId, item.id, v.id);
        setWishlistMap((p) => ({ ...p, [pid]: res?.id || res?.wishlistId || pid }));
        dispatch(incrementWishlistCount());
      }
    } catch (e) {
      // silent — matches PgHomeScreen's best-effort wishlist toggle
    }
    setWishlistLoading((p) => ({ ...p, [pid]: false }));
  }, [wishlistMap, wishlistLoading, userId, dispatch, requireAuth]);

  // Resume whatever a guest was doing once they've logged in.
  useEffect(() => {
    if (!userId || !pendingActionRef.current) return;
    const { type, product, variant } = pendingActionRef.current;
    pendingActionRef.current = null;
    if (type === "cart") handleCardAddToCart(product, variant);
    else if (type === "wishlist") handleWishlistToggle(product);
  }, [userId, handleCardAddToCart, handleWishlistToggle]);

  // Filter state
  const [filters, setFilters] = useState({
    purity: "",
    size: "",
    inStock: false,
    minPrice: "",
    maxPrice: "",
    minWeight: "",
    maxWeight: "",
    sortBy: "NEWEST",
    page: 0,
    pageSize: 20,
  });

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query, currentFilters) => {
        if (!query.trim()) {
          setProducts([]);
          setTotalResults(0);
          return;
        }

        setLoading(true);
        try {
          const response = await searchAllProducts({
            q: query,
            productType: "PHYSICAL",
            ...currentFilters,
            minPrice: currentFilters.minPrice ? Number(currentFilters.minPrice) : undefined,
            maxPrice: currentFilters.maxPrice ? Number(currentFilters.maxPrice) : undefined,
            minWeight: currentFilters.minWeight ? Number(currentFilters.minWeight) : undefined,
            maxWeight: currentFilters.maxWeight ? Number(currentFilters.maxWeight) : undefined,
            // "In Stock Only" is opt-in — only send it when toggled on, so the
            // default (untouched) search isn't silently narrowed to inStock=false.
            inStock: currentFilters.inStock ? true : undefined,
          });

          const results = response?.data?.results || response?.results || [];
          setProducts(results);
          setTotalResults(response?.data?.total || results.length);
        } catch (error) {
          console.error("[PgSearch] Error:", error);
          setProducts([]);
        } finally {
          setLoading(false);
        }
      }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery, filters);
  }, [searchQuery, filters]);

  const clearSearch = () => {
    setSearchQuery("");
    setProducts([]);
    setTotalResults(0);
  };

  const clearFilters = () => {
    setFilters({
      purity: "",
      size: "",
      inStock: false,
      minPrice: "",
      maxPrice: "",
      minWeight: "",
      maxWeight: "",
      sortBy: "NEWEST",
      page: 0,
      pageSize: 20,
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== "page" && key !== "pageSize" && key !== "sortBy"
  ).length;

  return (
    <PgLayout title="Search" showBack onBack={() => navigation.goBack()}>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search all products..."
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery ? (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterText}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Results Count */}
        {searchQuery && !loading && (
          <Text style={styles.resultsText}>
            {totalResults} {totalResults === 1 ? "result" : "results"} found
          </Text>
        )}

        {/* Products Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <PgLoader label="Searching..." fullscreen={false} />
          ) : products.length === 0 && searchQuery ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtitle}>
                Try different keywords or clear filters
              </Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Start searching</Text>
              <Text style={styles.emptySubtitle}>
                Search for gold products by name, category, or type
              </Text>
            </View>
          ) : (
            <FadeSlideIn style={styles.grid}>
              {products.map((product) => (
                <View key={product.id} style={styles.gridItem}>
                  <ProductCard
                    product={product}
                    isInWishlist={!!wishlistMap[String(product?.id)]}
                    onWishlistToggle={handleWishlistToggle}
                    onAddToCart={handleCardAddToCart}
                    addingCart={cartLoadingId === String(product?.id)}
                    cartVariantIds={cartVariantIds}
                    onPress={handleProductPress}
                  />
                </View>
              ))}
            </FadeSlideIn>
          )}
        </ScrollView>

        {/* Filter Modal */}
        <Modal
          visible={showFilters}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={C.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Sort By */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Sort By</Text>
                  <View style={styles.sortOptions}>
                    {[
                      { label: "Newest", value: "NEWEST" },
                      { label: "Price: Low to High", value: "PRICE_ASC" },
                      { label: "Price: High to Low", value: "PRICE_DESC" },
                      { label: "Name A-Z", value: "NAME_ASC" },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.sortOption,
                          filters.sortBy === option.value && styles.sortOptionActive,
                        ]}
                        onPress={() =>
                          setFilters((prev) => ({ ...prev, sortBy: option.value }))
                        }
                      >
                        <Text
                          style={[
                            styles.sortOptionText,
                            filters.sortBy === option.value && styles.sortOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Purity */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Purity</Text>
                  <View style={styles.purityOptions}>
                    {["22K", "24K", "18K"].map((purity) => (
                      <TouchableOpacity
                        key={purity}
                        style={[
                          styles.purityChip,
                          filters.purity === purity && styles.purityChipActive,
                        ]}
                        onPress={() =>
                          setFilters((prev) => ({
                            ...prev,
                            purity: prev.purity === purity ? "" : purity,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.purityChipText,
                            filters.purity === purity && styles.purityChipTextActive,
                          ]}
                        >
                          {purity}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Price Range */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Price Range (₹)</Text>
                  <View style={styles.rangeInputs}>
                    <TextInput
                      style={styles.rangeInput}
                      placeholder="Min"
                      placeholderTextColor={C.textMuted}
                      keyboardType="numeric"
                      value={filters.minPrice}
                      onChangeText={(text) =>
                        setFilters((prev) => ({ ...prev, minPrice: text }))
                      }
                    />
                    <Text style={styles.rangeSeparator}>-</Text>
                    <TextInput
                      style={styles.rangeInput}
                      placeholder="Max"
                      placeholderTextColor={C.textMuted}
                      keyboardType="numeric"
                      value={filters.maxPrice}
                      onChangeText={(text) =>
                        setFilters((prev) => ({ ...prev, maxPrice: text }))
                      }
                    />
                  </View>
                </View>

                {/* Weight Range */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Weight Range (grams)</Text>
                  <View style={styles.rangeInputs}>
                    <TextInput
                      style={styles.rangeInput}
                      placeholder="Min"
                      placeholderTextColor={C.textMuted}
                      keyboardType="numeric"
                      value={filters.minWeight}
                      onChangeText={(text) =>
                        setFilters((prev) => ({ ...prev, minWeight: text }))
                      }
                    />
                    <Text style={styles.rangeSeparator}>-</Text>
                    <TextInput
                      style={styles.rangeInput}
                      placeholder="Max"
                      placeholderTextColor={C.textMuted}
                      keyboardType="numeric"
                      value={filters.maxWeight}
                      onChangeText={(text) =>
                        setFilters((prev) => ({ ...prev, maxWeight: text }))
                      }
                    />
                  </View>
                </View>

                {/* Size */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Size</Text>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="e.g., ring size, bangle size"
                    placeholderTextColor={C.textMuted}
                    value={filters.size}
                    onChangeText={(text) =>
                      setFilters((prev) => ({ ...prev, size: text }))
                    }
                  />
                </View>

                {/* In Stock Only */}
                <View style={[styles.filterSection, { borderBottomWidth: 0 }]}>
                  <TouchableOpacity
                    style={styles.inStockRow}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, inStock: !prev.inStock }))
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterLabel, { marginBottom: 0 }]}>In Stock Only</Text>
                    <View style={[styles.toggle, filters.inStock && styles.toggleActive]}>
                      <View style={[styles.toggleKnob, filters.inStock && styles.toggleKnobActive]} />
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                >
                  <Text style={styles.clearBtnText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => setShowFilters(false)}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      <GuestLoginSheet
        visible={showGuestSheet}
        onClose={() => {
          setShowGuestSheet(false);
          pendingActionRef.current = null;
        }}
        onSuccess={() => setShowGuestSheet(false)}
      />
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(14,107,87,0.08)",
    borderWidth: 1,
    borderColor: "rgba(14,107,87,0.20)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  resultsText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scrollContent: { paddingBottom: 20 },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
  },
  gridItem: { width: "50%", padding: 5 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.textPrimary,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textPrimary,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 12,
  },
  sortOptions: { gap: 8 },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  sortOptionActive: {
    backgroundColor: "rgba(14,107,87,0.08)",
    borderColor: C.gold,
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
  },
  sortOptionTextActive: {
    color: C.textPrimary,
    fontWeight: "700",
  },
  purityOptions: {
    flexDirection: "row",
    gap: 10,
  },
  purityChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  purityChipActive: {
    backgroundColor: "rgba(14,107,87,0.08)",
    borderColor: C.gold,
  },
  purityChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
  },
  purityChipTextActive: {
    color: C.textPrimary,
    fontWeight: "700",
  },
  rangeInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    fontSize: 14,
    color: C.textPrimary,
  },
  rangeSeparator: {
    fontSize: 16,
    fontWeight: "600",
    color: C.textMuted,
  },
  inStockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.border,
    padding: 3,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: C.gold,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  toggleKnobActive: {
    transform: [{ translateX: 18 }],
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textSecondary,
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.gold,
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  searchIcon: {
    fontSize: 18,
    color: C.textMuted,
  },
  clearIcon: {
    fontSize: 18,
    color: C.textMuted,
    fontWeight: "700",
  },
  filterIcon: {
    fontSize: 20,
    color: C.goldText,
  },
  closeIcon: {
    fontSize: 24,
    color: C.textPrimary,
    fontWeight: "700",
  },
});

export default PgSearchScreen;
