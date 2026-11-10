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
  FlatList,
  Linking,
  Alert,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { selectUserId, selectAccessToken } from "../../store/authSlice";
import {
  incrementWishlistCount,
  decrementWishlistCount,
  setCartCount,
} from "../../store/cartSlice";
import ProductCard from "../components/ProductCard";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";
import DiwaliBlast, { DiwaliGreeting } from "../components/DiwaliBlast";
import ScrollReveal, {
  createRevealHub,
  ScrollRevealProvider,
} from "../components/ScrollReveal";
import GuestLoginSheet from "../components/GuestLoginSheet";
import ProductQuickViewSheet from "../components/ProductQuickViewSheet";
import { PG_HOME_THEME } from "../constants/physicalGoldColors";
import { showCartActionError } from "../utils/cartErrors";
import useCartQuantities from "../hooks/useCartQuantities";
import { resolveImageUrl } from "../utils/resolveImageUrl";
import { withPrice } from "../utils/productPrice";
import {
  getMainCategories,
  getSubCategories,
  getProducts,
  getProductVariants,
  searchAllProducts,
  getCategoryImages,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getOxygoldRates,
  getUserAddresses,
  addToCart,
  getCart,
} from "../api/physicalGoldApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { performanceMonitor } from "../../utils/performanceMonitor";
import { keyExtractor } from "../../utils/flatListOptimizations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;
// Home banner on/off.
const SHOW_HOME_BANNER = true;
// Diwali greeting + firework blast on Home — set false after the festival.
const SHOW_DIWALI = false;
// The "Happy Diwali" pop-up shows once per app launch (first time Home opens).
let diwaliGreetingShown = false;
// Promotional banners — add more images here and the carousel pages through
// them (auto-advance + dots); with one it shows as a single banner.
const HOME_BANNERS = [{ id: "pure-gold-silver", source: require("../../../assets/banner.png") }];
const BANNER_HEIGHT = BANNER_WIDTH * (929 / 1693) * 0.72;

// Quick actions under the price dashboard.
const QUICK_ACTIONS = [
  { key: "gold", label: "Buy Gold", icon: "diamond-outline" },
  { key: "silver", label: "Buy Silver", icon: "sparkles-outline" },
  { key: "orders", label: "My Orders", icon: "receipt-outline" },
  { key: "track", label: "Track Delivery", icon: "navigate-outline" },
];

