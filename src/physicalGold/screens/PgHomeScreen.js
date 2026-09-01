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
  getOxygoldRates,
} from "./physicalGoldApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const WHY_SHOP = [
  { image: require("../../../assets/Bishallmark.png"), title: "BIS Hallmarked", subtitle: "Certified purity you can trust always." },
  { image: require("../../../assets/securedelivery.png"), title: "Secure Delivery", subtitle: "Fully insured & safe delivery." },
  { image: require("../../../assets/securepaymntes.png"), title: "Secure Payments", subtitle: "100% safe & encrypted transactions." },
  { image: require("../../../assets/Contact Support.png"), title: "Dedicated Support", subtitle: "We're here to help you, anytime." },
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

// ─── Rate column — one karat/metal cell inside the live-rates card ────────────
const RateColumn = memo(({ icon, label, rate, decimals }) => (
  <View style={styles.rateBlock}>
    <Image source={icon} style={styles.rateIconImg} resizeMode="contain" />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={styles.rateLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.rateValue} numberOfLines={1}>
        ₹{Number(rate.price || 0).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        <Text style={styles.rateUnit}> /gm</Text>
      </Text>
      {rate.direction && (
        <View style={styles.rateChangeRow}>
          <Ionicons
            name={rate.direction === "up" ? "trending-up" : "trending-down"}
            size={11}
            color={rate.direction === "up" ? C.green : C.red}
          />
          <Text style={[styles.rateChangeText, { color: rate.direction === "up" ? C.green : C.red }]}>
            {rate.direction === "up" ? "+" : ""}{rate.changePct.toFixed(2)}%
          </Text>
        </View>
      )}
    </View>
  </View>
));

// ─── Main Component ───────────────────────────────────────────────────────────
const PgHomeScreen = ({ navigation }) => {
  const userId      = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const dispatch    = useDispatch();

  const [categories,           setCategories]           = useState([]);
  const [products,             setProducts]             = useState([]);
  const [loading,              setLoading]              = useState({ categories: false, products: false });
  const [viewMode,             setViewMode]             = useState("categories");
  const [activeCategory,       setActiveCategory]       = useState(null);
  const [activeCategoryName,   setActiveCategoryName]   = useState("");
  const [showAllProducts,      setShowAllProducts]      = useState(false);

  // ── Image maps — keyed by id → url ────────────────────────────────────────
  const [categoryImages,    setCategoryImages]    = useState({});

  // We track which IDs are currently being fetched so we don't double-fetch
  const fetchingRef   = useRef(new Set());
  const variantCache  = useRef({});

  // Search
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [searchResults,  setSearchResults]  = useState({ categories: [], products: [] });
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [allProductsCache, setAllProductsCache] = useState([]);
  const searchInputRef  = useRef(null);
  const searchBarAnim   = useRef(new Animated.Value(0)).current;

  // Wishlist
  const [wishlistMap,     setWishlistMap]     = useState({});
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [wishlistToast,   setWishlistToast]   = useState({ visible: false, text: "", added: true });
  const toastTimeoutRef = useRef(null);

  // Live gold / silver rates
  const [goldRate,     setGoldRate]     = useState({ price: null, changePct: null, direction: null });
  const [gold22kRate,  setGold22kRate]  = useState({ price: null, changePct: null, direction: null });
  const [silverRate,   setSilverRate]   = useState({ price: null, changePct: null, direction: null });

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

  // ── Live gold / silver rates — direction is vs. the last rate we saw ───────
  useEffect(() => {
    let alive = true;

    const SETTERS = { gold: setGoldRate, gold22k: setGold22kRate, silver: setSilverRate };

    const applyRate = async (kind, price) => {
      if (!price) return;
      const storageKey = `pg_last_${kind}_rate`;
      const prevRaw = await AsyncStorage.getItem(storageKey).catch(() => null);
      const prev = prevRaw ? Number(prevRaw) : null;
      if (!alive) return;

      let direction = null;
      let changePct = null;
      if (prev && prev > 0 && prev !== price) {
        direction = price > prev ? "up" : "down";
        changePct = ((price - prev) / prev) * 100;
      }

      SETTERS[kind]({ price, changePct, direction });
      await AsyncStorage.setItem(storageKey, String(price)).catch(() => {});
    };

    const loadRates = async () => {
      const rates = await getOxygoldRates();
      if (!alive || !rates) return;
      applyRate("gold", rates.gold24k);
      applyRate("gold22k", rates.gold22k);
      applyRate("silver", rates.silverPerGram);
    };

    loadRates();
    const t = setInterval(loadRates, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

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

  // Some categories have products tagged directly on them; others only have
  // products tagged on their (hidden) sub-categories. Try the category itself
  // first, and if that comes back empty, silently pull products from every
  // sub-category underneath it and merge — the user never sees a sub-category screen.
  const fetchProductsData = async (categoryId) => {
    const t0 = Date.now();
    try {
      setLoading((p) => ({ ...p, products: true }));
      setProducts([]);

      const data  = await getProducts(categoryId);
      let items = data?.items || data || [];

      if (!items.length) {
        const subs = await getSubCategories(categoryId).catch(() => []);
        if (subs?.length) {
          const results = await Promise.allSettled(subs.map((s) => getProducts(s.id)));
          const merged = [];
          const seen = new Set();
          results.forEach((r) => {
            if (r.status !== "fulfilled") return;
            const subItems = r.value?.items || r.value || [];
            subItems.forEach((p) => {
              if (p?.id && !seen.has(p.id)) { seen.add(p.id); merged.push(p); }
            });
          });
          items = merged;
        }
      }

      setAllProductsCache((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...items.filter((p) => !ids.has(p.id))];
      });

      setProducts(items);
    } catch (_) {}
    finally {
      setTimeout(() => setLoading((p) => ({ ...p, products: false })), Math.max(0, 800 - (Date.now() - t0)));
    }
  };

  // ── Navigation helpers ─────────────────────────────────────────────────────
  // Categories jump straight to Products now — the Sub-Categories screen is skipped.
  const handleCategoryPress = (cat) => {
    setActiveCategory(cat.id);
    setActiveCategoryName(cat.name || "");
    setViewMode("products");
    setShowAllProducts(false);
    fetchProductsData(cat.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBackToCategories = () => {
    setViewMode("categories");
    setActiveCategory(null);
    setActiveCategoryName("");
    setProducts([]);
    setShowAllProducts(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Hardware back ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSearchActive) { clearSearch(); return true; }
      if (viewMode === "products") { handleBackToCategories(); return true; }
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

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setIsSearchActive(false);
      setSearchResults({ categories: [], products: [] });
      return;
    }
    setIsSearchActive(true);
    const q = text.trim().toLowerCase();
    setSearchResults({
      categories: categories.filter((c) => c?.name?.toLowerCase().includes(q)),
      products:   allProductsCache.filter(
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
    setSearchResults({ categories: [], products: [] });
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
    const { categories: rCats, products: rProds } = searchResults;
    if (!rCats.length && !rProds.length) {
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
        {rProds.length > 0 && (
          <View style={{ marginTop: rCats.length ? 12 : 0 }}>
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
          <LazyImage uri={imageUrl} style={styles.categoryCardImg} resizeMode="contain" fallbackText={item.name} />
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
                <View style={styles.categoryCardShimmerImg}>
                  <ShimmerBox width="100%" height="100%" borderRadius={0} />
                </View>
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
            <View style={visibleProducts.length === 1 ? styles.gridItemFull : styles.gridItem}>
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
            onPress={handleBackToCategories}
            activeOpacity={0.78}
          >
            <View style={styles.moreCategoriesIconWrap}>
              <Ionicons name="grid-outline" size={18} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.moreCategoriesTitle}>That's everything here</Text>
              <Text style={styles.moreCategoriesSub}>Browse other categories</Text>
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
                    <TouchableOpacity
                      style={styles.bannerSlide}
                      activeOpacity={0.92}
                      onPress={() => scrollViewRef.current?.scrollTo({ y: 400, animated: true })}
                    >
                      <Image
                        source={require("../../../assets/banner.png")}
                        style={styles.bannerImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>

                    {/* Slide 2 — Digital Gold */}
                    <TouchableOpacity
                      style={styles.bannerSlide}
                      activeOpacity={0.92}
                      onPress={() => navigation.navigate("HowItWorks")}
                    >
                      <Image
                        source={require("../../../assets/digitalgold banner new.png")}
                        style={styles.bannerImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
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

                {/* Live Gold / Silver Rates */}
                {(goldRate.price || gold22kRate.price || silverRate.price) && (
                  <TouchableOpacity
                    style={styles.ratesCard}
                    onPress={() => navigation.navigate("Dashboard")}
                    activeOpacity={0.85}
                  >
                    <View style={styles.ratesRow}>
                      <RateColumn
                        icon={require("../../../assets/Goldrateicon.png")}
                        label="Gold 24K"
                        rate={goldRate}
                        decimals={0}
                      />
                      <View style={styles.rateDivider} />
                      <RateColumn
                        icon={require("../../../assets/Goldrateicon.png")}
                        label="Gold 22K"
                        rate={gold22kRate}
                        decimals={0}
                      />
                      <View style={styles.rateDivider} />
                      <RateColumn
                        icon={require("../../../assets/silverrate.png")}
                        label="Silver"
                        rate={silverRate}
                        decimals={2}
                      />
                    </View>

                    <View style={styles.ratesLinkRow}>
                      <TouchableOpacity
                        style={styles.ratesLinkBtn}
                        onPress={() => navigation.navigate("PgAllRates")}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={styles.ratesLinkText}>Compare all gold rates</Text>
                        <Ionicons name="chevron-forward" size={13} color={C.gold} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )}

                <SectionHeader title="Categories" count={categories.length || null} />
                {renderCategoriesGrid()}

                {/* Why Shop With Us */}
                <View style={styles.whyShopSection}>
                  <Text style={styles.whyShopTitle}>Why Shop With Us?</Text>
                  <View style={styles.whyShopRow}>
                    {WHY_SHOP.map((w, i) => (
                      <View key={i} style={styles.whyShopCell}>
                        <View style={styles.whyShopCard}>
                          <View style={styles.whyShopIconWrap}>
                            <Image source={w.image} style={styles.whyShopIconImg} resizeMode="cover" />
                          </View>
                          <Text style={styles.whyShopItemTitle}>{w.title}</Text>
                          <Text style={styles.whyShopItemSub}>{w.subtitle}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

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

            {/* ── PRODUCTS VIEW ── */}
            {viewMode === "products" && (
              <FadeSlideIn key="products">
                <View style={styles.breadcrumb}>
                  <TouchableOpacity onPress={handleBackToCategories} activeOpacity={0.7}>
                    <Text style={styles.breadcrumbLink}>Categories</Text>
                  </TouchableOpacity>
                  <Text style={styles.breadcrumbSep}>›</Text>
                  <Text style={styles.breadcrumbCurrent}>{activeCategoryName}</Text>
                </View>
                <SectionHeader
                  title={activeCategoryName || "Products"}
                  count={!loading.products && totalProducts > 0 ? totalProducts : null}
                  showBack
                  onBack={handleBackToCategories}
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
  searchEmptyState:    { alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 },
  searchEmptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#E7E0DA", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  searchEmptyTitle:    { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 6 },
  searchEmptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },

  bannerCarouselWrap: { marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: "hidden" },

  // ── Live gold / silver rates ──
  ratesCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.bgCard, borderRadius: 14,
    padding: 14,
    shadowColor: C.shadowDark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2,
  },
  ratesRow: { flexDirection: "row", alignItems: "center" },
  rateBlock: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  rateDivider: { width: 1, alignSelf: "stretch", backgroundColor: C.border, marginHorizontal: 8 },
  rateIconImg: { width: 30, height: 30 },
  rateLabel: { fontSize: 10, fontWeight: "600", color: C.textSecondary, marginBottom: 2 },
  rateValue: { fontSize: 12.5, fontWeight: "700", color: C.textPrimary },
  rateUnit: { fontSize: 9, fontWeight: "500", color: C.textSecondary },
  rateChangeRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  rateChangeText: { fontSize: 10.5, fontWeight: "700" },
  ratesLinkRow: { borderTopWidth: 1, borderTopColor: C.divider, marginTop: 12, paddingTop: 10 },
  ratesLinkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  ratesLinkText: { fontSize: 12.5, fontWeight: "600", color: C.gold },
  bannerSlide: {
    width: BANNER_WIDTH,
    height: BANNER_WIDTH * (929 / 1693),
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  indicatorRow:    { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingTop: 10, paddingBottom: 4, backgroundColor: "#F8F7F6" },
  indicator:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(207,139,23,0.22)" },
  indicatorActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: C.goldBright },

  // ── Why Shop With Us ──
  whyShopSection: { paddingHorizontal: 12, marginBottom: 6 },
  whyShopTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, marginHorizontal: 4, marginBottom: 12 },
  whyShopRow: { flexDirection: "row", flexWrap: "wrap" },
  whyShopCell: { width: "50%", padding: 6 },
  whyShopCard: {
    alignItems: "center",
    backgroundColor: C.bgCard, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 10,
    shadowColor: C.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 2,
  },
  whyShopIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    overflow: "hidden",
    backgroundColor: C.goldMuted,
    marginBottom: 10,
  },
  whyShopIconImg: { width: "100%", height: "100%" },
  whyShopItemTitle: { fontSize: 13, fontWeight: "700", color: C.textPrimary, textAlign: "center", marginBottom: 4 },
  whyShopItemSub: { fontSize: 11, fontWeight: "500", color: C.textSecondary, textAlign: "center", lineHeight: 15 },

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
  categoryCardImgWrap:{ width: "100%", aspectRatio: 1, backgroundColor: C.shimmer },
  categoryCardShimmerImg: { width: "100%", aspectRatio: 1 },
  categoryCardImg:    { width: "100%", height: "100%" },
  categoryCardLabel:  { fontSize: 13, fontWeight: "500", color: C.textPrimary, textAlign: "center", lineHeight: 17, paddingVertical: 12, paddingHorizontal: 8 },

  grid:     { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, marginBottom: 12 },
  gridRow:  { justifyContent: "flex-start" },
  gridItem: { width: "50%", padding: 6 },
  gridItemFull: { width: "100%", padding: 6 },

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

  toast:        { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, zIndex: 99, elevation: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12 },
  toastAdded:   { backgroundColor: "#1F8A4C" },
  toastRemoved: { backgroundColor: "#8B3A34" },
  toastText:    { fontSize: 13, fontWeight: "700", color: "#fff" },
});

export default PgHomeScreen;