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
  BackHandler,
  RefreshControl,
  Linking,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { selectUserId, selectAccessToken } from "../../store/authSlice";
import {
  incrementWishlistCount,
  decrementWishlistCount,
  setCartCount,
} from "../../store/cartSlice";
import ProductCard from "../components/ProductCard";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
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
  getUserAddresses,
  addToCart,
  getCart,
} from "./physicalGoldApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { performanceMonitor } from "../../utils/performanceMonitor";
import { keyExtractor } from "../../utils/flatListOptimizations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;

// ─── Design Tokens — Physical Gold palette (matches oxygold web app) ──
const C = {
  bg: "#F8F7F6",
  bgCard: "#FFFFFF",
  bgElevated: "#FFFFFF",
  bgGlass: "rgba(255,255,255,0.92)",
  gold: "#0E6B57",
  goldBright: "#14876D",
  goldSoft: "#0E6B57",
  goldMuted: "rgba(14,107,87,0.10)",
  goldBorder: "rgba(14,107,87,0.20)",
  goldText: "#0E6B57",
  white: "#FFFFFF",
  textPrimary: "#1C1C1E",
  textSecondary: "#7A7A80",
  textMuted: "#A79C93",
  green: "#2ECC71",
  greenBg: "rgba(46,204,113,0.08)",
  red: "#C85A54",
  border: "#E7E0DA",
  borderStrong: "#D8CFC3",
  divider: "#EEEBE8",
  shadowGold: "rgba(14,107,87,0.15)",
  shadowDark: "rgba(34,30,28,0.10)",
  shimmer: "#F8F7F6",
};

// Footer — plain white, matches product cards & bottom nav bar.
const FOOTER_BG = "#FFFFFF";

const WHY_SHOP = [
  {
    image: require("../../../assets/Bishallmark.png"),
    title: "BIS Hallmarked",
    subtitle: "Certified purity you can trust always.",
  },
  {
    image: require("../../../assets/securedelivery.png"),
    title: "Secure Delivery",
    subtitle: "Fully insured & safe delivery.",
  },
  {
    image: require("../../../assets/securepaymntes.png"),
    title: "Secure Payments",
    subtitle: "100% safe & encrypted transactions.",
  },
  {
    image: require("../../../assets/Contact Support.png"),
    title: "Dedicated Support",
    subtitle: "We're here to help you, anytime.",
  },
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
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.2],
  });
  return (
    <View style={[{ width, height }, style]}>
      <Animated.View
        style={{ flex: 1, borderRadius, backgroundColor: C.goldText, opacity }}
      />
    </View>
  );
});

// ─── Lazy Image — shows shimmer until loaded, then fades in ───────────────────
const LazyImage = memo(
  ({ uri, style, resizeMode = "cover", fallbackText = "G" }) => {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);
    const fade = useRef(new Animated.Value(0)).current;

    const src = !uri || errored ? placeholder(fallbackText) : uri;

    const onLoad = useCallback(() => {
      setLoaded(true);
      Animated.timing(fade, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }, [fade]);

    const onError = useCallback(() => {
      setErrored(true);
      setLoaded(true);
      Animated.timing(fade, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }, [fade]);

    return (
      <View style={[style, { overflow: "hidden", backgroundColor: C.shimmer }]}>
        {!loaded && (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: C.shimmer }]}
          />
        )}
        <Animated.Image
          source={{ uri: src, cache: "force-cache" }}
          style={[style, { opacity: fade }]}
          resizeMode={resizeMode}
          onLoad={onLoad}
          onError={onError}
          fadeDuration={0}
        />
      </View>
    );
  },
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = memo(({ title, count, onViewAll, onBack, showBack }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      {showBack && (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
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
      <TouchableOpacity
        onPress={onViewAll}
        style={styles.viewAllBtn}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.viewAllText}>View All</Text>
        <Ionicons name="chevron-forward" size={14} color={C.gold} />
      </TouchableOpacity>
    )}
  </View>
));

// "2 mins ago" / "3 hrs ago" style relative time, for the last real price move.
const formatTimeAgo = (ts) => {
  if (!ts) return "";
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
};

