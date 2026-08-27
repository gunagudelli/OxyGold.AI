import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Platform,
  TextInput,
  FlatList,
  BackHandler,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { selectUserId, selectAccessToken } from "../../store/authSlice";
import { incrementWishlistCount, decrementWishlistCount } from "../../store/cartSlice";
import ProductCard from "../components/ProductCard";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";
import {
  getMainCategories,
  getSubCategories,
  getProducts,
  getProductVariants,
  getCategoryImages,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "./physicalGoldApi";
import { performanceMonitor } from "../../utils/performanceMonitor";
import { FLATLIST_OPTIMIZATIONS, keyExtractor } from "../../utils/flatListOptimizations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;

// ─── Design Tokens — Physical Gold palette (matches oxygold web app) ──
const C = {
  bg:           "#F8F7F6",
  bgCard:       "#FFFFFF",
  bgElevated:   "#FFFFFF",
  bgGlass:      "rgba(255,255,255,0.92)",
  gold:         "#CF8B17",
  goldBright:   "#E8A530",
  goldSoft:     "#CF8B17",
  goldMuted:    "rgba(207,139,23,0.10)",
  goldBorder:   "rgba(207,139,23,0.20)",
  goldText:     "#CF8B17",
  white:        "#FFFFFF",
  textPrimary:  "#1C1C1E",
  textSecondary:"#7A7A80",
  textMuted:    "#A79C93",
  green:        "#2ECC71",
  greenBg:      "rgba(46,204,113,0.08)",
  red:          "#C85A54",
  border:       "#E7E0DA",
  borderStrong: "#D8CFC3",
  divider:      "#EEEBE8",
  shadowGold:   "rgba(207,139,23,0.15)",
  shadowDark:   "rgba(34,30,28,0.10)",
  shimmer:      "#F8F7F6",
};

const TRUST = [
  { label: "BIS\nHallmarked" },
  { label: "Free\nDelivery" },
  { label: "Secure\nPayment" },
  { label: "Ontime\nDelivery" },
];

// Cross-promo banner to the Digital Gold dashboard — hidden per request.
const SHOW_DIGITAL_GOLD_BANNER = false;

// ─── Global image cache (persists across renders) ─────────────────────────────
const IMAGE_CACHE = {};

// Extract image URL from category/subcat data without API call
const extractDirectImageUrl = (item) =>
  item?.imageUrl || item?.image || item?.categoryImage || null;

// Placeholder URL — lightweight, no external dep
const placeholder = (text, size = 80) =>
  `https://via.placeholder.com/${size}?text=${encodeURIComponent(text?.charAt(0) || "G")}`;

// ─── Shimmer ──────────────────────────────────────────────────────────────────
const ShimmerBox = memo(({ width, height, borderRadius = 8, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.20] });
  return (
    <View style={[{ width, height }, style]}>
      <Animated.View style={{ flex: 1, borderRadius, backgroundColor: C.goldText, opacity }} />
    </View>
  );
});

// ─── Lazy Image — shows shimmer until loaded, then fades in ───────────────────
const LazyImage = memo(({ uri, style, resizeMode = "cover", fallbackText = "G" }) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const src = (!uri || errored) ? placeholder(fallbackText) : uri;

  const onLoad = useCallback(() => {
    setLoaded(true);
    Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [fade]);

  const onError = useCallback(() => {
    setErrored(true);
    setLoaded(true);
    Animated.timing(fade, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <View style={[style, { overflow: "hidden", backgroundColor: C.shimmer }]}>
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.shimmer }]} />
      )}
      <Animated.Image
        source={{ uri: src, cache: 'force-cache' }}
        style={[style, { opacity: fade }]}
        resizeMode={resizeMode}
        onLoad={onLoad}
        onError={onError}
        fadeDuration={0}
      />
    </View>
  );
});

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = memo(({ title, count, onViewAll, onBack, showBack }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      {showBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={18} color={C.textPrimary} />
        </TouchableOpacity>
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
      {count != null && count > 0 && (
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{count}</Text>
        </View>
      )}
    </View>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn} activeOpacity={0.6} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.viewAllText}>View All</Text>
        <Ionicons name="chevron-forward" size={14} color={C.gold} />
      </TouchableOpacity>
    )}
  </View>
));