// ─── Banner carousel — paging, auto-advance every 4s when there are 2+ ─────
const BannerCarousel = memo(({ banners, onPress }) => {
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return undefined;
    const t = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % banners.length;
        listRef.current?.scrollToOffset({ offset: next * (BANNER_WIDTH + 12), animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [banners.length]);
  return (
    <View style={styles.bannerSection}>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={(b) => b.id}
        horizontal
        pagingEnabled={false}
        snapToInterval={BANNER_WIDTH + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        scrollEnabled={banners.length > 1}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 12)))
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.bannerSlide}>
            <Image source={item.source} style={styles.bannerImage} resizeMode="cover" />
          </TouchableOpacity>
        )}
      />
      {banners.length > 1 && (
        <View style={styles.bannerDots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.bannerDot, i === index && styles.bannerDotActive]} />
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Design Tokens — Physical Gold palette (matches oxygold web app) ──
const C = {
  bg: "#FFFFFF",
  bgCard: "#FFFFFF",
  bgElevated: "#FFFFFF",
  bgGlass: "rgba(255,255,255,0.92)",
  gold: "#503189",
  goldBright: "#8A73B8",
  goldSoft: "#503189",
  goldMuted: "rgba(80,49,137,0.10)",
  goldBorder: "rgba(80,49,137,0.20)",
  goldText: "#503189",
  white: "#FFFFFF",
  textPrimary: "#333333",
  textSecondary: "#757575",
  textMuted: "#9E9E9E",
  green: "#15803D",
  greenBg: "rgba(20,108,59,0.08)",
  red: "#E53935",
  border: "#E0E0E0",
  borderStrong: "#D8CFC3",
  divider: "#EEEEF3",
  shadowGold: "rgba(80,49,137,0.15)",
  shadowDark: "rgba(34,30,28,0.10)",
  shimmer: "#F7F7F9",
};

// Deep aubergine keeps the footer premium and aligned with the purple brand.
const FOOTER_BG = "#4B3888"; // same softer violet as the header
const FOOTER_ACCENT = "#D6C7F2";
// Deliver-to, search and the banner share one flat band (the header
// above is the app-wide purple gradient from PgLayout).
// Bright champagne sampled from the light top of the banner image's
// background, so the banner blends into the band.
const HOME_BAND = "#FBF3E9";
// Green for the "Deliver to" row and the "Our Price Today" title.
const DELIVER_GREEN = "#1F8A4C";
const PRICE_TITLE = DELIVER_GREEN;
// Metal names in the "Our Price Today" rates — gold for gold, silver for silver.
const GOLD_LABEL = "#B8860B";
const SILVER_LABEL = "#6B7785";

const WHY_SHOP = [
  {
    image: require("../../../assets/Bishallmark.png"),
    title: "BIS Hallmarked",
    subtitle: "Certified purity you can trust always.",
  },
  {
    image: require("../../../assets/securedelivery.png"),
    title: "Secure Delivery",
    subtitle: "Safe delivery in 2–3 days.",
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


// ─── Global image cache (persists across renders) ─────────────────────────────
const IMAGE_CACHE = {};

// Extract image URL from category/subcat data without API call
const extractDirectImageUrl = (item) =>
  resolveImageUrl(item?.imageUrl || item?.image || item?.categoryImage);

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
    }, []);

    // No image at all, or the real one failed to load — an in-app icon,
    // not a placeholder fetched from an external service (via.placeholder.com
    // has been unreliable, leaving these blank whenever it's unreachable).
    if (!uri || errored) {
      return (
        <View style={[style, styles.categoryImgFallback]}>
          <Ionicons name="diamond-outline" size={26} color="#CF8B17" />
        </View>
      );
    }

    return (
      <View style={[style, { overflow: "hidden", backgroundColor: C.shimmer }]}>
        {!loaded && (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: C.shimmer }]}
          />
        )}
        <Animated.Image
          source={{ uri, cache: "force-cache" }}
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
const SectionHeader = memo(({ title, eyebrow, count, onViewAll, onBack, showBack, titleStyle }) => (
  <View style={styles.sectionHeader}>
    <View style={{ flex: 1 }}>
    {!!eyebrow && <Text style={styles.sectionEyebrow}>{eyebrow}</Text>}
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
      <Text style={[styles.sectionTitle, titleStyle]}>{title}</Text>
      {count != null && count > 0 && (
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{count}</Text>
        </View>
      )}
    </View>
    </View>
    {onViewAll && (
      <TouchableOpacity
        onPress={onViewAll}
        style={styles.viewAllBtn}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.viewAllText}>View all</Text>
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

// ─── Blinking "live" sparkle — green, the usual "live" cue ──
const LiveBlinkDot = memo(({ color }) => {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.25, duration: 650, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);
  return (
    <Animated.View style={{ opacity: blink }}>
      <Ionicons name="sparkles" size={13} color={color || "#1F8A4C"} />
    </Animated.View>
  );
});

// ─── Rate column — one karat/metal cell inside the live-rates card ────────────
const RateColumn = memo(({ icon, label, rate, decimals, labelColor }) => {
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
        <Text style={[styles.rateLabel, labelColor && { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        <Text
          style={styles.rateValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
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
const PgHomeScreen = ({ navigation, route }) => {
  // Opened as the separate "PgCategory" screen (a category's products) when a
  // category is passed in — own screen, so the header back arrow, Android
  // back and the iOS swipe-back all return to Home.
  const routeCategory = route?.params?.category || null;
  const isCategoryScreen = !!routeCategory;
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const dispatch = useDispatch();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    categories: false,
    products: false,
  });
  const [viewMode, setViewMode] = useState(isCategoryScreen ? "products" : "categories");
  const [activeCategory, setActiveCategory] = useState(routeCategory?.id ?? null);
  const [activeCategoryName, setActiveCategoryName] = useState(routeCategory?.name || "");
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Cross-sell — viewing Gold shows an "Explore Silver" strip below the
  // results, and vice versa. Same idea both directions, on purpose.
  const [crossSellCategory, setCrossSellCategory] = useState(null);
  const [crossSellProducts, setCrossSellProducts] = useState([]);
  const [crossSellLoading, setCrossSellLoading] = useState(false);

  // ── Image maps — keyed by id → url ────────────────────────────────────────
  const [categoryImages, setCategoryImages] = useState({});
  // Shop by Category tiles — the Gold / Silver sub-categories from the API
  // (e.g. Coins, Bars); falls back to the main categories when there are none.
  const [shopCategories, setShopCategories] = useState([]);
  const [shopCatImages, setShopCatImages] = useState({});
  const [shopCatLoading, setShopCatLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(false);

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
  const {
    cartQtyMap,
    cartVariantIds,
    refreshCart,
    clearCart,
    changeCartQty,
    cartBusyVariant,
  } = useCartQuantities(userId);
  const [cartLoadingId, setCartLoadingId] = useState(null);

  // Gold Products / Silver Products — two separate sections below
  // Categories, each pulling that metal's real products.
  const [goldProducts, setGoldProducts] = useState([]);
  const [silverProducts, setSilverProducts] = useState([]);
  const [metalProductsLoading, setMetalProductsLoading] = useState(false);

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

  // When the live rates were last fetched — shown as "Updated 12:30 PM".
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);

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
  // True once the banner band has scrolled up under the search bar — the bar
  // then lifts off the content with a soft shadow.
  const [topBarRaised, setTopBarRaised] = useState(false);
  // Diwali: fireworks keep bursting (a new set every 2s) while Home is in
  // focus — paused when you leave — and a "Happy Diwali" pop-up shows for
  // ~3s once per app launch.
  const [blastKey, setBlastKey] = useState(0);
  const [greetKey, setGreetKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (!SHOW_DIWALI || isCategoryScreen) return undefined;
      if (!diwaliGreetingShown) {
        diwaliGreetingShown = true;
        setGreetKey((k) => k + 1);
      }
      setBlastKey((k) => k + 1);
      const t = setInterval(() => setBlastKey((k) => k + 1), 2000);
      return () => clearInterval(t);
    }, [isCategoryScreen]),
  );

  // Scroll animations: items fade/rise in as they scroll into view.
  const revealHub = useRef(createRevealHub()).current;

  const handleScroll = useCallback((e) => {
    revealHub.notify();
    const raised = e.nativeEvent.contentOffset.y > 4;
    setTopBarRaised((prev) => (prev === raised ? prev : raised));
  }, []);

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
  // Guests can browse Home too — categories/products/rates all work without
  // a userId (guest read key). Login is only required for cart/wishlist/
  // checkout actions, gated at the point each of those is used.
  useEffect(() => {
    performanceMonitor.startMeasure("PgHomeScreen");
    fetchCategories();
  }, [userId]);

  // ── Gold Products / Silver Products — two separate sections below
  // Categories, each pulling that metal's real products. ──
  useEffect(() => {
    if (!categories.length) return;
    let alive = true;
    const goldCat = categories.find((c) => detectMetal(c?.name) === "gold");
    const silverCat = categories.find((c) => detectMetal(c?.name) === "silver");
    setMetalProductsLoading(true);
    Promise.allSettled([
      goldCat ? fetchProductsForCategory(goldCat.id) : Promise.resolve([]),
      silverCat ? fetchProductsForCategory(silverCat.id) : Promise.resolve([]),
    ])
      .then(([goldRes, silverRes]) => {
        if (!alive) return;
        // ₹0 / unpriced products are hidden everywhere on Home.
        setGoldProducts(goldRes.status === "fulfilled" ? withPrice(goldRes.value).slice(0, 6) : []);
        setSilverProducts(silverRes.status === "fulfilled" ? withPrice(silverRes.value).slice(0, 6) : []);
      })
      .finally(() => { if (alive) setMetalProductsLoading(false); });
    return () => { alive = false; };
  }, [categories]);

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
      setRatesUpdatedAt(Date.now());
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
      // Wishlist/addresses/cart are per-account — a guest just sees empty
      // state for these instead of being bounced to Login.
      if (!userId) {
        setWishlistMap({});
        setDeliveryAddress(null);
        setAddressLoading(false);
        clearCart();
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

      refreshCart();
    }, [userId, navigation]),
  );

  // ── Guest gate — Add to Cart / Buy Now / Wishlist all need an account.
  // A guest gets a half-screen login sheet instead of being bounced to a
  // full Login screen; whatever they were doing resumes automatically once
  // they're logged in. ──
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const pendingActionRef = useRef(null);

  const requireAuth = useCallback((type, product, variant) => {
    pendingActionRef.current = { type, product, variant };
    setShowGuestSheet(true);
  }, []);

  // ── Add to Cart from a product card — always adds that card's resolved
  // default variant; if already in cart, jumps straight to Cart instead. ──
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
        await refreshCart(); // card turns into the − qty + stepper
      } catch (e) {
        console.log("[PgHomeScreen] Add to cart failed:", e?.message);
        showCartActionError(e, navigation);
      } finally {
        setCartLoadingId(null);
      }
    },
    [userId, cartVariantIds, dispatch, navigation, requireAuth, refreshCart],
  );

  // ── Buy Now from a product card — adds the card's resolved default
  // variant to the cart (if not already there) then jumps straight to
  // Checkout, same as the Buy Now button on Product Details. ──
  const [buyNowLoadingId, setBuyNowLoadingId] = useState(null);
  const handleCardBuyNow = useCallback(
    async (product, variant) => {
      const variantId = variant?.id;
      if (!product?.id || !variantId) return;
      if (!userId) {
        requireAuth("buyNow", product, variant);
        return;
      }
      setBuyNowLoadingId(String(product.id));
      try {
        if (!cartVariantIds.has(String(variantId))) {
          await addToCart(userId, product.id, variantId, 1);
          refreshCart();
        }
        const cart = await getCart(userId);
        const cartItems = cart?.itemsInCart || [];
        if (!cartItems.length) {
          Alert.alert("Cart Empty", "Could not add this item. Please try again.");
          return;
        }
        dispatch(setCartCount(cart?.totalItemsInCart || cartItems.length));
        navigation.navigate("PgCheckout", {
          cartTotal: cart?.totalPayableAmount || 0,
          cartItems,
          showGstPopup: true, // skipped the Cart, so Checkout shows the GST popup
        });
      } catch (e) {
        showCartActionError(e, navigation);
      } finally {
        setBuyNowLoadingId(null);
      }
    },
    [userId, cartVariantIds, dispatch, navigation, requireAuth, refreshCart],
  );

  // ── Fetch categories ──────────────────────────────────────────────────────
  // Works for guests too — getMainCategories falls back to the guest read
  // key when there's no userId.
  const fetchCategories = async () => {
    const t0 = Date.now();
    try {
      setLoading((p) => ({ ...p, categories: true }));
      const data = await getMainCategories(userId);
      setCategories(data || []);
      setCategoriesError(false);
      performanceMonitor.endMeasure("PgHomeScreen");
    } catch (_) {
      setCategoriesError(true);
    } finally {
      setTimeout(
        () => setLoading((p) => ({ ...p, categories: false })),
        Math.max(0, 800 - (Date.now() - t0)),
      );
    }
  };

  // /search/products embeds each product's first variant — price, mrp,
  // stockQuantity, sku — right on the result, so cards get offer badges
  // without a separate per-card fetch.
  const fetchProductsViaSearch = async (categoryId) => {
    try {
      const res = await searchAllProducts({
        categoryId,
        productType: "PHYSICAL",
        sortBy: "NEWEST",
        pageSize: 12,
      });
      return res?.results || [];
    } catch (_) {
      return [];
    }
  };

  // Fetches a category's products, trying /search/products first (against
  // the category itself, then each sub-category — products are often tagged
  // on sub-categories, not the parent Gold/Silver id), falling back to the
  // older getProducts/getSubCategories chain only if search comes up empty.
  const fetchProductsForCategory = async (categoryId) => {
    const viaSearch = await fetchProductsViaSearch(categoryId);
    if (viaSearch.length) return viaSearch;

    const subsForSearch = await getSubCategories(categoryId).catch(() => []);
    if (subsForSearch?.length) {
      const subResults = await Promise.allSettled(
        subsForSearch.map((s) => fetchProductsViaSearch(s.id)),
      );
      const merged = [];
      const seen = new Set();
      subResults.forEach((r) => {
        if (r.status !== "fulfilled") return;
        r.value.forEach((p) => {
          if (p?.id && !seen.has(p.id)) {
            seen.add(p.id);
            merged.push(p);
          }
        });
      });
      if (merged.length) return merged;
    }

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

      setProducts(withPrice(items)); // hide ₹0 / unpriced products
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
        const items = withPrice(await fetchProductsForCategory(cat.id).catch(() => []));
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

  // Tapping a category (or a sub-category, cross-sell "View All", search
  // category) opens its own screen.
  const handleCategoryPress = (cat) => {
    if (!cat?.id) return;
    navigation.push("PgCategory", { category: { id: cat.id, name: cat.name || "" } });
  };

  // Loads a category's products into this screen (used by PgCategory).
  const showCategory = (cat) => {
    setActiveCategory(cat.id);
    setActiveCategoryName(cat.name || "");
    setViewMode("products");
    setShowAllProducts(false);
    fetchProductsData(cat.id);
    loadCrossSell(cat);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBackToCategories = () => {
    if (isCategoryScreen) {
      navigation.goBack();
      return;
    }
    setViewMode("categories");
    setActiveCategory(null);
    setActiveCategoryName("");
    setProducts([]);
    setShowAllProducts(false);
    setCrossSellCategory(null);
    setCrossSellProducts([]);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // PgCategory: load products straight away; the cross-sell strip needs the
  // category list, so it loads once categories arrive.
  const categoryLoadedRef = useRef(false);
  const crossSellLoadedRef = useRef(false);
  useEffect(() => {
    if (!isCategoryScreen || categoryLoadedRef.current) return;
    categoryLoadedRef.current = true;
    fetchProductsData(routeCategory.id);
  }, []);
  useEffect(() => {
    if (!isCategoryScreen || crossSellLoadedRef.current || !categories.length) return;
    crossSellLoadedRef.current = true;
    loadCrossSell(routeCategory);
  }, [categories]);

  // Gold / Silver main categories — quick actions and "View all" links.
  // (Defined here, after detectMetal, so it's initialised before use.)
  const goldCategory = categories.find((c) => detectMetal(c?.name) === "gold");
  const silverCategory = categories.find((c) => detectMetal(c?.name) === "silver");

  // Shop by Category: the main categories (Gold, Silver). The API's
  // Gold/Silver "sub-categories" are individual products (e.g.
  // "OXYGOLD.AI Gold Coin – 5 Grams"), so they aren't used as tiles.
  useEffect(() => {
    if (isCategoryScreen) return;
    const list = categories.filter((c) => c?.id);
    setShopCategories(list);
    loadImagesForList(list, setShopCatImages);
  }, [categories]);

  const handleQuickAction = (key) => {
    if (key === "gold" && goldCategory) return handleCategoryPress(goldCategory);
    if (key === "silver" && silverCategory) return handleCategoryPress(silverCategory);
    if (key === "orders" || key === "track") {
      if (!userId) return requireAuth("orders");
      return navigation.navigate("PgOrders");
    }
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
          // null (not an external placeholder URL) — LazyImage renders its
          // own in-app icon fallback when there's genuinely no image.
          const url = imgObj?.frontViewUrl || null;
          IMAGE_CACHE[String(item.id)] = url;
          return { id: String(item.id), url, success: true };
        })
        .catch(() => {
          IMAGE_CACHE[String(item.id)] = null;
          return { id: String(item.id), url: null, success: false };
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
    [wishlistMap, wishlistLoading, userId, dispatch, showToast, requireAuth],
  );

  // Resume whatever a guest was doing once they've logged in.
  useEffect(() => {
    if (!userId || !pendingActionRef.current) return;
    const { type, product, variant } = pendingActionRef.current;
    pendingActionRef.current = null;
    if (type === "cart") handleCardAddToCart(product, variant);
    else if (type === "buyNow") handleCardBuyNow(product, variant);
    else if (type === "wishlist") handleWishlistToggle(product);
    else if (type === "orders") navigation.navigate("PgOrders");
  }, [userId, handleCardAddToCart, handleCardBuyNow, handleWishlistToggle]);

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

  // ── Quick view — tapping a Gold/Silver product card on Home opens a
  // details popup instead of leaving Home. Its Buy Now reuses the card's
  // Buy Now flow; "View Full Details" opens the full screen. ──
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const openQuickView = useCallback((item) => setQuickViewProduct(item), []);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);
  // Close the sheet before moving on — iOS can only present one Modal at a
  // time, so the guest login sheet (or navigation) would otherwise stall.
  const quickViewBuyNow = useCallback(
    (product, variant) => {
      setQuickViewProduct(null);
      setTimeout(() => handleCardBuyNow(product, variant), 350);
    },
    [handleCardBuyNow],
  );
  const quickViewFullDetails = useCallback(
    (product) => {
      setQuickViewProduct(null);
      handleProductPress(product);
    },
    [handleProductPress],
  );

  const visibleProducts = showAllProducts ? products : products.slice(0, 6);
  const totalProducts = products.length;
  const hasMore = totalProducts > 6 && !showAllProducts;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderSearchResults = () => {
    const { categories: rCats, products: rProdsAll } = searchResults;
    const rProds = withPrice(rProdsAll);
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
                    cartQtyMap={cartQtyMap}
                    onChangeQty={changeCartQty}
                    qtyBusyVariant={cartBusyVariant}
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
              resizeMode="cover"
              fallbackText={item.name}
            />
          </View>
          <Text style={styles.categoryCardLabel} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.categoryCardExploreRow}>
            <Text style={styles.categoryCardExploreText}>Explore collection</Text>
            <Ionicons name="arrow-forward" size={12} color="#8B5A2B" />
          </View>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  const renderCategoriesGrid = () => {
    // Skeleton while categories / sub-categories load.
    if (loading.categories || (shopCatLoading && !shopCategories.length)) {
      return (
        <View style={styles.catGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.catTileWrap, { width: "50%" }]}>
              <ShimmerBox width="100%" height={110} borderRadius={14} />
            </View>
          ))}
        </View>
      );
    }
    // Error / empty — with a retry.
    if (!shopCategories.length) {
      return (
        <View style={styles.stateBox}>
          <Ionicons
            name={categoriesError ? "cloud-offline-outline" : "grid-outline"}
            size={26}
            color={C.textMuted}
          />
          <Text style={styles.stateText}>
            {categoriesError ? "Couldn't load categories." : "No categories yet."}
          </Text>
          <TouchableOpacity onPress={fetchCategories} style={styles.stateBtn} activeOpacity={0.8}>
            <Text style={styles.stateBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // 2 per row (wider than tall); a single tile spans the row.
    const tileShape = { aspectRatio: shopCategories.length === 1 ? 2.4 : 1.5 };
    return (
      <View style={styles.catGrid}>
        {shopCategories.map((cat, ci) => (
          <ScrollReveal
            key={cat.id}
            style={[styles.catTileWrap, { width: shopCategories.length === 1 ? "100%" : "50%" }]}
            delay={(ci % 2) * 90}
          >
          <TouchableOpacity
            onPress={() => handleCategoryPress(cat)}
            activeOpacity={0.88}
          >
            <View style={[styles.catTile, tileShape]}>
              <LazyImage
                uri={shopCatImages[cat.id] || categoryImages[cat.id]}
                style={styles.catTileImg}
                resizeMode="cover"
                fallbackText={cat.name}
              />
              <LinearGradient
                colors={["rgba(20,12,40,0)", "rgba(20,12,40,0.70)"]}
                style={styles.catTileFade}
                pointerEvents="none"
              />
              <View style={styles.catTileText} pointerEvents="none">
                <Text style={styles.catTileName} numberOfLines={1}>
                  {cat.name}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          </ScrollReveal>
        ))}
      </View>
    );
  };

  // Product skeleton for the collections while they load.
  const renderProductsSkeleton = () => (
    <View style={styles.exploreSection}>
      <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
        <ShimmerBox width={150} height={18} borderRadius={4} />
      </View>
      <View style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.gridItem}>
            <ShimmerBox width="100%" height={140} borderRadius={12} />
            <ShimmerBox width="85%" height={11} borderRadius={4} style={{ marginTop: 10 }} />
            <ShimmerBox width="45%" height={13} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );

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
        {/* Same rounded product cards as Home. */}
        <View style={styles.grid}>
          {visibleProducts.map((item, pi) => (
            <ScrollReveal
              key={keyExtractor(item)}
              style={styles.gridItem}
              delay={(pi % 2) * 90}
            >
              <ProductCard
                product={item}
                isInWishlist={!!wishlistMap[String(item?.id)]}
                onWishlistToggle={handleWishlistToggle}
                onAddToCart={handleCardAddToCart}
                addingCart={cartLoadingId === String(item?.id)}
                cartVariantIds={cartVariantIds}
                cartQtyMap={cartQtyMap}
                onChangeQty={changeCartQty}
                qtyBusyVariant={cartBusyVariant}
                onPress={handleProductPress}
              />
            </ScrollReveal>
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
  // No more "loading while checking auth" gate here — guests render the
  // real Home screen straight away; login is only asked for at the point
  // a cart/wishlist/checkout action needs it (see requireAuth above).

  return (
    <>
    {/* Inside a category's products (or search) the header shows a real back
        arrow — iOS has no hardware back button, and the small in-page
        "‹ Categories" link was easy to miss. */}
    <PgLayout
      title={
        isSearchActive
          ? "Search"
          : viewMode === "products"
            ? activeCategoryName || "Products"
            : "GoldMart"
      }
      showBack={isCategoryScreen || isSearchActive || viewMode === "products"}
      onBack={isSearchActive ? clearSearch : handleBackToCategories}
      contentBg="#5A44A0"
      headerGradient={["#4B3888", "#5A44A0"]}
      hideCart
    >
      {/* ── Delivery location + Search — pinned above the scroll, same cue
          shoppers already read on Amazon/Swiggy/Flipkart, now one combined
          bar instead of two separate sections. The location row reuses the
          address the delivery-fee calc treats as default so it's never out
          of sync with checkout. ── */}
      <View
        style={[
          styles.combinedTopBar,
          // Clean straight edge + soft shadow whenever content sits right
          // under the bar (product list, search, or Home scrolled down).
          (topBarRaised || isSearchActive || viewMode !== "categories") &&
            styles.combinedTopBarRaised,
        ]}
      >
        <TouchableOpacity
          style={styles.locationBar}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("PgAddress")}
        >
          <Ionicons name="location" size={16} color="#FFD166" />
          <Text style={styles.locationLine} numberOfLines={1}>
            <Text style={styles.locationLabel}>Deliver to </Text>
            <Text style={styles.locationValue}>
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
          </Text>
          <Ionicons name="chevron-down" size={15} color="#FFFFFF" />
        </TouchableOpacity>

        <Animated.View
          style={[styles.searchBarWrap, styles.searchBarWrapFixed]}
        >
          <Ionicons name="search" size={17} color={C.gold} />
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
        onScroll={handleScroll}
        scrollEventThrottle={32}
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
        <ScrollRevealProvider value={revealHub}>
        {isSearchActive ? (
          renderSearchResults()
        ) : (
          <>
            {/* ── CATEGORIES VIEW ── */}
            {viewMode === "categories" && (
              <FadeSlideIn key="categories">
                {/* ── Live price dashboard — white card lifted off the violet
                    header band: 24K / 22K / Silver, % change, last updated. ── */}
                <View style={styles.dashWrap}>
                  <View style={styles.dashBackdrop} />
                  <TouchableOpacity
                    style={styles.dashCard}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("PgAllRates")}
                    accessibilityLabel="Live gold and silver prices — open all rates"
                  >
                    <View style={styles.dashHead}>
                      <View style={styles.dashTitleRow}>
                        <LiveBlinkDot color="#1F8A4C" />
                        <Text style={styles.dashTitle}>Live Prices</Text>
                      </View>
                      <View style={styles.dashTitleRow}>
                        <Text style={styles.dashUpdated}>
                          {ratesUpdatedAt
                            ? `Updated ${new Date(ratesUpdatedAt).toLocaleTimeString("en-IN", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}`
                            : "Updating…"}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                      </View>
                    </View>
                    <View style={styles.dashCols}>
                      {[
                        { label: "Gold 24K", rate: goldRate, decimals: 0, dot: "#C8962E" },
                        { label: "Gold 22K", rate: gold22kRate, decimals: 0, dot: "#C8962E" },
                        { label: "Silver", rate: silverRate, decimals: 2, dot: "#A3AAB4" },
                      ].map((t, i) => (
                        <View key={t.label} style={[styles.dashCol, i > 0 && styles.dashColSplit]}>
                          <View style={styles.dashLabelRow}>
                            <View style={[styles.dashDot, { backgroundColor: t.dot }]} />
                            <Text style={styles.dashLabel}>{t.label}</Text>
                          </View>
                          {t.rate.price ? (
                            <Text style={styles.dashPrice} numberOfLines={1} adjustsFontSizeToFit>
                              ₹
                              {Number(t.rate.price).toLocaleString("en-IN", {
                                minimumFractionDigits: t.decimals,
                                maximumFractionDigits: t.decimals,
                              })}
                              <Text style={styles.dashUnit}>/g</Text>
                            </Text>
                          ) : (
                            <ShimmerBox width="80%" height={18} borderRadius={4} style={{ marginVertical: 2 }} />
                          )}
                          {!!t.rate.direction && (
                            <Text
                              style={[
                                styles.dashChange,
                                { color: t.rate.direction === "up" ? "#1F8A4C" : "#E53935" },
                              ]}
                            >
                              {t.rate.direction === "up" ? "▲" : "▼"}{" "}
                              {Math.abs(Number(t.rate.changePct || 0)).toFixed(2)}%
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* ── Promotional banner carousel ── */}
                {SHOW_HOME_BANNER && HOME_BANNERS.length > 0 && (
                  <BannerCarousel
                    banners={HOME_BANNERS}
                    onPress={() => scrollViewRef.current?.scrollTo({ y: 420, animated: true })}
                  />
                )}

                {/* Live Gold / Silver Rates + Categories — a flat cool tint
                    so this block reads as its own section, distinct from
                    the gold-tinted hero above. */}
                <View style={[styles.ratesAndCategoriesSection, styles.ratesTint]}>

                  {/* ── Quick actions ── */}
                  <View style={styles.quickRow}>
                    {QUICK_ACTIONS.map((q, qi) => (
                      <ScrollReveal key={q.key} style={styles.quickItem} delay={qi * 70} distance={18}>
                      <TouchableOpacity
                        style={{ alignItems: "center", gap: 6 }}
                        onPress={() => handleQuickAction(q.key)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.quickIcon}>
                          <Ionicons name={q.icon} size={20} color={C.gold} />
                        </View>
                        <Text style={styles.quickLabel} numberOfLines={1}>
                          {q.label}
                        </Text>
                      </TouchableOpacity>
                      </ScrollReveal>
                    ))}
                  </View>

                  <SectionHeader title="Shop by Category" />
                  {renderCategoriesGrid()}
                </View>

                {/* Gold Products / Silver Products — direct Buy Now on Home,
                    each card gets its offer badge from the embedded search
                    variant data when available. */}
                {metalProductsLoading && renderProductsSkeleton()}
                {!metalProductsLoading &&
                  !goldProducts.length &&
                  !silverProducts.length &&
                  !!categories.length && (
                    <View style={styles.stateBox}>
                      <Ionicons name="cube-outline" size={26} color={C.textMuted} />
                      <Text style={styles.stateText}>Products will appear here soon.</Text>
                    </View>
                  )}
                {!metalProductsLoading && (
                  <>
                    {goldProducts.length > 0 && (
                      <View style={styles.exploreSection}>
                        <SectionHeader
                          eyebrow="24K & 22K · BIS HALLMARKED"
                          title="Gold Collection"
                          onViewAll={goldCategory ? () => handleCategoryPress(goldCategory) : undefined}
                        />
                        <View style={styles.grid}>
                          {goldProducts.map((item, pi) => (
                            <ScrollReveal key={item?.id} style={styles.gridItem} delay={(pi % 2) * 90}>
                              <ProductCard
                                product={item}
                                isInWishlist={!!wishlistMap[String(item?.id)]}
                                onWishlistToggle={handleWishlistToggle}
                                onBuyNow={handleCardBuyNow}
                                buyingNow={buyNowLoadingId === String(item?.id)}
                                cartVariantIds={cartVariantIds}
                                cartQtyMap={cartQtyMap}
                                onChangeQty={changeCartQty}
                                qtyBusyVariant={cartBusyVariant}
                                onPress={openQuickView}
                                imageAspectRatio={1.2}
                              />
                            </ScrollReveal>
                          ))}
                        </View>
                      </View>
                    )}

                    {silverProducts.length > 0 && (
                      <View style={styles.exploreSection}>
                        <SectionHeader
                          eyebrow="999 PURE SILVER"
                          title="Silver Collection"
                          onViewAll={silverCategory ? () => handleCategoryPress(silverCategory) : undefined}
                        />
                        <View style={styles.grid}>
                          {silverProducts.map((item, pi) => (
                            <ScrollReveal key={item?.id} style={styles.gridItem} delay={(pi % 2) * 90}>
                              <ProductCard
                                product={item}
                                isInWishlist={!!wishlistMap[String(item?.id)]}
                                onWishlistToggle={handleWishlistToggle}
                                onBuyNow={handleCardBuyNow}
                                buyingNow={buyNowLoadingId === String(item?.id)}
                                cartVariantIds={cartVariantIds}
                                cartQtyMap={cartQtyMap}
                                onChangeQty={changeCartQty}
                                qtyBusyVariant={cartBusyVariant}
                                onPress={openQuickView}
                                imageAspectRatio={1.2}
                              />
                            </ScrollReveal>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Why Shop With Us — compact 2×2 list: gold icon on a soft
                    circle at left, title + one line at right. */}
                <View style={styles.whyShopSection}>
                  <Text style={styles.whyShopTitle}>Why Choose OXYGOLD</Text>
                  <View style={styles.whyShopRow}>
                    {WHY_SHOP.map((w, i) => (
                      <ScrollReveal key={i} style={styles.whyShopCell} delay={i * 80} distance={20}>
                        <View style={styles.whyShopIconWrap}>
                          <Image
                            source={w.image}
                            style={styles.whyShopIconImg}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.whyShopItemTitle}>{w.title}</Text>
                          <Text style={styles.whyShopItemSub} numberOfLines={2}>
                            {w.subtitle}
                          </Text>
                        </View>
                      </ScrollReveal>
                    ))}
                  </View>
                </View>

              </FadeSlideIn>
            )}

            {/* ── PRODUCTS VIEW ── */}
            {viewMode === "products" && (
              <FadeSlideIn key="products">
                {!loading.products && totalProducts > 0 && (
                  <Text style={styles.catCountText}>
                    {totalProducts} product{totalProducts === 1 ? "" : "s"}
                  </Text>
                )}
                {renderProductsGrid()}

                {/* ── Cross-sell — Gold results get an "Explore Silver" strip
                    below, and vice versa; falls back to "You Might Also
                    Like" when the categories aren't literally named by
                    metal, so this always has something to show. ── */}
                {!loading.products && !crossSellLoading && crossSellProducts.length > 0 && (
                  <View style={styles.crossSellSection}>
                    <SectionHeader
                      eyebrow="YOU MAY ALSO LIKE"
                      title={
                        detectMetal(crossSellCategory?.name) === "gold"
                          ? "Explore Gold"
                          : detectMetal(crossSellCategory?.name) === "silver"
                            ? "Explore Silver"
                            : "More to explore"
                      }
                      onViewAll={() => handleCategoryPress(crossSellCategory)}
                    />
                    <View style={styles.grid}>
                      {crossSellProducts.slice(0, 4).map((item, pi) => (
                        <ScrollReveal
                          key={keyExtractor(item)}
                          style={styles.gridItem}
                          delay={(pi % 2) * 90}
                        >
                          <ProductCard
                            product={item}
                            isInWishlist={!!wishlistMap[String(item?.id)]}
                            onWishlistToggle={handleWishlistToggle}
                            onAddToCart={handleCardAddToCart}
                            addingCart={cartLoadingId === String(item?.id)}
                            cartVariantIds={cartVariantIds}
                            cartQtyMap={cartQtyMap}
                            onChangeQty={changeCartQty}
                            qtyBusyVariant={cartBusyVariant}
                            onPress={handleProductPress}
                          />
                        </ScrollReveal>
                      ))}
                    </View>
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
              source={require("../../../assets/logo-header.png")}
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
              <Ionicons name="location-outline" size={15} color={FOOTER_ACCENT} style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>
                OXYIDEAS PARTNERS LLP, CC-03, Indu Fortune Fields, KPHB,
                Hyderabad, Telangana - 500085
              </Text>
            </View>

            <View style={styles.footerContactRow}>
              <Ionicons name="location-outline" size={15} color={FOOTER_ACCENT} style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>
                AI Research Center, Entrance D, SE02 Concourse, Miyapur Metro
                Station, Hyderabad, Telangana 500049
              </Text>
            </View>

            <TouchableOpacity style={styles.footerContactRow} onPress={() => Linking.openURL("tel:+918143271103")}>
              <Ionicons name="call-outline" size={15} color={FOOTER_ACCENT} style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>+91 81432 71103</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerContactRow} onPress={() => Linking.openURL("mailto:support@oxygold.ai")}>
              <Ionicons name="mail-outline" size={15} color={FOOTER_ACCENT} style={styles.footerContactIcon} />
              <Text style={styles.footerContactText}>support@oxygold.ai</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerContactRow} onPress={() => navigation.navigate("PgSupport")}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={FOOTER_ACCENT} style={styles.footerContactIcon} />
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
        </ScrollRevealProvider>
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
    {SHOW_DIWALI && !isCategoryScreen && <DiwaliBlast playKey={blastKey} />}
    {SHOW_DIWALI && !isCategoryScreen && <DiwaliGreeting showKey={greetKey} />}

    <ProductQuickViewSheet
      visible={!!quickViewProduct}
      product={quickViewProduct}
      onClose={closeQuickView}
      onBuyNow={quickViewBuyNow}
      onViewFull={quickViewFullDetails}
    />

    <GuestLoginSheet
      visible={showGuestSheet}
      onClose={() => {
        setShowGuestSheet(false);
        pendingActionRef.current = null;
      }}
      onSuccess={() => setShowGuestSheet(false)}
    />
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Violet behind the scroll so no light seam shows where the pinned top bar
  // meets the dashboard band (the content itself stays white).
  scrollFlex: { flex: 1, backgroundColor: "#5A44A0" },
  scrollContent: { paddingBottom: 16, backgroundColor: "#FFFFFF" },

  // Deliver-to + search share one soft lavender band with the rate card
  // below them, so the top of Home reads as one block.
  combinedTopBar: {
    paddingTop: 4,
    paddingBottom: 3,
    backgroundColor: "#5A44A0",
    // Reach 1px into the scroll area (drawn on top) so no white hairline
    // shows where the pinned bar meets the violet dashboard band.
    marginBottom: -1,
    zIndex: 2,
  },
  // Flat cream behind Deliver-to, search and the banner.
  goldFlatTint: { backgroundColor: HOME_BAND },
  combinedTopBarRaised: {
    zIndex: 2,
    shadowColor: "#2A1F4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  // Soft lavender — the brand purple's tint.
  greenFlatTint: { backgroundColor: PG_HOME_THEME.tint },
  // Gold Rates + Categories — a different, cooler flat tint so this block
  // reads as its own section instead of blending into the hero above.
  ratesTint: { backgroundColor: "#FFFFFF" },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  locationTextWrap: { flex: 1 },
  locationLine: { flex: 1, fontSize: 13 },
  locationLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#D8CDEE",
    letterSpacing: 0.2,
  },
  locationValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 1,
  },

  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 0,
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
    fontWeight: "600",
    paddingHorizontal: 4,
  },

  searchResultsWrap: { paddingBottom: 20 },
  searchGroupLabel: {
    fontSize: 13,
    fontWeight: "600",
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
    backgroundColor: "#F4F0FA",
    borderWidth: 1.5,
    borderColor: C.goldBorder,
    overflow: "hidden",
    marginBottom: 6,
  },
  searchCatImg: { width: 56, height: 56, borderRadius: 28 },
  searchCatLabel: {
    fontSize: 10,
    fontWeight: "500",
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
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  searchEmptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.textPrimary,
    marginBottom: 6,
  },
  searchEmptySubtitle: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
  },

  bannerSection: { paddingTop: 16, paddingBottom: 4 },
  bannerCarouselWrap: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E6E1EC",
  },

  // ── Live gold / silver rates ──
  ratesAndCategoriesSection: { paddingTop: 20, paddingBottom: 16, borderBottomWidth: 8, borderBottomColor: "#F6F4F9" },
  categoriesSpacer: { height: 30 },
  // Thin light border instead of a shadow — cleaner, matches Cart/Checkout.
  // Thin light border instead of a shadow — cleaner, matches Cart/Checkout.
  ratesCard: {
    marginHorizontal: 16,
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEEEF3",
  },
  ratesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  ratesTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRICE_TITLE,
    letterSpacing: 0.2,
  },
  ratesUpdatedText: { marginLeft: "auto", fontSize: 11, color: C.textMuted },
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
  rateIconImg: { width: 32, height: 32 },
  rateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSecondary,
    marginBottom: 2,
  },
  // Bigger/bolder than the original 12.5/700 so it reads clearly; shrinks to
  // fit rather than cutting off with "…".
  rateValue: { fontSize: 16, fontWeight: "600", color: C.textPrimary },
  rateUnit: { fontSize: 10, fontWeight: "500", color: C.textSecondary },
  rateChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  rateChangeText: { fontSize: 11, fontWeight: "600" },
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
  ratesLinkText: { fontSize: 13, fontWeight: "500", color: C.gold },
  bannerSlide: {
    width: BANNER_WIDTH,
    // Shorter than the artwork (~72%); "cover" trims top/bottom only, so the
    // headline, SHOP NOW and the bars (all mid-height) stay visible.
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#333333",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  // ── Why Shop With Us — LinearGradient handles the fade, no flat color here ──
  // Warm cream → champagne gradient (set in JSX) — complements the gold
  // icons and their glow; split from the products above by a grey band.
  whyShopSection: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 22,
    borderTopWidth: 8,
    borderTopColor: "#F6F4F9",
  },
  whyShopTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: C.textPrimary,
    marginBottom: 14,
  },
  whyShopRow: { flexDirection: "row", flexWrap: "wrap", rowGap: 16 },
  whyShopCell: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 8,
  },
  whyShopCard: {},
  whyShopIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF6E6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  whyShopIconImg: { width: 40, height: 40 },
  whyShopItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
  },
  whyShopItemSub: {
    fontSize: 11,
    color: C.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },

  // ── Footer — deep evergreen with soft neutral text and muted gold accents. ──
  footer: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 34,
    paddingHorizontal: 24,
    backgroundColor: FOOTER_BG,
  },
  footerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  footerLogoImg: { width: 168, height: 29, marginRight: 12 },
  footerTagline: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#DCD3F0",
    textAlign: "left",
    lineHeight: 17,
  },
  footerDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 20,
  },
  footerBlock: {
    width: "100%",
    alignItems: "flex-start",
  },
  footerHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: FOOTER_ACCENT,
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
    color: "#F4F0FA",
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
    fontWeight: "500",
    color: "#DCD3F0",
  },
  footerLinkDot: {
    fontSize: 11,
    color: "#A89CC8",
    marginHorizontal: 7,
  },
  footerCopyright: {
    fontSize: 11,
    fontWeight: "500",
    color: "#A89CC8",
    textAlign: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 4,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "600",
    color: "#B8860B",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  goldProductsTitle: {
    color: "#A85B00",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  silverProductsTitle: {
    color: "#536575",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  countPill: {
    backgroundColor: "#F7F7F9",
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
  viewAllText: { fontSize: 13, fontWeight: "600", color: C.gold },

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
  breadcrumbLink: { fontSize: 13, color: C.gold, fontWeight: "600" },
  breadcrumbSep: { fontSize: 13, color: C.textMuted, marginHorizontal: 2 },
  breadcrumbCurrent: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "500",
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
    aspectRatio: 1.5,
    backgroundColor: C.shimmer,
  },
  categoryCardShimmerImg: { width: "100%", aspectRatio: 1 },
  categoryCardImg: { width: "100%", height: "100%" },
  categoryImgFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(207,139,23,0.08)",
  },
  categoryCardLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: "left",
    lineHeight: 19,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  categoryCardExploreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  categoryCardExploreText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B5A2B",
  },

  exploreSection: { paddingTop: 14, paddingBottom: 0 },
  // Cards sit on 10px gutters (5px padding each side + 11px outer).
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 11,
    marginBottom: 12,
  },
  gridItem: { width: "50%", padding: 5 },
  // Home collections — 3 smaller cards per row.
  homeGridItem: { width: "33.333%", padding: 4 },
  gridFlat: { paddingHorizontal: 12 },
  gridItemFlat: { padding: 0 },

  // ── Live price dashboard ──
  dashWrap: { position: "relative", paddingHorizontal: 16, paddingTop: 6, marginTop: -1 },
  // Violet band behind the card's top half — continues the header.
  dashBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 52,
    backgroundColor: "#5A44A0",
  },
  dashCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EEEAF5",
    shadowColor: "#2A1F4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 10,
  },
  dashHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dashTitleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dashTitle: { fontSize: 14, fontWeight: "600", color: C.textPrimary },
  dashUpdated: { fontSize: 11, color: C.textMuted },
  dashCols: { flexDirection: "row" },
  dashCol: { flex: 1, gap: 3 },
  dashColSplit: { borderLeftWidth: 1, borderLeftColor: "#F0EDF5", paddingLeft: 12 },
  dashLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dashDot: { width: 6, height: 6, borderRadius: 3 },
  dashLabel: { fontSize: 12, color: C.textSecondary },
  dashPrice: { fontSize: 16, fontWeight: "600", color: C.textPrimary },
  dashUnit: { fontSize: 10, fontWeight: "400", color: C.textMuted },
  dashChange: { fontSize: 11, fontWeight: "500" },

  // ── Happy Diwali greeting ──
  diwaliWrap: { paddingHorizontal: 16, paddingTop: 16 },
  diwaliCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
  },
  diwaliIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,209,102,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  diwaliTitle: { fontSize: 17, fontWeight: "700", color: "#FFD166" },
  diwaliText: { fontSize: 12.5, color: "#F3E8FF", lineHeight: 18, marginTop: 3 },
  diwaliBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 10,
    backgroundColor: "#FFD166",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  diwaliBtnText: { fontSize: 12, fontWeight: "700", color: "#4A2A7A" },
  diwaliSpark: { position: "absolute", top: 10, right: 12 },

  // ── Quick actions ──
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quickItem: { width: "24%", alignItems: "center", gap: 6 },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F4F0FA",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11.5, fontWeight: "500", color: C.textPrimary },

  // ── Empty / error state ──
  stateBox: { alignItems: "center", paddingVertical: 22, gap: 8 },
  stateText: { fontSize: 13, color: C.textSecondary },
  stateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.gold,
  },
  stateBtnText: { fontSize: 12.5, fontWeight: "600", color: C.gold },

  // ── Banner carousel ──
  bannerDots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#DDD6EA" },
  bannerDotActive: { width: 16, backgroundColor: C.gold },

  // ── Live rate hero (previous) ──
  // Same dark violet as the header and top bar — one block, edge to edge.
  heroWrap: {
    marginTop: -1, // overlap the pinned top bar by 1px — no light seam between them
    // (brighter brand-violet band — distinct from the dark violet top bar)
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 18,
  },
  // Refined: fine gold edge, compact, no boxed tiles.
  // No card of its own — sits straight on the violet band (full cover);
  // a violet hairline above it separates it from the search bar.
  heroCard: { paddingTop: 8, gap: 12 },
  // Three even columns, split by faint gold hairlines.
  heroCols: { flexDirection: "row" },
  heroCol: { flex: 1, gap: 3 },
  heroColSplit: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(255,255,255,0.22)",
    paddingLeft: 12,
  },
  heroColLabel: { fontSize: 12, fontWeight: "600" },
  heroColPrice: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  heroColUnit: { fontSize: 10, fontWeight: "400", color: "#D8CDEE" },
  heroColChange: { fontSize: 11, fontWeight: "500" },
  heroAllRates: { flexDirection: "row", alignItems: "center", gap: 2 },
  heroLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8, height: 36 },
  heroLoadingText: { fontSize: 13, color: "#C9BEE6" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLiveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroLiveText: { fontSize: 14, fontWeight: "600", color: "#86EFAC" },
  heroUpdated: { fontSize: 11, color: "#D8CDEE" },
  heroMainRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  heroMainLabel: { fontSize: 13, color: "#D8CDEE" },
  heroMainPrice: { fontSize: 28, fontWeight: "600", color: "#FFFFFF", marginTop: 2, letterSpacing: -0.5 },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(74,222,128,0.16)",
    marginBottom: 4,
  },
  heroChipDown: { backgroundColor: "rgba(248,113,113,0.16)" },
  heroChipText: { fontSize: 12, fontWeight: "600", color: "#86EFAC" },
  // Two columns split by a gold hairline, under a gold hairline.
  heroTiles: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(228,187,103,0.35)",
    paddingTop: 12,
  },
  heroTile: { flex: 1, gap: 3 },
  heroTileSplit: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(228,187,103,0.35)",
    paddingLeft: 16,
  },
  heroTileLabel: { fontSize: 12, fontWeight: "600" },
  heroTilePrice: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  heroTileUnit: { fontSize: 11, fontWeight: "400", color: "#C9BEE6" },
  heroTileChange: { fontSize: 11, fontWeight: "500" },
  heroLinkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  heroLink: { fontSize: 13, fontWeight: "600", color: "#E4BB67" },

  // ── Shop by Category — photo tiles ──
  catGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 11 },
  catTileWrap: { width: "33.333%", padding: 5 },
  catTile: {
    width: "100%",
    aspectRatio: 0.95,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F7F7F9",
  },
  catTileImg: { width: "100%", height: "100%" },
  catTileFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" },
  catTileText: { position: "absolute", left: 8, right: 8, bottom: 8 },
  catTileName: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  catTileExploreRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  catTileExplore: { fontSize: 12, fontWeight: "500", color: "#E4BB67" },
  // (round-image row, no longer used)
  catRow: { paddingHorizontal: 12, gap: 6 },
  catItem: { width: 84, alignItems: "center", paddingHorizontal: 4 },
  catCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: "#FFF6E0",
    borderWidth: 1,
    borderColor: "#EAD29A",
  },
  catCircleImg: { width: "100%", height: "100%" },
  catName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
    color: C.textPrimary,
    textAlign: "center",
    lineHeight: 16,
  },

  // ── Collections — side-scrolling product rails ──
  rail: { paddingHorizontal: 16, gap: 12, paddingBottom: 6 },
  railItem: { width: 160 },

  // ── Cross-sell strip — "Explore Gold"/"Explore Silver" below the results ──
  crossSellSection: { marginTop: 12, paddingTop: 20, borderTopWidth: 8, borderTopColor: "#F6F4F9" },
  catCountText: { fontSize: 13, color: C.textSecondary, marginHorizontal: 16, marginTop: 14, marginBottom: 10 },
  crossSellHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  crossSellTitle: { fontSize: 15, fontWeight: "600", color: C.textPrimary },
  crossSellViewAll: { fontSize: 13, fontWeight: "600", color: C.gold },
  crossSellScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  // Same width as a half-screen grid card.
  crossSellItem: { width: 170 },

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
  loadMoreText: { fontSize: 14, fontWeight: "500", color: C.textPrimary },
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
    fontWeight: "500",
    color: C.textPrimary,
    marginBottom: 5,
  },
  emptySubtitle: { fontSize: 12, color: C.textMuted },

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
  toastText: { fontSize: 13, fontWeight: "600", color: "#fff" },
});

export default PgHomeScreen;