// ─── Rate column — one karat/metal cell inside the live-rates card ────────────
const RateColumn = memo(({ icon, label, rate, decimals }) => {
  // Re-render every 30s purely so "X mins ago" keeps advancing even when no
  // new price has come in — otherwise it'd freeze at whatever it read on
  // the render that set it.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Flash the block green/red for a moment whenever the price actually
  // changes between polls, instead of only relying on the static up/down
  // badge — that badge doesn't draw the eye to a value that just moved.
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevPriceRef = useRef(rate.price);
  const [flashDir, setFlashDir] = useState(null); // 'up' | 'down' | null

  useEffect(() => {
    const prev = prevPriceRef.current;
    if (prev != null && rate.price != null && rate.price !== prev) {
      const dir = rate.price > prev ? "up" : "down";
      setFlashDir(dir);
      flashAnim.setValue(1);
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: false,
      }).start(() => setFlashDir(null));
    }
    prevPriceRef.current = rate.price;
  }, [rate.price]);

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(0,0,0,0)",
      flashDir === "down" ? "rgba(200,90,84,0.20)" : "rgba(46,204,113,0.20)",
    ],
  });

  return (
    <Animated.View style={[styles.rateBlock, { backgroundColor: flashBg }]}>
      <Image source={icon} style={styles.rateIconImg} resizeMode="contain" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rateLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rateValue} numberOfLines={1}>
          ₹
          {Number(rate.price || 0).toLocaleString("en-IN", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}
          <Text style={styles.rateUnit}> /gm</Text>
        </Text>
        {rate.direction && (
          <View style={styles.rateChangeRow}>
            <Ionicons
              name={rate.direction === "up" ? "trending-up" : "trending-down"}
              size={11}
              color={rate.direction === "up" ? C.green : C.red}
            />
            <Text
              style={[
                styles.rateChangeText,
                { color: rate.direction === "up" ? C.green : C.red },
              ]}
            >
              {rate.direction === "up" ? "+" : ""}
              {rate.changePct.toFixed(2)}%
            </Text>
          </View>
        )}
        {rate.changeAmount != null && rate.changedAt != null && (
          <Text style={styles.rateChangeMeta} numberOfLines={1}>
            {rate.direction === "up" ? "+" : "-"}₹
            {rate.changeAmount.toLocaleString("en-IN")} · {formatTimeAgo(rate.changedAt)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────
const PgHomeScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const dispatch = useDispatch();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    categories: false,
    products: false,
  });
  const [viewMode, setViewMode] = useState("categories");
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeCategoryName, setActiveCategoryName] = useState("");
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Cross-sell — viewing Gold shows an "Explore Silver" strip below the
  // results, and vice versa. Same idea both directions, on purpose.
  const [crossSellCategory, setCrossSellCategory] = useState(null);
  const [crossSellProducts, setCrossSellProducts] = useState([]);
  const [crossSellLoading, setCrossSellLoading] = useState(false);

  // ── Image maps — keyed by id → url ────────────────────────────────────────
  const [categoryImages, setCategoryImages] = useState({});

  // We track which IDs are currently being fetched so we don't double-fetch
  const fetchingRef = useRef(new Set());
  const variantCache = useRef({});

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState({
    categories: [],
    products: [],
  });
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [allProductsCache, setAllProductsCache] = useState([]);
  const searchInputRef = useRef(null);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  // Wishlist
  const [wishlistMap, setWishlistMap] = useState({});
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [wishlistToast, setWishlistToast] = useState({
    visible: false,
    text: "",
    added: true,
  });
  const toastTimeoutRef = useRef(null);

  // Cart — which variants are already in the cart, for the product cards'
  // Add to Cart / In Cart button state
  const [cartVariantIds, setCartVariantIds] = useState(new Set());
  const [cartLoadingId, setCartLoadingId] = useState(null);

  // Live gold / silver rates
  const [goldRate, setGoldRate] = useState({
    price: null,
    changePct: null,
    direction: null,
    changeAmount: null,
    changedAt: null,
  });
  const [gold22kRate, setGold22kRate] = useState({
    price: null,
    changePct: null,
    direction: null,
    changeAmount: null,
    changedAt: null,
  });
  const [silverRate, setSilverRate] = useState({
    price: null,
    changePct: null,
    direction: null,
    changeAmount: null,
    changedAt: null,
  });

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Delivery location — shown up top like Amazon/Swiggy, reuses whichever
  // saved address the Cart/Checkout screens treat as the default (first one
  // with lat/long, else the first saved address) so it always agrees with
  // what delivery fees are actually computed against.
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(true);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((text, added) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setWishlistToast({ visible: true, text, added });
    toastTimeoutRef.current = setTimeout(
      () => setWishlistToast({ visible: false, text: "", added: true }),
      2500,
    );
  }, []);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    // If no userId, navigate to login immediately
    if (!userId) {
      console.log("[PgHomeScreen] No userId found, navigating to login");
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      return;
    }

    performanceMonitor.startMeasure("PgHomeScreen");
    fetchCategories();
  }, [userId]);

  // ── Live gold / silver rates — direction is vs. the last rate we saw ───────
  // loadRates is exposed via ref so pull-to-refresh can trigger the same fetch
  // the background 60s interval uses, without duplicating the direction logic.
  const loadRatesRef = useRef(async () => {});

  useEffect(() => {
    let alive = true;

    const SETTERS = {
      gold: setGoldRate,
      gold22k: setGold22kRate,
      silver: setSilverRate,
    };

    const applyRate = async (kind, price) => {
      if (!price) return;
      // One JSON blob per metal — holds the last known price AND the last
      // *actual* change event (amount/direction/when), so that when a poll
      // brings back the same price again, we keep showing how much it last
      // moved and how long ago, instead of the badge just disappearing.
      const storageKey = `pg_rate_${kind}`;
      const storedRaw = await AsyncStorage.getItem(storageKey).catch(() => null);
      const stored = storedRaw ? JSON.parse(storedRaw) : null;
      if (!alive) return;

      let direction = stored?.direction ?? null;
      let changePct = stored?.changePct ?? null;
      let changeAmount = stored?.changeAmount ?? null;
      let changedAt = stored?.changedAt ?? null;

      if (stored?.price && stored.price > 0 && stored.price !== price) {
        direction = price > stored.price ? "up" : "down";
        changePct = ((price - stored.price) / stored.price) * 100;
        changeAmount = Math.abs(price - stored.price);
        changedAt = Date.now();
      }

      SETTERS[kind]({ price, changePct, direction, changeAmount, changedAt });
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ price, changePct, direction, changeAmount, changedAt }),
      ).catch(() => {});
    };

    const loadRates = async () => {
      const rates = await getOxygoldRates();
      if (!alive || !rates) return;
      applyRate("gold", rates.gold24k);
      applyRate("gold22k", rates.gold22k);
      applyRate("silver", rates.silverPerGram);
    };

    loadRatesRef.current = loadRates;
    loadRates();
    const t = setInterval(loadRates, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Check if user is logged in on every focus
      if (!userId) {
        console.log("[PgHomeScreen] No userId on focus, navigating to login");
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
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

      getUserAddresses(userId)
        .then((list) => {
          const addresses = Array.isArray(list) ? list : [];
          const preferred =
            addresses.find((a) => a.latitude && a.longitude) ||
            addresses[0] ||
            null;
          setDeliveryAddress(preferred);
        })
        .catch(() => setDeliveryAddress(null))
        .finally(() => setAddressLoading(false));

      getCart(userId)
        .then((cartData) => {
          const ids = (cartData?.itemsInCart || []).map((it) =>
            String(it.productVariantId),
          );
          setCartVariantIds(new Set(ids));
        })
        .catch(() => {});
    }, [userId, navigation]),
  );

  // ── Add to Cart from a product card — always adds that card's resolved
  // default variant; if already in cart, jumps straight to Cart instead. ──
  const handleCardAddToCart = useCallback(
    async (product, variant) => {
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
        console.log("[PgHomeScreen] Add to cart failed:", e?.message);
      } finally {
        setCartLoadingId(null);
      }
    },
    [userId, cartVariantIds, dispatch, navigation],
  );

  // ── Fetch categories ──────────────────────────────────────────────────────
  const fetchCategories = async () => {
    if (!userId || !accessToken) return;
    const t0 = Date.now();
    try {
      setLoading((p) => ({ ...p, categories: true }));
      const data = await getMainCategories(userId);
      setCategories(data || []);
      performanceMonitor.endMeasure("PgHomeScreen");
    } catch (_) {
    } finally {
      setTimeout(
        () => setLoading((p) => ({ ...p, categories: false })),
        Math.max(0, 800 - (Date.now() - t0)),
      );
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

      const data = await getProducts(categoryId);
      let items = data?.items || data || [];

      if (!items.length) {
        const subs = await getSubCategories(categoryId).catch(() => []);
        if (subs?.length) {
          const results = await Promise.allSettled(
            subs.map((s) => getProducts(s.id)),
          );
          const merged = [];
          const seen = new Set();
          results.forEach((r) => {
            if (r.status !== "fulfilled") return;
            const subItems = r.value?.items || r.value || [];
            subItems.forEach((p) => {
              if (p?.id && !seen.has(p.id)) {
                seen.add(p.id);
                merged.push(p);
              }
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
    } catch (_) {
    } finally {
      setTimeout(
        () => setLoading((p) => ({ ...p, products: false })),
        Math.max(0, 800 - (Date.now() - t0)),
      );
    }
  };

  // ── Pull-to-refresh — reloads live rates plus whatever the current view shows ──
  const handlePullRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadRatesRef.current(),
        viewMode === "products" && activeCategory
          ? fetchProductsData(activeCategory)
          : fetchCategories(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Navigation helpers ─────────────────────────────────────────────────────
  // Categories jump straight to Products now — the Sub-Categories screen is skipped.
  const detectMetal = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes("gold")) return "gold";
    if (n.includes("silver")) return "silver";
    return null;
  };

  // Fetches a category's products, falling back to its subcategories'
  // products when it has none directly (same rule fetchProductsData uses).
  const fetchProductsForCategory = async (categoryId) => {
    const data = await getProducts(categoryId);
    let items = data?.items || data || [];
    if (!items.length) {
      const subs = await getSubCategories(categoryId).catch(() => []);
      if (subs?.length) {
        const results = await Promise.allSettled(
          subs.map((s) => getProducts(s.id)),
        );
        const merged = [];
        const seen = new Set();
        results.forEach((r) => {
          if (r.status !== "fulfilled") return;
          const subItems = r.value?.items || r.value || [];
          subItems.forEach((p) => {
            if (p?.id && !seen.has(p.id)) {
              seen.add(p.id);
              merged.push(p);
            }
          });
        });
        items = merged;
      }
    }
    return items;
  };

  const loadCrossSell = async (currentCat) => {
    const metal = detectMetal(currentCat?.name);
    const otherMetal = metal === "gold" ? "silver" : metal === "silver" ? "gold" : null;

    // A catalog can have more than one category whose name mentions the
    // metal (e.g. "Silver" and "Silver Coins") — picking just the first
    // match risks landing on one with zero products while a later match
    // has real stock. Try every metal-name match first, in order.
    const metalCandidates = otherMetal
      ? categories.filter((c) => c.id !== currentCat.id && detectMetal(c.name) === otherMetal)
      : [];

    // Fallback — the category names may not literally say "gold"/"silver"
    // at all, so if metal-matching finds nothing, fall back to any other
    // category with stock (Amazon/Flipkart-style "you might also like",
    // not strictly a same/other-metal pairing).
    const fallbackCandidates = categories.filter(
      (c) => c.id !== currentCat.id && !metalCandidates.some((m) => m.id === c.id),
    );

    const candidates = [...metalCandidates, ...fallbackCandidates];
    if (!candidates.length) {
      setCrossSellCategory(null);
      setCrossSellProducts([]);
      return;
    }

    setCrossSellLoading(true);
    try {
      for (const cat of candidates) {
        const items = await fetchProductsForCategory(cat.id).catch(() => []);
        if (items.length) {
          setCrossSellCategory(cat);
          setCrossSellProducts(items.slice(0, 6));
          return;
        }
      }
      // Nothing in the whole catalog had stock besides the current category.
      setCrossSellCategory(null);
      setCrossSellProducts([]);
    } finally {
      setCrossSellLoading(false);
    }
  };

  const handleCategoryPress = (cat) => {
    setActiveCategory(cat.id);
    setActiveCategoryName(cat.name || "");
    setViewMode("products");
    setShowAllProducts(false);
    fetchProductsData(cat.id);
    loadCrossSell(cat);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBackToCategories = () => {
    setViewMode("categories");
    setActiveCategory(null);
    setActiveCategoryName("");
    setProducts([]);
    setShowAllProducts(false);
    setCrossSellCategory(null);
    setCrossSellProducts([]);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Hardware back ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSearchActive) {
        clearSearch();
        return true;
      }
      if (viewMode === "products") {
        handleBackToCategories();
        return true;
      }
      return false;
    });
    return () => h.remove();
  }, [viewMode, isSearchActive]);

  // ── Animations — a single, subtle entrance fade/slide (no looping motion) ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 420,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      const id = String(item.id);
      const url = extractDirectImageUrl(item);

      if (url) {
        IMAGE_CACHE[id] = url;
        immediate[id] = url;
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
        .finally(() => fetchingRef.current.delete(String(item.id))),
    );

    // Batch all resolved URLs into a single setState
    Promise.allSettled(promises).then((results) => {
      const batch = {};
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
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

  const heroTranslate = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  // ── Search ─────────────────────────────────────────────────────────────────
  // The text itself updates immediately (so typing feels responsive), but
  // the actual filtering — two .filter() passes over allProductsCache, which
  // only grows as more categories get browsed in a session — is debounced so
  // it doesn't run synchronously on every single keystroke.
  const searchDebounceRef = useRef(null);

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!text.trim()) {
      setIsSearchActive(false);
      setSearchResults({ categories: [], products: [] });
      return;
    }
    setIsSearchActive(true);
    searchDebounceRef.current = setTimeout(() => {
      const q = text.trim().toLowerCase();
      setSearchResults({
        categories: categories.filter((c) => c?.name?.toLowerCase().includes(q)),
        products: allProductsCache.filter(
          (p) =>
            p?.name?.toLowerCase().includes(q) ||
            p?.description?.toLowerCase().includes(q),
        ),
      });
    }, 220);
  };

  const handleSearchFocus = () => {
    setSearchFocused(true);
    Animated.timing(searchBarAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.timing(searchBarAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearchActive(false);
    setSearchResults({ categories: [], products: [] });
    searchInputRef.current?.blur();
  };

  const searchBorderColor = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.goldBright],
  });

  // ── Wishlist ───────────────────────────────────────────────────────────────
  const handleWishlistToggle = useCallback(
    async (item) => {
      const pid = String(item?.id);
      if (wishlistLoading[pid]) return;
      setWishlistLoading((p) => ({ ...p, [pid]: true }));
      try {
        if (wishlistMap[pid]) {
          await removeFromWishlist(wishlistMap[pid]);
          setWishlistMap((p) => {
            const n = { ...p };
            delete n[pid];
            return n;
          });
          dispatch(decrementWishlistCount());
          showToast("Removed from wishlist", false);
        } else {
          let v = variantCache.current[pid];
          if (!v) {
            const r = await getProductVariants(item.id);
            const inner = r?.data || r;
            const list =
              inner?.listVariantResponse ||
              inner?.variants ||
              (Array.isArray(inner) ? inner : []);
            v = list[0];
            if (v) variantCache.current[pid] = v;
          }
          if (!v?.id) {
            showToast("No variant found for this product", false);
            return;
          }
          const res = await addToWishlist(userId, item.id, v.id);
          setWishlistMap((p) => ({
            ...p,
            [pid]: res?.id || res?.wishlistId || pid,
          }));
          dispatch(incrementWishlistCount());
          showToast("Added to wishlist", true);
        }
      } catch (e) {
        showToast(e?.message || "Wishlist update failed", false);
      }
      setWishlistLoading((p) => ({ ...p, [pid]: false }));
    },
    [wishlistMap, wishlistLoading, userId, dispatch, showToast],
  );

  // Stable reference so every ProductCard in a list gets the same function
  // instead of a fresh closure per item per render (which defeats its
  // React.memo — see the note in ProductCard.js).
  const handleProductPress = useCallback(
    (item) =>
      navigation.navigate("PgProductDetails", {
        productId: item?.id,
        product: item,
      }),
    [navigation],
  );

  const visibleProducts = showAllProducts ? products : products.slice(0, 6);
  const totalProducts = products.length;
  const hasMore = totalProducts > 6 && !showAllProducts;

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
          <Text style={styles.searchEmptyTitle}>
            No results for "{searchQuery}"
          </Text>
          <Text style={styles.searchEmptySubtitle}>
            Try searching by product name or category
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.searchResultsWrap}>
        {rCats.length > 0 && (
          <View>
            <Text style={styles.searchGroupLabel}>Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.searchCatScroll}
            >
              {rCats.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.searchCatItem}
                  onPress={() => {
                    clearSearch();
                    handleCategoryPress(cat);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.searchCatImgWrap}>
                    <LazyImage
                      uri={categoryImages[cat.id]}
                      style={styles.searchCatImg}
                      fallbackText={cat.name}
                    />
                  </View>
                  <Text style={styles.searchCatLabel} numberOfLines={2}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {rProds.length > 0 && (
          <View style={{ marginTop: rCats.length ? 12 : 0 }}>
            <Text style={styles.searchGroupLabel}>
              Products ({rProds.length})
            </Text>
            <View style={styles.grid}>
              {rProds.slice(0, 6).map((item) => (
                <View key={item?.id} style={styles.gridItem}>
                  <ProductCard
                    product={item}
                    isInWishlist={!!wishlistMap[String(item?.id)]}
                    onWishlistToggle={handleWishlistToggle}
                    onAddToCart={handleCardAddToCart}
                    addingCart={cartLoadingId === String(item?.id)}
                    cartVariantIds={cartVariantIds}
                    onPress={handleProductPress}
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
  const CategoryCard = useCallback(
    ({ item, imageUrl, onPress }) => (
      <TouchableOpacity
        style={styles.categoryGridItem}
        onPress={() => onPress(item)}
        activeOpacity={0.75}
      >
        <View style={styles.categoryCard}>
          <View style={styles.categoryCardImgWrap}>
            <LazyImage
              uri={imageUrl}
              style={styles.categoryCardImg}
              resizeMode="contain"
              fallbackText={item.name}
            />
          </View>
          <Text style={styles.categoryCardLabel} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  const renderCategoriesGrid = () => {
    if (loading.categories) {
      return (
        <View style={styles.categoryGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.categoryGridItem}>
              <View style={styles.categoryCardShimmer}>
                <View style={styles.categoryCardShimmerImg}>
                  <ShimmerBox width="100%" height="100%" borderRadius={0} />
                </View>
                <View style={{ padding: 12 }}>
                  <ShimmerBox
                    width="70%"
                    height={12}
                    borderRadius={4}
                    style={{ alignSelf: "center" }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={styles.categoryGrid}>
        {categories
          .filter((c) => c?.id)
          .map((cat) => (
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
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.gridItem}>
              <View style={styles.productShimmerCard}>
                <ShimmerBox width="100%" height={160} borderRadius={0} />
                <View style={styles.productShimmerHeartWrap}>
                  <ShimmerBox width={28} height={28} borderRadius={14} />
                </View>
                <View style={styles.productShimmerBody}>
                  <ShimmerBox width="78%" height={11} borderRadius={4} />
                  <ShimmerBox
                    width="52%"
                    height={11}
                    borderRadius={4}
                    style={{ marginTop: 6 }}
                  />
                  <ShimmerBox
                    width="40%"
                    height={14}
                    borderRadius={4}
                    style={{ marginTop: 10 }}
                  />
                  <ShimmerBox
                    width="100%"
                    height={34}
                    borderRadius={10}
                    style={{ marginTop: 12 }}
                  />
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
        {/* Plain flex-wrap grid, not a nested FlatList — a VirtualizedList
            nested inside this screen's outer ScrollView can't actually
            window its rendering, so scrollEnabled={false} bought nothing
            but overhead; this matches the Categories grid below it. */}
        <View style={styles.grid}>
          {visibleProducts.map((item) => (
            <View
              key={keyExtractor(item)}
              style={
                visibleProducts.length === 1
                  ? styles.gridItemFull
                  : styles.gridItem
              }
            >
              <ProductCard
                product={item}
                isInWishlist={!!wishlistMap[String(item?.id)]}
                onWishlistToggle={handleWishlistToggle}
                onAddToCart={handleCardAddToCart}
                addingCart={cartLoadingId === String(item?.id)}
                cartVariantIds={cartVariantIds}
                onPress={handleProductPress}
              />
            </View>
          ))}
        </View>
        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => {
              setShowAllProducts(true);
              setTimeout(
                () =>
                  scrollViewRef.current?.scrollTo({ y: 600, animated: true }),
                80,
              );
            }}
            activeOpacity={0.78}
          >
            <Text style={styles.loadMoreText}>
              View All {totalProducts} Products
            </Text>
            <Text style={styles.loadMoreArrow}>›</Text>
          </TouchableOpacity>
        )}
        {showAllProducts && totalProducts > 6 && (
          <TouchableOpacity
            style={styles.collapseBtn}
            onPress={() => {
              setShowAllProducts(false);
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
            activeOpacity={0.78}
          >
            <Text style={styles.collapseBtnText}>Show Less ↑</Text>
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
        <PgLoader />
      </PgLayout>
    );
  }

  return (
    <PgLayout title="GoldMart" showBack={false}>
      {/* ── Delivery location + Search — pinned above the scroll, same cue
          shoppers already read on Amazon/Swiggy/Flipkart, now one combined
          bar instead of two separate sections. The location row reuses the
          address the delivery-fee calc treats as default so it's never out
          of sync with checkout. ── */}
      <View style={[styles.combinedTopBar, styles.goldFlatTint]}>
        <TouchableOpacity
          style={styles.locationBar}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("PgAddress")}
        >
          <Ionicons name="location" size={16} color={C.gold} />
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>Deliver to</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {addressLoading
                ? "Loading address..."
                : deliveryAddress
                  ? `${deliveryAddress.type || "Home"} · ${
                      [
                        deliveryAddress.flatNo,
                        deliveryAddress.address || deliveryAddress.area,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    }${
                      deliveryAddress.pincode || deliveryAddress.pinCode
                        ? ` - ${deliveryAddress.pincode || deliveryAddress.pinCode}`
                        : ""
                    }`
                  : "Add a delivery address"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={15} color={C.textMuted} />
        </TouchableOpacity>

        <Animated.View
          style={[styles.searchBarWrap, styles.searchBarWrapFixed]}
        >
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
            <TouchableOpacity
              onPress={clearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={17} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollFlex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={C.gold}
            colors={[C.gold]}
          />
        }
      >
        {isSearchActive ? (
          renderSearchResults()
        ) : (
          <>
            {/* ── CATEGORIES VIEW ── */}
            {viewMode === "categories" && (
              <FadeSlideIn key="categories">
                {/* Banner Carousel — same flat gold all the way through,
                    no fade to white at the bottom either. */}
                <View style={[styles.bannerSection, styles.goldFlatTint]}>
                  <Animated.View
                    style={[
                      styles.bannerCarouselWrap,
                      {
                        opacity: heroAnim,
                        transform: [{ translateY: heroTranslate }],
                      },
                    ]}
                  >
                    {/* Digital Gold banner hidden per request — just the one
                      Physical Gold banner now, no carousel/dots needed. */}
                    <TouchableOpacity
                      style={styles.bannerSlide}
                      activeOpacity={0.92}
                      onPress={() =>
                        scrollViewRef.current?.scrollTo({
                          y: 400,
                          animated: true,
                        })
                      }
                    >
                      <Image
                        source={require("../../../assets/banner.png")}
                        style={styles.bannerImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                {/* Live Gold / Silver Rates + Categories — one continuous
                    light-brown-to-white section, not two separate blocks
                    that each fade to white and restart the color. */}
                <LinearGradient
                  colors={["rgba(139,90,43,0.14)", "#FFFFFF"]}
                  style={styles.ratesAndCategoriesSection}
                >
                  {(goldRate.price || gold22kRate.price || silverRate.price) && (
                    <TouchableOpacity
                      style={styles.ratesCard}
                      onPress={() => navigation.navigate("PgAllRates")}
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
                          <Text style={styles.ratesLinkText}>
                            Compare all gold rates
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={13}
                            color={C.gold}
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  )}

                  <View style={styles.categoriesSpacer} />

                  <SectionHeader
                    title="Categories"
                    count={categories.length || null}
                  />
                  {renderCategoriesGrid()}
                </LinearGradient>

                {/* Why Shop With Us — flat green, same treatment as the
                    Delivery/Search/Banner gold block. */}
                <View style={[styles.whyShopSection, styles.greenFlatTint]}>
                  <Text style={styles.whyShopTitle}>Why Shop With Us?</Text>
                  <View style={styles.whyShopRow}>
                    {WHY_SHOP.map((w, i) => (
                      <View key={i} style={styles.whyShopCell}>
                        <View style={styles.whyShopCard}>
                          <View style={styles.whyShopIconWrap}>
                            <Image
                              source={w.image}
                              style={styles.whyShopIconImg}
                              resizeMode="cover"
                            />
                          </View>
                          <Text style={styles.whyShopItemTitle}>{w.title}</Text>
                          <Text style={styles.whyShopItemSub}>
                            {w.subtitle}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Digital Gold Banner — hidden per request; SHOW_DIGITAL_GOLD_BANNER flips it back on */}
                {SHOW_DIGITAL_GOLD_BANNER && (
                  <TouchableOpacity
                    style={styles.digitalBanner}
                    onPress={() => navigation.navigate("Dashboard")}
                    activeOpacity={0.7}
                  >
                    <View style={styles.digitalIconWrap}>
                      <Ionicons
                        name="trending-up-outline"
                        size={19}
                        color={C.light}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.digitalTitle}>Try Digital Gold</Text>
                      <Text style={styles.digitalSubtitle}>
                        Start from ₹100 · Buy, sell anytime
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={C.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </FadeSlideIn>
            )}

            {/* ── PRODUCTS VIEW ── */}
            {viewMode === "products" && (
              <FadeSlideIn key="products">
                <View style={styles.breadcrumb}>
                  <TouchableOpacity
                    style={styles.breadcrumbBackBtn}
                    onPress={handleBackToCategories}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-back" size={16} color={C.gold} />
                    <Text style={styles.breadcrumbLink}>Categories</Text>
                  </TouchableOpacity>
                  <Text style={styles.breadcrumbSep}>›</Text>
                  <Text style={styles.breadcrumbCurrent}>
                    {activeCategoryName}
                  </Text>
                </View>
                {!loading.products && totalProducts > 0 && (
                  <Text style={styles.searchGroupLabel}>
                    Products ({totalProducts})
                  </Text>
                )}
                {renderProductsGrid()}

                {/* ── Cross-sell — Gold results get an "Explore Silver" strip
                    below, and vice versa; falls back to "You Might Also
                    Like" when the categories aren't literally named by
                    metal, so this always has something to show. ── */}
                {!loading.products && !crossSellLoading && crossSellProducts.length > 0 && (
                  <View style={styles.crossSellSection}>
                    <View style={styles.crossSellHeader}>
                      <Text style={styles.crossSellTitle}>
                        {detectMetal(crossSellCategory?.name) === "gold"
                          ? "Explore Gold"
                          : detectMetal(crossSellCategory?.name) === "silver"
                          ? "Explore Silver"
                          : "You Might Also Like"}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleCategoryPress(crossSellCategory)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.crossSellViewAll}>View All</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.crossSellScroll}
                    >
                      {crossSellProducts.map((item) => (
                        <View key={keyExtractor(item)} style={styles.crossSellItem}>
                          <ProductCard
                            product={item}
                            isInWishlist={!!wishlistMap[String(item?.id)]}
                            onWishlistToggle={handleWishlistToggle}
                            onAddToCart={handleCardAddToCart}
                            addingCart={cartLoadingId === String(item?.id)}
                            cartVariantIds={cartVariantIds}
                            onPress={handleProductPress}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </FadeSlideIn>
            )}
          </>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerTopRow}>
            <Image
              source={require("../../../assets/logo-wordmark.png")}
              style={styles.footerLogoImg}
              resizeMode="contain"
            />
            <Text style={styles.footerTagline}>
              Your trusted destination for authentic 22K hallmarked gold
              jewellery. Crafted with precision, delivered with care.
            </Text>
          </View>

          <View style={styles.footerDivider} />

          {/* Contact Us */}
          <View style={styles.footerBlock}>
            <Text style={styles.footerHeading}>CONTACT US</Text>

            <View style={styles.footerContactRow}>
              <Ionicons name="location-outline" size={15} color="#CF8B17" style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>
                OXYIDEAS PARTNERS LLP, CC-03, Indu Fortune Fields, KPHB,
                Hyderabad, Telangana - 500085
              </Text>
            </View>

            <View style={styles.footerContactRow}>
              <Ionicons name="location-outline" size={15} color="#CF8B17" style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>
                AI Research Center, Entrance D, SE02 Concourse, Miyapur Metro
                Station, Hyderabad, Telangana 500049
              </Text>
            </View>

            <TouchableOpacity style={styles.footerContactRow} onPress={() => Linking.openURL("tel:+918143271103")}>
              <Ionicons name="call-outline" size={15} color="#CF8B17" style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>+91 81432 71103</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerContactRow} onPress={() => Linking.openURL("mailto:support@oxygold.ai")}>
              <Ionicons name="mail-outline" size={15} color="#CF8B17" style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>support@oxygold.ai</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerContactRow} onPress={() => navigation.navigate("PgSupport")}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color="#CF8B17" style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerDivider} />

          <Text style={styles.footerCopyright}>
            © 2026 OxyGold by OXYIDEAS PARTNERS LLP. All rights reserved.
          </Text>

          <View style={styles.footerLinksRow}>
            <TouchableOpacity onPress={() => navigation.navigate("PgPrivacyPolicy")} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerLinkDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate("PgTerms")} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={styles.footerLink}>Terms & Conditions</Text>
            </TouchableOpacity>
            <Text style={styles.footerLinkDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate("PgCookiePolicy")} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={styles.footerLink}>Cookie Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerLinkDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate("PgCancellationPolicy")} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={styles.footerLink}>Cancellation Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Toast */}
      {wishlistToast.visible && (
        <Animated.View
          style={[
            styles.toast,
            wishlistToast.added ? styles.toastAdded : styles.toastRemoved,
            { bottom: Platform.OS === "ios" ? 110 : 90 },
          ]}
        >
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
  scrollFlex: { flex: 1 },
  plainWhiteSection: { backgroundColor: "#FFFFFF" },
  // ── The 4-color palette used across Home — Plum (Delivery/Categories),
  // Lavender (Search/Gold Rates), Burgundy (Banner), Emerald (Why Shop). ──
  tintPlum: { backgroundColor: "rgba(106,44,110,0.12)" },
  tintLavender: { backgroundColor: "rgba(150,140,210,0.14)" },
  tintBurgundy: { backgroundColor: "rgba(140,47,59,0.12)" },
  tintEmerald: { backgroundColor: "rgba(14,107,87,0.10)" },
  scrollContent: { paddingBottom: 16, backgroundColor: "#F8F7F6" },

  combinedTopBar: {
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  // Flat, not faded to white — so the gold carries straight through into
  // the Banner section below it instead of hitting white and restarting.
  goldFlatTint: { backgroundColor: "rgba(207,139,23,0.08)" },
  greenFlatTint: { backgroundColor: "rgba(46,204,113,0.05)" },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  locationTextWrap: { flex: 1 },
  locationLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textMuted,
    letterSpacing: 0.2,
  },
  locationValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#48484C",
    marginTop: 1,
  },

  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: C.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(128,92,160,0.28)",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    gap: 10,
    shadowColor: "rgba(28,28,30,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchBarWrapFixed: { marginTop: 2, marginBottom: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: C.textPrimary,
    padding: 0,
  },
  searchClearBtn: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "700",
    paddingHorizontal: 4,
  },

  searchResultsWrap: { paddingBottom: 20 },
  searchGroupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  searchCatScroll: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  searchCatItem: { alignItems: "center", width: 72 },
  searchCatImgWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F7F4ED",
    borderWidth: 1.5,
    borderColor: C.goldBorder,
    overflow: "hidden",
    marginBottom: 6,
  },
  searchCatImg: { width: 56, height: 56, borderRadius: 28 },
  searchCatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 13,
  },
  searchEmptyState: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  searchEmptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#E7E0DA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  searchEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 6,
  },
  searchEmptySubtitle: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
  },

  bannerSection: { paddingTop: 8, paddingBottom: 10 },
  bannerCarouselWrap: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
  },

  // ── Live gold / silver rates ──
  ratesAndCategoriesSection: { paddingTop: 22, paddingBottom: 24 },
  categoriesSpacer: { height: 30 },
  ratesCard: {
    marginHorizontal: 16,
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 14,
    shadowColor: "rgba(28,28,30,0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  ratesRow: { flexDirection: "row", alignItems: "center" },
  rateBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    padding: 4,
    margin: -4,
  },
  rateDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  rateIconImg: { width: 30, height: 30 },
  rateLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSecondary,
    marginBottom: 2,
  },
  rateValue: { fontSize: 12.5, fontWeight: "700", color: C.textPrimary },
  rateUnit: { fontSize: 9, fontWeight: "500", color: C.textSecondary },
  rateChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  rateChangeText: { fontSize: 10.5, fontWeight: "700" },
  rateChangeMeta: { fontSize: 9, color: C.textMuted, marginTop: 1 },
  ratesLinkRow: {
    borderTopWidth: 1,
    borderTopColor: C.divider,
    marginTop: 12,
    paddingTop: 10,
  },
  ratesLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  ratesLinkText: { fontSize: 12.5, fontWeight: "600", color: C.textPrimary },
  bannerSlide: {
    width: BANNER_WIDTH,
    height: BANNER_WIDTH * (929 / 1693) * 0.82,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  // ── Why Shop With Us — LinearGradient handles the fade, no flat color here ──
  whyShopSection: {
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  whyShopTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    marginHorizontal: 4,
    marginBottom: 10,
  },
  whyShopRow: { flexDirection: "row", flexWrap: "wrap" },
  whyShopCell: { width: "50%", padding: 5 },
  whyShopCard: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  whyShopIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    backgroundColor: C.bgCard,
    marginBottom: 7,
  },
  whyShopIconImg: { width: "100%", height: "100%" },
  whyShopItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    marginBottom: 2,
  },
  whyShopItemSub: {
    fontSize: 10,
    fontWeight: "500",
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 13,
  },

  // ── Footer ──
  footer: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 34,
    paddingHorizontal: 24,
    backgroundColor: FOOTER_BG,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  footerLogoImg: {
    width: 140,
    height: 24,
    marginRight: 12,
  },
  footerTagline: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: C.textSecondary,
    textAlign: "left",
    lineHeight: 17,
  },
  footerDivider: {
    width: "100%",
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 20,
  },
  footerBlock: {
    width: "100%",
    alignItems: "flex-start",
  },
  footerHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#CF8B17",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  footerContactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  footerContactIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  footerContactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: C.textPrimary,
    lineHeight: 19,
  },
  footerLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 14,
  },
  footerLink: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textSecondary,
  },
  footerLinkDot: {
    fontSize: 11,
    color: C.textMuted,
    marginHorizontal: 7,
  },
  footerCopyright: {
    fontSize: 11,
    fontWeight: "500",
    color: C.textMuted,
    textAlign: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  countPill: {
    backgroundColor: "#F5F4F1",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countPillText: { fontSize: 11, fontWeight: "500", color: C.textSecondary },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
  },
  viewAllText: { fontSize: 13, fontWeight: "600", color: C.textPrimary },

  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },

  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 2,
    flexWrap: "wrap",
    gap: 2,
  },
  breadcrumbBackBtn: { flexDirection: "row", alignItems: "center", gap: 1 },
  breadcrumbLink: { fontSize: 13, color: C.gold, fontWeight: "700" },
  breadcrumbSep: { fontSize: 13, color: C.textMuted, marginHorizontal: 2 },
  breadcrumbCurrent: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "600",
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  categoryGridItem: { width: "50%", padding: 6 },
  categoryCard: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "rgba(28,28,30,0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  categoryCardShimmer: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    overflow: "hidden",
  },
  categoryCardImgWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: C.shimmer,
  },
  categoryCardShimmerImg: { width: "100%", aspectRatio: 1 },
  categoryCardImg: { width: "100%", height: "100%" },
  categoryCardLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textPrimary,
    textAlign: "center",
    lineHeight: 17,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  gridItem: { width: "50%", padding: 6 },
  gridItemFull: { width: "100%", padding: 6 },

  // ── Cross-sell strip — "Explore Gold"/"Explore Silver" below the results ──
  crossSellSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.divider },
  crossSellHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  crossSellTitle: { fontSize: 14.5, fontWeight: "700", color: C.textPrimary },
  crossSellViewAll: { fontSize: 12.5, fontWeight: "700", color: C.gold },
  crossSellScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  // 150 was too narrow — the price + Add button on ProductCard's bottom row
  // need more room, which is what wrapped "₹1,41,300" onto two lines.
  crossSellItem: { width: 175 },

  productShimmerCard: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 280,
  },
  productShimmerHeartWrap: { position: "absolute", top: 10, right: 10 },
  productShimmerBody: { padding: 12 },

  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: C.bgCard,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(28,28,30,0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  loadMoreText: { fontSize: 14, fontWeight: "600", color: C.textPrimary },
  loadMoreArrow: { fontSize: 20, color: C.textPrimary, lineHeight: 22 },
  collapseBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  collapseBtnText: { fontSize: 13, fontWeight: "500", color: C.textSecondary },

  emptyState: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    marginBottom: 5,
  },
  emptySubtitle: { fontSize: 12, color: C.textMuted },

  digitalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: C.bgCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  digitalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.greenBg,
    justifyContent: "center",
    alignItems: "center",
  },
  digitalTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    marginBottom: 2,
  },
  digitalSubtitle: { fontSize: 12, color: C.textMuted },

  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 99,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  toastAdded: { backgroundColor: "#1F8A4C" },
  toastRemoved: { backgroundColor: "#8B3A34" },
  toastText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

export default PgHomeScreen;