// ─── Main Component ───────────────────────────────────────────────────────────
const PgHomeScreen = ({ navigation }) => {
  const userId      = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const dispatch    = useDispatch();

  const [categories,           setCategories]           = useState([]);
  const [subCategories,        setSubCategories]        = useState([]);
  const [products,             setProducts]             = useState([]);
  const [loading,              setLoading]              = useState({ categories: false, subCategories: false, products: false });
  const [viewMode,             setViewMode]             = useState("categories");
  const [activeCategory,       setActiveCategory]       = useState(null);
  const [activeCategoryName,   setActiveCategoryName]   = useState("");
  const [activeCategoryImage,  setActiveCategoryImage]  = useState(null);
  const [activeSubCat,         setActiveSubCat]         = useState(null);
  const [activeSubCatName,     setActiveSubCatName]     = useState("");
  const [showAllProducts,      setShowAllProducts]      = useState(false);

  // ── Image maps — keyed by id → url ────────────────────────────────────────
  const [categoryImages,    setCategoryImages]    = useState({});
  const [subCategoryImages, setSubCategoryImages] = useState({});

  // We track which IDs are currently being fetched so we don't double-fetch
  const fetchingRef   = useRef(new Set());
  const variantCache  = useRef({});

  // Search
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [searchResults,  setSearchResults]  = useState({ categories: [], subCategories: [], products: [] });
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [allProductsCache, setAllProductsCache] = useState([]);
  const searchInputRef  = useRef(null);
  const searchBarAnim   = useRef(new Animated.Value(0)).current;

  // Wishlist
  const [wishlistMap,     setWishlistMap]     = useState({});
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [wishlistToast,   setWishlistToast]   = useState({ visible: false, text: "", added: true });
  const toastTimeoutRef = useRef(null);

  const heroAnim   = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef   = useRef(null);
  const bannerScrollRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerIntervalRef  = useRef(null);
  const isManualScrollRef  = useRef(false);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((text, added) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setWishlistToast({ visible: true, text, added });
    toastTimeoutRef.current = setTimeout(() => setWishlistToast({ visible: false, text: "", added: true }), 2500);
  }, []);

  useEffect(() => () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    // If no userId, navigate to login immediately
    if (!userId) {
      console.log('[PgHomeScreen] No userId found, navigating to login');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    
    performanceMonitor.startMeasure("PgHomeScreen");
    fetchCategories();
  }, [userId]);

  useFocusEffect(useCallback(() => () => {
    if (bannerIntervalRef.current) clearInterval(bannerIntervalRef.current);
  }, []));

  useFocusEffect(useCallback(() => {
    // Check if user is logged in on every focus
    if (!userId) {
      console.log('[PgHomeScreen] No userId on focus, navigating to login');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    
    getWishlist(userId)
      .then((items) => {
        const map = {};
        items.forEach((w) => {
          const pid = String(w.productId || w.product?.id);
          if (pid) map[pid] = w.id || w.wishlistId;
        });
        setWishlistMap(map);
      })
      .catch(() => {});
  }, [userId, navigation]));

  // ── Fetch categories ──────────────────────────────────────────────────────
  const fetchCategories = async () => {
    if (!userId || !accessToken) return;
    const t0 = Date.now();
    try {
      setLoading((p) => ({ ...p, categories: true }));
      const data = await getMainCategories(userId);
      setCategories(data || []);
      performanceMonitor.endMeasure("PgHomeScreen");
    } catch (_) {}
    finally {
      setTimeout(() => setLoading((p) => ({ ...p, categories: false })), Math.max(0, 800 - (Date.now() - t0)));
    }
  };

  const fetchSubCategoriesData = async (categoryId) => {
    const t0 = Date.now();
    try {
      setLoading((p) => ({ ...p, subCategories: true }));
      setSubCategories([]);
      const data = await getSubCategories(categoryId);
      setSubCategories(data || []);
    } catch (_) {}
    finally {
      setTimeout(() => setLoading((p) => ({ ...p, subCategories: false })), Math.max(0, 800 - (Date.now() - t0)));
    }
  };

  const fetchProductsData = async (subCategoryId) => {
    const t0 = Date.now();
    try {
      setLoading((p) => ({ ...p, products: true }));
      setProducts([]);
      const data  = await getProducts(subCategoryId);
      const items = data?.items || data || [];

      // A sub-category with exactly one product has nothing to browse —
      // skip the mostly-empty grid and go straight to that product. Reset
      // this screen back to the sub-categories view first, so pressing
      // back from the product lands where the user actually came from
      // instead of on the empty single-item grid.
      setAllProductsCache((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...items.filter((p) => !ids.has(p.id))];
      });

      if (items.length === 1) {
        setViewMode("subcategories");
        setActiveSubCat(null);
        setActiveSubCatName("");
        navigation.navigate("PgProductDetails", {
          productId: items[0]?.id,
          product: items[0],
        });
        return;
      }

      setProducts(items);
    } catch (_) {}
    finally {
      setTimeout(() => setLoading((p) => ({ ...p, products: false })), Math.max(0, 800 - (Date.now() - t0)));
    }
  };

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const handleCategoryPress = (cat) => {
    setActiveCategory(cat.id);
    setActiveCategoryName(cat.name || "");
    setActiveCategoryImage(categoryImages[cat.id] || null);
    setActiveSubCat(null);
    setActiveSubCatName("");
    setProducts([]);
    setViewMode("subcategories");
    fetchSubCategoriesData(cat.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSubCategoryPress = (sub) => {
    setActiveSubCat(sub.id);
    setActiveSubCatName(sub.name || "");
    setViewMode("products");
    setShowAllProducts(false);
    fetchProductsData(sub.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBackToCategories = () => {
    setViewMode("categories");
    setActiveCategory(null);
    setActiveCategoryName("");
    setActiveCategoryImage(null);
    setSubCategories([]);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBackToSubCategories = () => {
    setViewMode("subcategories");
    setActiveSubCat(null);
    setActiveSubCatName("");
    setProducts([]);
    setShowAllProducts(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Hardware back ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSearchActive) { clearSearch(); return true; }
      if (viewMode === "products") { handleBackToSubCategories(); return true; }
      if (viewMode === "subcategories") { handleBackToCategories(); return true; }
      return false;
    });
    return () => h.remove();
  }, [viewMode, isSearchActive]);

  // ── Animations — a single, subtle entrance fade/slide (no looping motion) ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(fadeInAnim,{ toValue: 1, duration: 420, delay: 120, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    bannerIntervalRef.current = setInterval(() => {
      if (!isManualScrollRef.current)
        setCurrentBannerIndex((p) => (p + 1) % 2);
    }, 7000);
    return () => clearInterval(bannerIntervalRef.current);
  }, []);

  useEffect(() => {
    bannerScrollRef.current?.scrollTo({ x: currentBannerIndex * BANNER_WIDTH, animated: true });
  }, [currentBannerIndex]);

  // ── OPTIMIZED image loading ────────────────────────────────────────────────
  // Strategy:
  //  1. If the item already has an imageUrl field → use it immediately, no API call
  //  2. Otherwise check global IMAGE_CACHE
  //  3. Only then fire an API call, and guard with fetchingRef so we don't double-fetch
  //  4. Batch-update state once per effect run via a local accumulator
  //  5. Use Promise.allSettled instead of Promise.all to prevent one failure from blocking others

  const loadImagesForList = useCallback((items, setImageMap) => {
    if (!items?.length) return;

    const toFetch = [];
    const immediate = {};

    items.forEach((item) => {
      if (!item?.id) return;
      const id  = String(item.id);
      const url = extractDirectImageUrl(item);

      if (url) {
        IMAGE_CACHE[id] = url;
        immediate[id]   = url;
      } else if (IMAGE_CACHE[id]) {
        immediate[id] = IMAGE_CACHE[id];
      } else if (!fetchingRef.current.has(id)) {
        toFetch.push(item);
        fetchingRef.current.add(id);
      }
    });

    // Apply everything we already have in one synchronous setState call
    if (Object.keys(immediate).length) {
      setImageMap((prev) => ({ ...prev, ...immediate }));
    }

    // Fetch missing ones — fire all requests in parallel, then batch-update state
    if (!toFetch.length) return;

    // Use Promise.allSettled to handle failures gracefully
    const promises = toFetch.map((item) =>
      getCategoryImages(item.id)
        .then((imgObj) => {
          const url = imgObj?.frontViewUrl || placeholder(item.name);
          IMAGE_CACHE[String(item.id)] = url;
          return { id: String(item.id), url, success: true };
        })
        .catch(() => {
          const url = placeholder(item.name);
          IMAGE_CACHE[String(item.id)] = url;
          return { id: String(item.id), url, success: false };
        })
        .finally(() => fetchingRef.current.delete(String(item.id)))
    );

    // Batch all resolved URLs into a single setState
    Promise.allSettled(promises).then((results) => {
      const batch = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { id, url } = result.value;
          batch[id] = url;
        }
      });
      if (Object.keys(batch).length) {
        setImageMap((prev) => ({ ...prev, ...batch }));
      }
    });
  }, []);

  useEffect(() => {
    loadImagesForList(categories, setCategoryImages);
  }, [categories]);

  useEffect(() => {
    loadImagesForList(subCategories, setSubCategoryImages);
  }, [subCategories]);

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setIsSearchActive(false);
      setSearchResults({ categories: [], subCategories: [], products: [] });
      return;
    }
    setIsSearchActive(true);
    const q = text.trim().toLowerCase();
    setSearchResults({
      categories:    categories.filter((c) => c?.name?.toLowerCase().includes(q)),
      subCategories: subCategories.filter((s) => s?.name?.toLowerCase().includes(q)),
      products:      allProductsCache.filter(
        (p) => p?.name?.toLowerCase().includes(q) || p?.description?.toLowerCase().includes(q)
      ),
    });
  };

  const handleSearchFocus = () => {
    setSearchFocused(true);
    Animated.timing(searchBarAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.timing(searchBarAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearchActive(false);
    setSearchResults({ categories: [], subCategories: [], products: [] });
    searchInputRef.current?.blur();
  };

  const searchBorderColor = searchBarAnim.interpolate({
    inputRange: [0, 1], outputRange: [C.border, C.goldBright],
  });

  // ── Wishlist ───────────────────────────────────────────────────────────────
  const handleWishlistToggle = useCallback(async (item) => {
    const pid = String(item?.id);
    if (wishlistLoading[pid]) return;
    setWishlistLoading((p) => ({ ...p, [pid]: true }));
    try {
      if (wishlistMap[pid]) {
        await removeFromWishlist(wishlistMap[pid]);
        setWishlistMap((p) => { const n = { ...p }; delete n[pid]; return n; });
        dispatch(decrementWishlistCount());
        showToast("Removed from wishlist", false);
      } else {
        let v = variantCache.current[pid];
        if (!v) {
          const r     = await getProductVariants(item.id);
          const inner = r?.data || r;
          const list  = inner?.listVariantResponse || inner?.variants || (Array.isArray(inner) ? inner : []);
          v = list[0];
          if (v) variantCache.current[pid] = v;
        }
        if (!v?.id) { showToast("No variant found for this product", false); return; }
        const res = await addToWishlist(userId, item.id, v.id);
        setWishlistMap((p) => ({ ...p, [pid]: res?.id || res?.wishlistId || pid }));
        dispatch(incrementWishlistCount());
        showToast("Added to wishlist", true);
      }
    } catch (e) {
      showToast(e?.message || "Wishlist update failed", false);
    }
    setWishlistLoading((p) => ({ ...p, [pid]: false }));
  }, [wishlistMap, wishlistLoading, userId, dispatch, showToast]);

  const visibleProducts = showAllProducts ? products : products.slice(0, 6);
  const totalProducts   = products.length;
  const hasMore         = totalProducts > 6 && !showAllProducts;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderSearchResults = () => {
    const { categories: rCats, subCategories: rSubs, products: rProds } = searchResults;
    if (!rCats.length && !rSubs.length && !rProds.length) {
      return (
        <View style={styles.searchEmptyState}>
          <View style={styles.searchEmptyIconWrap}>
            <Ionicons name="search" size={28} color={C.textMuted} />
          </View>
          <Text style={styles.searchEmptyTitle}>No results for "{searchQuery}"</Text>
          <Text style={styles.searchEmptySubtitle}>Try searching by product name or category</Text>
        </View>
      );
    }
    return (
      <View style={styles.searchResultsWrap}>
        {rCats.length > 0 && (
          <View>
            <Text style={styles.searchGroupLabel}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchCatScroll}>
              {rCats.map((cat) => (
                <TouchableOpacity key={cat.id} style={styles.searchCatItem}
                  onPress={() => { clearSearch(); handleCategoryPress(cat); }} activeOpacity={0.75}>
                  <View style={styles.searchCatImgWrap}>
                    <LazyImage
                      uri={categoryImages[cat.id]}
                      style={styles.searchCatImg}
                      fallbackText={cat.name}
                    />
                  </View>
                  <Text style={styles.searchCatLabel} numberOfLines={2}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {rSubs.length > 0 && (
          <View style={{ marginTop: rCats.length ? 8 : 0 }}>
            <Text style={styles.searchGroupLabel}>Sub-Categories</Text>
            <View style={styles.searchSubChipRow}>
              {rSubs.map((s) => (
                <TouchableOpacity key={s.id} style={styles.searchSubChip}
                  onPress={() => { clearSearch(); handleSubCategoryPress(s); }} activeOpacity={0.75}>
                  <LazyImage uri={subCategoryImages[s.id]} style={styles.subChipImg} fallbackText={s.name} />
                  <Text style={styles.searchSubChipText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {rProds.length > 0 && (
          <View style={{ marginTop: (rCats.length || rSubs.length) ? 12 : 0 }}>
            <Text style={styles.searchGroupLabel}>Products ({rProds.length})</Text>
            <View style={styles.grid}>
              {rProds.slice(0, 6).map((item) => (
                <View key={item?.id} style={styles.gridItem}>
                  <ProductCard
                    product={item}
                    isInWishlist={!!wishlistMap[String(item?.id)]}
                    onWishlistToggle={() => handleWishlistToggle(item)}
                    onPress={() => navigation.navigate("PgProductDetails", { productId: item?.id, product: item })}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Category card — extracted so memo works ────────────────────────────────
  const CategoryCard = useCallback(({ item, imageUrl, onPress }) => (
    <TouchableOpacity style={styles.categoryGridItem} onPress={() => onPress(item)} activeOpacity={0.75}>
      <View style={styles.categoryCard}>
        <View style={styles.categoryCardImgWrap}>
          <LazyImage uri={imageUrl} style={styles.categoryCardImg} resizeMode="cover" fallbackText={item.name} />
        </View>
        <Text style={styles.categoryCardLabel} numberOfLines={2}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  ), []);

  const renderCategoriesGrid = () => {
    if (loading.categories) {
      return (
        <View style={styles.categoryGrid}>
          {[1,2,3,4].map((i) => (
            <View key={i} style={styles.categoryGridItem}>
              <View style={styles.categoryCardShimmer}>
                <ShimmerBox width="100%" height={140} borderRadius={0} />
                <View style={{ padding: 12 }}>
                  <ShimmerBox width="70%" height={12} borderRadius={4} style={{ alignSelf: "center" }} />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={styles.categoryGrid}>
        {categories.filter((c) => c?.id).map((cat) => (
          <CategoryCard
            key={cat.id}
            item={cat}
            imageUrl={categoryImages[cat.id]}
            onPress={handleCategoryPress}
          />
        ))}
      </View>
    );
  };

  const renderSubCategoriesGrid = () => {
    if (loading.subCategories) {
      return (
        <View style={styles.categoryGrid}>
          {[1,2,3,4].map((i) => (
            <View key={i} style={styles.categoryGridItem}>
              <View style={styles.categoryCardShimmer}>
                <ShimmerBox width="100%" height={140} borderRadius={0} />
                <View style={{ padding: 12 }}>
                  <ShimmerBox width="70%" height={12} borderRadius={4} style={{ alignSelf: "center" }} />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }
    if (!subCategories.length) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.searchEmptyIconWrap}>
            <Ionicons name="grid-outline" size={28} color={C.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Sub-categories found</Text>
          <Text style={styles.emptySubtitle}>Try a different category</Text>
        </View>
      );
    }
    return (
      <View style={styles.categoryGrid}>
        {subCategories.filter((s) => s?.id).map((sub) => (
          <CategoryCard
            key={sub.id}
            item={sub}
            imageUrl={subCategoryImages[sub.id]}
            onPress={handleSubCategoryPress}
          />
        ))}
      </View>
    );
  };

  const renderProductsGrid = () => {
    if (loading.products) {
      return (
        <View style={styles.grid}>
          {[1,2,3,4].map((i) => (
            <View key={i} style={styles.gridItem}>
              <View style={styles.productShimmerCard}>
                <ShimmerBox width="100%" height={160} borderRadius={0} />
                <View style={styles.productShimmerHeartWrap}>
                  <ShimmerBox width={28} height={28} borderRadius={14} />
                </View>
                <View style={styles.productShimmerBody}>
                  <ShimmerBox width="78%" height={11} borderRadius={4} />
                  <ShimmerBox width="52%" height={11} borderRadius={4} style={{ marginTop: 6 }} />
                  <ShimmerBox width="40%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
                  <ShimmerBox width="100%" height={34} borderRadius={10} style={{ marginTop: 12 }} />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }
    if (!totalProducts) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.searchEmptyIconWrap}>
            <Ionicons name="cube-outline" size={28} color={C.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>Try a different sub-category</Text>
        </View>
      );
    }
    return (
      <>
        <View style={styles.productsSummaryRow}>
          <Text style={styles.productsSummaryText}>
            Showing <Text style={styles.productsSummaryBold}>{visibleProducts.length}</Text>
            {" "}of <Text style={styles.productsSummaryBold}>{totalProducts}</Text> products
          </Text>
        </View>
        <FlatList
          data={visibleProducts}
          keyExtractor={keyExtractor}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <ProductCard
                product={item}
                isInWishlist={!!wishlistMap[String(item?.id)]}
                onWishlistToggle={() => handleWishlistToggle(item)}
                onPress={() => navigation.navigate("PgProductDetails", { productId: item?.id, product: item })}
              />
            </View>
          )}
          {...FLATLIST_OPTIMIZATIONS.productGrid}
        />
        {hasMore && (
          <TouchableOpacity style={styles.loadMoreBtn}
            onPress={() => {
              setShowAllProducts(true);
              setTimeout(() => scrollViewRef.current?.scrollTo({ y: 600, animated: true }), 80);
            }}
            activeOpacity={0.78}
          >
            <Text style={styles.loadMoreText}>View All {totalProducts} Products</Text>
            <Text style={styles.loadMoreArrow}>›</Text>
          </TouchableOpacity>
        )}
        {showAllProducts && totalProducts > 6 && (
          <TouchableOpacity style={styles.collapseBtn}
            onPress={() => {
              setShowAllProducts(false);
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
            activeOpacity={0.78}
          >
            <Text style={styles.collapseBtnText}>Show Less ↑</Text>
          </TouchableOpacity>
        )}
        {!hasMore && totalProducts <= 2 && (
          <TouchableOpacity
            style={styles.moreCategoriesPrompt}
            onPress={handleBackToSubCategories}
            activeOpacity={0.78}
          >
            <View style={styles.moreCategoriesIconWrap}>
              <Ionicons name="grid-outline" size={18} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.moreCategoriesTitle}>That's everything here</Text>
              <Text style={styles.moreCategoriesSub}>Browse other sub-categories</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  // Show loading while checking auth
  if (!userId) {
    return (
      <PgLayout title="GoldMart" showBack={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </PgLayout>
    );
  }
  
  return (
    <PgLayout title="GoldMart" showBack={false}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search Bar ── */}
        <Animated.View style={[styles.searchBarWrap, { borderColor: searchBorderColor }]}>
          <Ionicons name="search" size={17} color={C.textMuted} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search gold, coins, jewellery..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={17} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {isSearchActive ? renderSearchResults() : (
          <>
            {/* ── CATEGORIES VIEW ── */}
            {viewMode === "categories" && (
              <FadeSlideIn key="categories">
                {/* Banner Carousel */}
                <Animated.View style={[styles.bannerCarouselWrap, { opacity: heroAnim, transform: [{ translateY: heroTranslate }] }]}>
                  <ScrollView
                    ref={bannerScrollRef}
                    horizontal pagingEnabled scrollEventThrottle={16}
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    snapToInterval={BANNER_WIDTH}
                    snapToAlignment="center"
                    disableIntervalMomentum
                    onScrollBeginDrag={() => { isManualScrollRef.current = true; }}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
                      setCurrentBannerIndex(idx);
                      setTimeout(() => { isManualScrollRef.current = false; }, 3000);
                    }}
                  >
                    {/* Slide 1 — Physical Gold */}
                    <View style={styles.bannerSlide}>
                      <View style={styles.heroLeft}>
                        <View style={styles.bisPill}>
                          <Ionicons name="shield-checkmark-outline" size={12} color="#E8A530" />
                          <Text style={styles.bisPillText}>BIS HALLMARKED</Text>
                        </View>

                        <Text style={styles.bannerHeadline}>
                          Pure Gold,{"\n"}
                          <Text style={styles.bannerHeadlineGold}>Delivered Home.</Text>
                        </Text>

                        <Text style={styles.bannerSub}>
                          Certified 24K · Free shipping · Pan India
                        </Text>

                        <TouchableOpacity
                          style={styles.bannerCTA}
                          onPress={() => scrollViewRef.current?.scrollTo({ y: 400, animated: true })}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.bannerCTAText}>Shop Now</Text>
                          <Ionicons name="arrow-forward" size={14} color="#1C1C1E" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.heroRight}>
                        <View style={styles.heroIconBadge}>
                          <Ionicons name="diamond" size={30} color="#E8A530" />
                        </View>
                      </View>
                    </View>

                    {/* Slide 2 — Digital Gold */}
                    <View style={styles.bannerSlideDigital}>
                      <View style={styles.heroLeft}>
                        <View style={styles.dgStartPill}>
                          <Ionicons name="flash-outline" size={12} color="#E8A530" />
                          <Text style={styles.dgStartText}>START FROM ₹100</Text>
                        </View>

                        <Text style={styles.bannerHeadline}>
                          Invest Smart,{"\n"}
                          <Text style={styles.bannerHeadlineGreen}>Buy Digital Gold.</Text>
                        </Text>

                        <Text style={styles.bannerSub}>
                          ₹100 onwards · Sell anytime · 100% secure
                        </Text>

                        <TouchableOpacity
                          style={styles.dgCTA}
                          onPress={() => navigation.navigate("HowItWorks")}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.dgCTAText}>Explore</Text>
                          <Ionicons name="arrow-forward" size={14} color="#3D2B1A" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.heroRight}>
                        <View style={styles.heroIconBadgeGreen}>
                          <Ionicons name="trending-up" size={30} color="#E8A530" />
                        </View>
                      </View>
                    </View>
                  </ScrollView>

                  <View style={styles.indicatorRow}>
                    {[0, 1].map((i) => (
                      <TouchableOpacity key={i} onPress={() => setCurrentBannerIndex(i)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                        <Animated.View style={[styles.indicator, currentBannerIndex === i && styles.indicatorActive]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>

                {/* Trust Strip */}
                <Animated.View style={[styles.trustStrip, { opacity: fadeInAnim }]}>
                  {TRUST.map((t, i) => (
                    <React.Fragment key={i}>
                      <View style={styles.trustItem}>
                        <Text style={styles.trustLabel}>{t.label}</Text>
                      </View>
                      {i < TRUST.length - 1 && <View style={styles.trustDivider} />}
                    </React.Fragment>
                  ))}
                </Animated.View>

                <SectionHeader title="Categories" count={categories.length || null} />
                {renderCategoriesGrid()}

                {/* Digital Gold Banner — hidden per request; SHOW_DIGITAL_GOLD_BANNER flips it back on */}
                {SHOW_DIGITAL_GOLD_BANNER && (
                  <TouchableOpacity style={styles.digitalBanner}
                    onPress={() => navigation.navigate("Dashboard")} activeOpacity={0.7}>
                    <View style={styles.digitalIconWrap}>
                      <Ionicons name="trending-up-outline" size={19} color={C.light} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.digitalTitle}>Try Digital Gold</Text>
                      <Text style={styles.digitalSubtitle}>Start from ₹100 · Buy, sell anytime</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </FadeSlideIn>
            )}

            {/* ── SUBCATEGORIES VIEW ── */}
            {viewMode === "subcategories" && (
              <FadeSlideIn key="subcategories">
                <View style={styles.subCategoryBanner}>
                  <LazyImage
                    uri={activeCategoryImage || "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&q=80"}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    fallbackText={activeCategoryName}
                  />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} />
                  <View style={styles.subCategoryBannerContent}>
                    <TouchableOpacity onPress={handleBackToCategories} style={styles.subCategoryBackBtn} activeOpacity={0.7}>
                      <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.subCategoryBannerTextWrap}>
                      <Text style={styles.subCategoryBannerLabel}>CATEGORY</Text>
                      <Text style={styles.subCategoryBannerTitle}>{activeCategoryName || "Sub-Categories"}</Text>
                      {!loading.subCategories && subCategories.length > 0 && (
                        <Text style={styles.subCategoryBannerCount}>{subCategories.length} Sub-Categories</Text>
                      )}
                    </View>
                  </View>
                </View>

                <SectionHeader
                  title="Explore Sub-Categories"
                  count={!loading.subCategories && subCategories.length > 0 ? subCategories.length : null}
                />
                {renderSubCategoriesGrid()}
              </FadeSlideIn>
            )}

            {/* ── PRODUCTS VIEW ── */}
            {viewMode === "products" && (
              <FadeSlideIn key="products">
                <View style={styles.breadcrumb}>
                  <TouchableOpacity onPress={handleBackToCategories} activeOpacity={0.7}>
                    <Text style={styles.breadcrumbLink}>Categories</Text>
                  </TouchableOpacity>
                  <Text style={styles.breadcrumbSep}>›</Text>
                  <TouchableOpacity onPress={handleBackToSubCategories} activeOpacity={0.7}>
                    <Text style={styles.breadcrumbLink}>{activeCategoryName}</Text>
                  </TouchableOpacity>
                  <Text style={styles.breadcrumbSep}>›</Text>
                  <Text style={styles.breadcrumbCurrent}>{activeSubCatName}</Text>
                </View>
                <SectionHeader
                  title={activeSubCatName || "Products"}
                  count={!loading.products && totalProducts > 0 ? totalProducts : null}
                  showBack
                  onBack={handleBackToSubCategories}
                />
                {renderProductsGrid()}
              </FadeSlideIn>
            )}
          </>
        )}
      </ScrollView>

      {/* Toast */}
      {wishlistToast.visible && (
        <Animated.View style={[
          styles.toast,
          wishlistToast.added ? styles.toastAdded : styles.toastRemoved,
          { bottom: Platform.OS === "ios" ? 110 : 90 },
        ]}>
          <Ionicons
            name={wishlistToast.added ? "heart" : "heart-dislike-outline"}
            size={15}
            color="#FFFFFF"
            style={{ marginRight: 7 }}
          />
          <Text style={styles.toastText}>{wishlistToast.text}</Text>
        </Animated.View>
      )}
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40, backgroundColor: "#F8F7F6" },

  searchBarWrap: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 14, marginBottom: 14,
    backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 12 : 9, gap: 10,
    shadowColor: C.shadowDark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7, shadowRadius: 6, elevation: 3,
  },
  searchIcon:     { fontSize: 16 },
  searchInput:    { flex: 1, fontSize: 14, fontWeight: "500", color: C.textPrimary, padding: 0 },
  searchClearBtn: { fontSize: 13, color: C.textMuted, fontWeight: "700", paddingHorizontal: 4 },

  searchResultsWrap:   { paddingBottom: 20 },
  searchGroupLabel:    { fontSize: 13, fontWeight: "700", color: C.textSecondary, marginHorizontal: 16, marginBottom: 10, marginTop: 4, letterSpacing: 0.2 },
  searchCatScroll:     { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  searchCatItem:       { alignItems: "center", width: 72 },
  searchCatImgWrap:    { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F7F4ED", borderWidth: 1.5, borderColor: C.goldBorder, overflow: "hidden", marginBottom: 6 },
  searchCatImg:        { width: 56, height: 56, borderRadius: 28 },
  searchCatLabel:      { fontSize: 10, fontWeight: "600", color: C.textSecondary, textAlign: "center", lineHeight: 13 },
  searchSubChipRow:    { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  searchSubChip:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.goldBorder, gap: 7 },
  searchSubChipText:   { fontSize: 12, fontWeight: "600", color: C.goldText },
  searchEmptyState:    { alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 },
  searchEmptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#E7E0DA", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  searchEmptyTitle:    { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 6 },
  searchEmptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },

  bannerCarouselWrap: { marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: "hidden" },
  bannerSlide: {
    width: BANNER_WIDTH,
    minHeight: 168,
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  bannerSlideDigital: {
    width: BANNER_WIDTH,
    minHeight: 168,
    backgroundColor: "#3D2B1A",
    borderRadius: 18,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  heroLeft: { flex: 1 },
  heroRight: { alignItems: "center", marginLeft: 16 },
  heroIconBadge: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "rgba(232,165,48,0.14)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(232,165,48,0.30)",
  },
  heroIconBadgeGreen: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "rgba(232,165,48,0.14)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(232,165,48,0.30)",
  },

  // BIS Hallmarked / Start-from pills
  bisPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(232,165,48,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  bisPillText: { fontSize: 9, fontWeight: "700", color: "#E8A530", letterSpacing: 1.2 },
  dgStartPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(232,165,48,0.14)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  dgStartText: { fontSize: 9, fontWeight: "700", color: "#E8A530", letterSpacing: 1.1 },

  // Headline
  bannerHeadline: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 28,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  bannerHeadlineGold: { color: "#E8A530" },
  bannerHeadlineGreen: { color: "#E8A530" },

  // Sub-line
  bannerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 18,
    lineHeight: 17,
  },

  // CTA buttons
  bannerCTA: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8A530",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerCTAText: { fontSize: 13, fontWeight: "600", color: "#1C1C1E" },
  dgCTA: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8A530",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dgCTAText: { fontSize: 13, fontWeight: "600", color: "#3D2B1A" },

  indicatorRow:    { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingTop: 10, paddingBottom: 4, backgroundColor: "#F8F7F6" },
  indicator:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(207,139,23,0.22)" },
  indicatorActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: C.goldBright },

  trustStrip: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 10, marginBottom: 22,
    backgroundColor: C.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.shadowDark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2,
  },
  trustItem:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  trustLabel:   { fontSize: 9, fontWeight: "600", color: C.textSecondary, textAlign: "center", lineHeight: 13 },
  trustDivider: { width: 1, height: 22, backgroundColor: C.border },

  sectionHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginBottom: 14, marginTop: 4 },
  sectionTitleRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle:       { fontSize: 16, fontWeight: "600", color: C.textPrimary, letterSpacing: -0.2 },
  countPill:          { backgroundColor: "#F5F4F1", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  countPillText:      { fontSize: 11, fontWeight: "500", color: C.textSecondary },
  viewAllBtn:         { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 4 },
  viewAllText:        { fontSize: 13, fontWeight: "600", color: C.gold },

  backBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: "center", alignItems: "center" },

  breadcrumb:        { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, marginTop: 2, flexWrap: "wrap", gap: 2 },
  breadcrumbLink:    { fontSize: 11, color: C.gold, fontWeight: "500" },
  breadcrumbSep:     { fontSize: 13, color: C.textMuted, marginHorizontal: 2 },
  breadcrumbCurrent: { fontSize: 11, color: C.textSecondary, fontWeight: "600" },

  categoryGrid:       { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, marginBottom: 20 },
  categoryGridItem:   { width: "50%", padding: 6 },
  categoryCard:       { backgroundColor: C.bgCard, borderRadius: 18, overflow: "hidden", shadowColor: C.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 2 },
  categoryCardShimmer:{ backgroundColor: C.bgCard, borderRadius: 18, overflow: "hidden" },
  categoryCardImgWrap:{ width: "100%", height: 220, backgroundColor: C.shimmer },
  categoryCardImg:    { width: "100%", height: "100%" },
  categoryCardLabel:  { fontSize: 13, fontWeight: "500", color: C.textPrimary, textAlign: "center", lineHeight: 17, paddingVertical: 12, paddingHorizontal: 8 },

  subChipImg: { width: 22, height: 22, borderRadius: 11 },

  grid:     { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, marginBottom: 12 },
  gridRow:  { justifyContent: "flex-start" },
  gridItem: { width: "50%", padding: 6 },

  productShimmerCard:      { backgroundColor: C.bgCard, borderRadius: 18, overflow: "hidden", minHeight: 280 },
  productShimmerHeartWrap: { position: "absolute", top: 10, right: 10 },
  productShimmerBody:      { padding: 12 },

  productsSummaryRow:  { marginHorizontal: 16, marginBottom: 10, marginTop: -4 },
  productsSummaryText: { fontSize: 12, color: C.textMuted, fontWeight: "400" },
  productsSummaryBold: { color: C.goldText, fontWeight: "600" },

  loadMoreBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 16, marginBottom: 8, backgroundColor: C.bgCard, borderRadius: 16, paddingVertical: 16, gap: 4, borderWidth: 1, borderColor: C.border, shadowColor: C.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 2 },
  loadMoreText:   { fontSize: 14, fontWeight: "600", color: C.goldText },
  loadMoreArrow:  { fontSize: 20, color: C.goldBright, lineHeight: 22 },
  collapseBtn:    { alignItems: "center", justifyContent: "center", marginHorizontal: 16, marginBottom: 24, paddingVertical: 13, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  collapseBtnText:{ fontSize: 13, fontWeight: "500", color: C.textSecondary },

  moreCategoriesPrompt: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 8, marginBottom: 24,
    backgroundColor: C.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  moreCategoriesIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: C.goldMuted, justifyContent: "center", alignItems: "center",
  },
  moreCategoriesTitle: { fontSize: 13.5, fontWeight: "600", color: C.textPrimary, marginBottom: 2 },
  moreCategoriesSub:   { fontSize: 11.5, color: C.textMuted },

  emptyState:    { alignItems: "center", paddingVertical: 52, paddingHorizontal: 24 },
  emptyTitle:    { fontSize: 15, fontWeight: "600", color: C.textPrimary, marginBottom: 5 },
  emptySubtitle: { fontSize: 12, color: C.textMuted },

  digitalBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 4, backgroundColor: C.bgCard,
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border,
  },
  digitalIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.greenBg, justifyContent: "center", alignItems: "center" },
  digitalTitle:    { fontSize: 14, fontWeight: "600", color: C.textPrimary, marginBottom: 2 },
  digitalSubtitle: { fontSize: 12, color: C.textMuted },

  subCategoryBanner: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 20, borderRadius: 20,
    backgroundColor: "#1C1C1E", minHeight: 140, overflow: "hidden",
  },
  subCategoryBannerContent:    { flexDirection: "row", alignItems: "center", padding: 20, gap: 14, zIndex: 2 },
  subCategoryBackBtn:          { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  subCategoryBannerTextWrap:   { flex: 1 },
  subCategoryBannerLabel:      { fontSize: 10, fontWeight: "600", color: "rgba(232,165,48,0.70)", letterSpacing: 1.5, marginBottom: 4 },
  subCategoryBannerTitle:      { fontSize: 22, fontWeight: "600", color: "#FFFFFF", lineHeight: 30, marginBottom: 4, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subCategoryBannerCount:      { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.65)" },

  toast:        { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, zIndex: 99, elevation: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12 },
  toastAdded:   { backgroundColor: "#1F8A4C" },
  toastRemoved: { backgroundColor: "#8B3A34" },
  toastText:    { fontSize: 13, fontWeight: "700", color: "#fff" },
});

export default PgHomeScreen;