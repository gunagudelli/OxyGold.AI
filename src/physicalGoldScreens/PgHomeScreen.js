import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { selectUserId, selectAccessToken } from "../store/authSlice";
import ProductCard from "../../components/physical/ProductCard";
import PgLayout from "../../components/physical/PgLayout";
import SessionExpired from "../components/SessionExpired";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;

// ─── Design Tokens — Warm Light Fintech Palette ───────────────────────────────
const C = {
  bg: "#F5F3EE",
  bgCard: "#FFFFFF",
  bgElevated: "#FDFAF5",
  bgGlass: "rgba(255,255,255,0.90)",
  gold: "#B8860B",
  goldBright: "#D4A843",
  goldSoft: "#C8952A",
  goldMuted: "rgba(184,134,11,0.10)",
  goldBorder: "rgba(184,134,11,0.20)",
  goldText: "#A0720A",
  white: "#FFFFFF",
  textPrimary: "#1A1C2E",
  textSecondary: "#6B6F85",
  textMuted: "#A8ABBE",
  green: "#0D9F6E",
  greenBg: "rgba(13,159,110,0.08)",
  red: "#E02424",
  border: "#EBE8E1",
  borderStrong: "#D8D4CA",
  divider: "#F0EDE6",
  shadowGold: "rgba(184,134,11,0.15)",
  shadowDark: "rgba(26,28,46,0.10)",
};

const TRUST = [
  { label: "BIS\nHallmarked" },
  { label: "Free\nDelivery" },
  { label: "Secure\nPayment" },
  { label: "Ontime\nDelivery" },
];

// ─── Shimmer Placeholder ──────────────────────────────────────────────────────
const ShimmerBox = ({ width, height, borderRadius = 8, style }) => {
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
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.2] });
  return (
    <View style={[{ width, height }, style]}>
      <Animated.View style={{ flex: 1, borderRadius, backgroundColor: C.goldText, opacity }} />
    </View>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, count, onViewAll, onBack, showBack }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      {showBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
      )}
      <View style={styles.sectionAccentGroup}>
        <View style={styles.sectionAccentTall} />
        <View style={styles.sectionAccentShort} />
      </View>
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
        <Text style={styles.viewAllArrow}>›</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Subcategory Fade Wrapper ─────────────────────────────────────────────────
const FadeInView = ({ children, visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible]);
  return <Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>;
};

// ─── VIEW MODES ──────────────────────────────────────────────────────────────
// "categories"   → show all category cards + banner + trust strip
// "subcategories"→ user tapped a category → show subcategory cards for that category
// "products"     → user tapped a subcategory → show product grid
// "search"       → user is actively searching

// ─── Main Component ───────────────────────────────────────────────────────────
const PgHomeScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);

  // ── State ──────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({ categories: false, subCategories: false, products: false });

  // View mode: "categories" | "subcategories" | "products"
  const [viewMode, setViewMode] = useState("categories");

  const [activeCategory, setActiveCategory] = useState(null);
  const [activeCategoryName, setActiveCategoryName] = useState("");
  const [activeSubCat, setActiveSubCat] = useState(null);
  const [activeSubCatName, setActiveSubCatName] = useState("");

  // ── FIX: track whether "View All" has been tapped in products view ─────────
  const [showAllProducts, setShowAllProducts] = useState(false);

  const [categoryImages, setCategoryImages] = useState({});
  const [subCategoryImages, setSubCategoryImages] = useState({});
  const imgCacheRef = useRef({});
  const variantCacheRef = useRef({});

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState({ categories: [], subCategories: [], products: [] });
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [allProductsCache, setAllProductsCache] = useState([]);
  const searchInputRef = useRef(null);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  // Wishlist
  const [wishlistMap, setWishlistMap] = useState({});
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [wishlistToast, setWishlistToast] = useState({ visible: false, text: "", added: true });
  const toastTimeoutRef = useRef(null);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const coinPulse = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef(null);
  const bannerScrollRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerIntervalRef = useRef(null);
  const isManualScrollRef = useRef(false);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (text, added) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setWishlistToast({ visible: true, text, added });
    toastTimeoutRef.current = setTimeout(() => setWishlistToast({ visible: false, text: "", added: true }), 2500);
  };

  useEffect(() => {
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); };
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => { fetchCategories(); }, []);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
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
    }, [userId])
  );

  // ── Fetch categories ──────────────────────────────────────────────────────
  const fetchCategories = async () => {
    if (!userId || !accessToken) return;
    const startTime = Date.now();
    try {
      setLoading((prev) => ({ ...prev, categories: true }));
      const data = await getMainCategories(userId);
      setCategories(data || []);
    } catch (error) {
      console.log("[PgHome] Error fetching categories:", error);
    } finally {
      const remaining = Math.max(0, 800 - (Date.now() - startTime));
      setTimeout(() => setLoading((prev) => ({ ...prev, categories: false })), remaining);
    }
  };

  // ── Fetch subcategories when a category is tapped ─────────────────────────
  const fetchSubCategoriesData = async (categoryId) => {
    const startTime = Date.now();
    try {
      setLoading((prev) => ({ ...prev, subCategories: true }));
      setSubCategories([]);
      const data = await getSubCategories(categoryId);
      setSubCategories(data || []);
    } catch (error) {
      console.log("[PgHome] Error fetching subcategories:", error);
    } finally {
      const remaining = Math.max(0, 800 - (Date.now() - startTime));
      setTimeout(() => setLoading((prev) => ({ ...prev, subCategories: false })), remaining);
    }
  };

  // ── Fetch products when a subcategory is tapped ───────────────────────────
  const fetchProductsData = async (subCategoryId) => {
    const startTime = Date.now();
    try {
      setLoading((prev) => ({ ...prev, products: true }));
      setProducts([]);
      const data = await getProducts(subCategoryId);
      const items = data?.items || data || [];
      setProducts(items);
      // Cache for search
      setAllProductsCache((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = items.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
    } catch (error) {
      console.log("[PgHome] Error fetching products:", error);
    } finally {
      const remaining = Math.max(0, 800 - (Date.now() - startTime));
      setTimeout(() => setLoading((prev) => ({ ...prev, products: false })), remaining);
    }
  };

  // ── Category tap → go to subcategories view ───────────────────────────────
  const handleCategoryPress = (cat) => {
    setActiveCategory(cat.id);
    setActiveCategoryName(cat.name || "");
    setActiveSubCat(null);
    setActiveSubCatName("");
    setProducts([]);
    setViewMode("subcategories");
    fetchSubCategoriesData(cat.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Subcategory tap → go to products view ────────────────────────────────
  const handleSubCategoryPress = (sub) => {
    setActiveSubCat(sub.id);
    setActiveSubCatName(sub.name || "");
    setViewMode("products");
    // FIX: reset show-all when entering a new subcategory
    setShowAllProducts(false);
    fetchProductsData(sub.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Back from subcategories → categories ─────────────────────────────────
  const handleBackToCategories = () => {
    setViewMode("categories");
    setActiveCategory(null);
    setActiveCategoryName("");
    setSubCategories([]);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Back from products → subcategories ────────────────────────────────────
  const handleBackToSubCategories = () => {
    setViewMode("subcategories");
    setActiveSubCat(null);
    setActiveSubCatName("");
    setProducts([]);
    // FIX: also reset show-all when going back
    setShowAllProducts(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Hardware back button handler ──────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSearchActive) {
        clearSearch();
        return true;
      }
      if (viewMode === "products") {
        handleBackToSubCategories();
        return true;
      }
      if (viewMode === "subcategories") {
        handleBackToCategories();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [viewMode, isSearchActive]);

  // ── Animations ────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(fadeInAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(coinPulse, { toValue: 1.055, duration: 1600, useNativeDriver: true }),
        Animated.timing(coinPulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    const startInterval = () => {
      bannerIntervalRef.current = setInterval(() => {
        if (!isManualScrollRef.current) {
          setCurrentBannerIndex((prev) => (prev + 1) % 2);
        }
      }, 7000);
    };
    startInterval();
    return () => clearInterval(bannerIntervalRef.current);
  }, []);

  useEffect(() => {
    if (bannerScrollRef.current) {
      bannerScrollRef.current.scrollTo({ x: currentBannerIndex * BANNER_WIDTH, animated: true });
    }
  }, [currentBannerIndex]);

  // ── Category image loading ─────────────────────────────────────────────────
  useEffect(() => {
    if (!categories.length) return;
    categories.forEach((cat) => {
      if (imgCacheRef.current[cat.id]) {
        setCategoryImages((prev) => ({ ...prev, [cat.id]: imgCacheRef.current[cat.id] }));
        return;
      }
      const imageUrl = cat.imageUrl || cat.image || cat.categoryImage;
      if (imageUrl) {
        imgCacheRef.current[cat.id] = imageUrl;
        setCategoryImages((prev) => ({ ...prev, [cat.id]: imageUrl }));
      } else {
        getCategoryImages(cat.id)
          .then((imgObj) => {
            const url = imgObj?.frontViewUrl || `https://via.placeholder.com/64?text=${encodeURIComponent(cat.name || "Gold")}`;
            imgCacheRef.current[cat.id] = url;
            setCategoryImages((prev) => ({ ...prev, [cat.id]: url }));
          })
          .catch(() => {
            const url = `https://via.placeholder.com/64?text=${encodeURIComponent(cat.name || "Gold")}`;
            imgCacheRef.current[cat.id] = url;
            setCategoryImages((prev) => ({ ...prev, [cat.id]: url }));
          });
      }
    });
  }, [categories]);

  useEffect(() => {
    if (!subCategories.length) return;
    subCategories.forEach((subCat) => {
      if (imgCacheRef.current[subCat.id]) {
        setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: imgCacheRef.current[subCat.id] }));
        return;
      }
      const imageUrl = subCat.imageUrl || subCat.image || subCat.categoryImage;
      if (imageUrl) {
        imgCacheRef.current[subCat.id] = imageUrl;
        setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: imageUrl }));
      } else {
        getCategoryImages(subCat.id)
          .then((imgObj) => {
            const url = imgObj?.frontViewUrl || `https://via.placeholder.com/80?text=${encodeURIComponent(subCat.name || "Gold")}`;
            imgCacheRef.current[subCat.id] = url;
            setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: url }));
          })
          .catch(() => {
            const url = `https://via.placeholder.com/80?text=${encodeURIComponent(subCat.name || "Gold")}`;
            imgCacheRef.current[subCat.id] = url;
            setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: url }));
          });
      }
    });
  }, [subCategories]);

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  // ── Search logic ──────────────────────────────────────────────────────────
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setIsSearchActive(false);
      setSearchResults({ categories: [], subCategories: [], products: [] });
      return;
    }
    setIsSearchActive(true);
    const q = text.trim().toLowerCase();

    const matchedCats = categories.filter((c) => c?.name?.toLowerCase().includes(q));
    const matchedSubCats = subCategories.filter((s) => s?.name?.toLowerCase().includes(q));
    const matchedProducts = allProductsCache.filter(
      (p) =>
        p?.name?.toLowerCase().includes(q) ||
        p?.description?.toLowerCase().includes(q) ||
        p?.category?.toLowerCase().includes(q)
    );

    setSearchResults({ categories: matchedCats, subCategories: matchedSubCats, products: matchedProducts });
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
    inputRange: [0, 1],
    outputRange: [C.border, C.goldBright],
  });

  // ── Wishlist handler ──────────────────────────────────────────────────────
  const handleWishlistToggle = useCallback(
    async (item) => {
      const pid = String(item?.id);
      if (wishlistLoading[pid]) return;
      setWishlistLoading((prev) => ({ ...prev, [pid]: true }));
      try {
        if (wishlistMap[pid]) {
          await removeFromWishlist(wishlistMap[pid]);
          setWishlistMap((prev) => { const n = { ...prev }; delete n[pid]; return n; });
          showToast("Removed from wishlist", false);
        } else {
          let firstVariant = variantCacheRef.current[pid];
          if (!firstVariant) {
            const varRes = await getProductVariants(item.id);
            const inner = varRes?.data || varRes;
            const varList = inner?.listVariantResponse || inner?.variants || (Array.isArray(inner) ? inner : []);
            firstVariant = varList[0];
            if (firstVariant) variantCacheRef.current[pid] = firstVariant;
          }
          if (!firstVariant?.id) { showToast("No variant found for this product", false); return; }
          const res = await addToWishlist(userId, item.id, firstVariant.id);
          setWishlistMap((prev) => ({ ...prev, [pid]: res?.id || res?.wishlistId || pid }));
          showToast("Added to wishlist ❤️", true);
        }
      } catch (e) {
        showToast(e?.message || "Wishlist update failed", false);
      }
      setWishlistLoading((prev) => ({ ...prev, [pid]: false }));
    },
    [wishlistMap, wishlistLoading, userId]
  );

  // ── Session guard ─────────────────────────────────────────────────────────
  if (!userId || !accessToken) {
    return (
      <PgLayout title="GoldMart" showBack={false}>
        <SessionExpired variant="inline" onLoginPress={() => navigation.reset({ index: 0, routes: [{ name: "Login" }] })} />
      </PgLayout>
    );
  }

  // FIX: derive the visible list from showAllProducts state
  const visibleProducts = showAllProducts ? products : (products?.slice(0, 6) || []);
  const totalProducts = products?.length || 0;
  const hasMore = totalProducts > 6 && !showAllProducts;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Search Results ────────────────────────────────────────────────────────
  const renderSearchResults = () => {
    const hasCategories = searchResults.categories.length > 0;
    const hasSubCats = searchResults.subCategories.length > 0;
    const hasProducts = searchResults.products.length > 0;
    const hasAny = hasCategories || hasSubCats || hasProducts;

    if (!hasAny) {
      return (
        <View style={styles.searchEmptyState}>
          <Text style={styles.searchEmptyIcon}>🔍</Text>
          <Text style={styles.searchEmptyTitle}>No results for "{searchQuery}"</Text>
          <Text style={styles.searchEmptySubtitle}>Try searching by product name or category</Text>
        </View>
      );
    }

    return (
      <View style={styles.searchResultsWrap}>
        {hasCategories && (
          <View>
            <Text style={styles.searchGroupLabel}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchCatScroll}>
              {searchResults.categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.searchCatItem}
                  onPress={() => { clearSearch(); handleCategoryPress(cat); }}
                  activeOpacity={0.75}
                >
                  <View style={styles.searchCatImgWrap}>
                    <Image
                      source={{ uri: categoryImages[cat.id] || `https://via.placeholder.com/56?text=${encodeURIComponent(cat.name || "G")}` }}
                      style={styles.searchCatImg}
                    />
                  </View>
                  <Text style={styles.searchCatLabel} numberOfLines={2}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {hasSubCats && (
          <View style={{ marginTop: hasCategories ? 8 : 0 }}>
            <Text style={styles.searchGroupLabel}>Sub-Categories</Text>
            <View style={styles.searchSubChipRow}>
              {searchResults.subCategories.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.searchSubChip}
                  onPress={() => { clearSearch(); handleSubCategoryPress(s); }}
                  activeOpacity={0.75}
                >
                  <Image
                    source={{ uri: subCategoryImages[s.id] || `https://via.placeholder.com/22?text=G` }}
                    style={styles.subChipImg}
                  />
                  <Text style={styles.searchSubChipText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {hasProducts && (
          <View style={{ marginTop: (hasCategories || hasSubCats) ? 12 : 0 }}>
            <Text style={styles.searchGroupLabel}>Products ({searchResults.products.length})</Text>
            <View style={styles.grid}>
              {searchResults.products.slice(0, 6).map((item) => (
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

  // ── All Categories Grid ────────────────────────────────────────────────────
  const renderCategoriesGrid = () => {
    if (loading.categories) {
      return (
        <View style={styles.categoryGrid}>
          {[1, 2, 3, 4].map((i) => (
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
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryGridItem}
            onPress={() => handleCategoryPress(cat)}
            activeOpacity={0.75}
          >
            <View style={styles.categoryCard}>
              <View style={styles.categoryCardImgWrap}>
                <View style={styles.categoryCardGlow} />
                <Image
                  source={{ uri: categoryImages[cat.id] || `https://via.placeholder.com/80?text=${encodeURIComponent(cat.name || "G")}` }}
                  style={styles.categoryCardImg}
                  onError={() =>
                    setCategoryImages((prev) => ({ ...prev, [cat.id]: `https://via.placeholder.com/80?text=${encodeURIComponent(cat.name || "G")}` }))
                  }
                />
              </View>
              <Text style={styles.categoryCardLabel} numberOfLines={2}>{cat.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Subcategories Grid ────────────────────────────────────────────────────
  const renderSubCategoriesGrid = () => {
    if (loading.subCategories) {
      return (
        <View style={styles.categoryGrid}>
          {[1, 2, 3, 4].map((i) => (
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
          <Text style={styles.emptyTitle}>No Sub-categories found</Text>
          <Text style={styles.emptySubtitle}>Try a different category</Text>
        </View>
      );
    }

    return (
      <View style={styles.categoryGrid}>
        {subCategories.map((sub) => (
          <TouchableOpacity
            key={sub.id}
            style={styles.categoryGridItem}
            onPress={() => handleSubCategoryPress(sub)}
            activeOpacity={0.75}
          >
            <View style={styles.categoryCard}>
              <View style={styles.categoryCardImgWrap}>
                <View style={styles.categoryCardGlow} />
                <Image
                  source={{ uri: subCategoryImages[sub.id] || `https://via.placeholder.com/80?text=${encodeURIComponent(sub.name || "G")}` }}
                  style={styles.categoryCardImg}
                  onError={() =>
                    setSubCategoryImages((prev) => ({ ...prev, [sub.id]: `https://via.placeholder.com/80?text=${encodeURIComponent(sub.name || "G")}` }))
                  }
                />
              </View>
              <Text style={styles.categoryCardLabel} numberOfLines={2}>{sub.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Products Grid — FIXED ─────────────────────────────────────────────────
  const renderProductsGrid = () => {
    // ── Loading skeleton ────────────────────────────────────────────────────
    if (loading.products) {
      return (
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.gridItem}>
              {/* FIX: outer card wrapper mimics ProductCard shape */}
              <View style={styles.productShimmerCard}>
                {/* image area */}
                <ShimmerBox width="100%" height={160} borderRadius={0} />
                {/* wishlist icon placeholder */}
                <View style={styles.productShimmerHeartWrap}>
                  <ShimmerBox width={28} height={28} borderRadius={14} />
                </View>
                {/* text block */}
                <View style={styles.productShimmerBody}>
                  <ShimmerBox width="78%" height={11} borderRadius={4} />
                  <ShimmerBox width="52%" height={11} borderRadius={4} style={{ marginTop: 6 }} />
                  <ShimmerBox width="40%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
                  {/* add-to-cart button placeholder */}
                  <ShimmerBox width="100%" height={34} borderRadius={10} style={{ marginTop: 12 }} />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }

    // ── Empty state ─────────────────────────────────────────────────────────
    if (!totalProducts) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Products Found ☹️</Text>
          <Text style={styles.emptySubtitle}>Try a different sub-category</Text>
        </View>
      );
    }

    // ── Products + summary row ──────────────────────────────────────────────
    return (
      <>
        {/* FIX: small summary row — "Showing X of Y products" */}
        <View style={styles.productsSummaryRow}>
          <Text style={styles.productsSummaryText}>
            Showing{" "}
            <Text style={styles.productsSummaryBold}>
              {visibleProducts.length}
            </Text>{" "}
            of{" "}
            <Text style={styles.productsSummaryBold}>{totalProducts}</Text>{" "}
            products
          </Text>
        </View>

        {/* Product grid */}
        <View style={styles.grid}>
          {visibleProducts.map((item) => (
            <View key={item?.id} style={styles.gridItem}>
              <ProductCard
                product={item}
                isInWishlist={!!wishlistMap[String(item?.id)]}
                onWishlistToggle={() => handleWishlistToggle(item)}
                onPress={() =>
                  navigation.navigate("PgProductDetails", {
                    productId: item?.id,
                    product: item,
                  })
                }
              />
            </View>
          ))}
        </View>

        {/* FIX: "View All" button now correctly expands the list in-place,
                  and "Show Less" collapses it back */}
        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => {
              setShowAllProducts(true);
              // Scroll down a little so user sees the newly revealed cards
              setTimeout(() => scrollViewRef.current?.scrollTo({ y: 600, animated: true }), 80);
            }}
            activeOpacity={0.78}
          >
            <Text style={styles.loadMoreText}>View All {totalProducts} Products</Text>
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
  return (
    <PgLayout title="GoldMart" showBack={false}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SEARCH BAR — always visible on top                            */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Animated.View style={[styles.searchBarWrap, { borderColor: searchBorderColor }]}>
          <Text style={styles.searchIcon}>🔍</Text>
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
              <Text style={styles.searchClearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SEARCH RESULTS (when query is active)                         */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {isSearchActive ? (
          renderSearchResults()
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════ */}
            {/* HOME VIEW — banner + trust + categories                   */}
            {/* ══════════════════════════════════════════════════════════ */}
            {viewMode === "categories" && (
              <>
                {/* Banner Carousel */}
                <Animated.View style={[styles.bannerCarouselWrap, { opacity: heroAnim, transform: [{ translateY: heroTranslate }] }]}>
                  <ScrollView
                    ref={bannerScrollRef}
                    horizontal
                    pagingEnabled
                    scrollEventThrottle={16}
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
                    {/* Slide 1 */}
                    <View style={styles.bannerSlide}>
                      <View style={styles.ringLarge} />
                      <View style={styles.ringSmall} />
                      <View style={styles.ringTiny} />
                      <View style={styles.goldGlowBlob} />
                      <View style={styles.heroLeft}>
                        <View style={styles.heroPill}>
                          <View style={styles.heroPillDot} />
                          <Text style={styles.heroPillText}>CERTIFIED PURE GOLD</Text>
                        </View>
                        <Text style={styles.heroTitle}>Buy Real{"\n"}Physical Gold</Text>
                        <Text style={styles.heroSubtitle}>BIS Hallmarked · Delivered to your door</Text>
                        <TouchableOpacity
                          style={styles.heroCTA}
                          onPress={() => scrollViewRef.current?.scrollTo({ y: 400, animated: true })}
                          activeOpacity={0.78}
                        >
                          <Text style={styles.heroCTAText}>Shop Now</Text>
                          <View style={styles.heroCTAArrowWrap}>
                            <Text style={styles.heroCTAArrow}>→</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.heroRight}>
                        <Animated.View style={[styles.coinOuter, { transform: [{ scale: coinPulse }] }]}>
                          <View style={styles.coinInner}>
                            <Text style={styles.coinKarat}>24K</Text>
                            <View style={styles.coinLine} />
                            <Text style={styles.coinPurity}>999.9</Text>
                            <Text style={styles.coinPure}>PURE</Text>
                          </View>
                        </Animated.View>
                        <Text style={styles.coinLabel}>GOLD</Text>
                      </View>
                    </View>

                    {/* Slide 2 */}
                    <View style={styles.bannerSlideDigital}>
                      <View style={styles.ringLargeD} />
                      <View style={styles.ringSmallD} />
                      <View style={styles.ringTinyD} />
                      <View style={styles.digitalGlowBlob} />
                      <View style={styles.heroLeft}>
                        <View style={styles.heroPillDigital}>
                          <View style={styles.heroPillDotDigital} />
                          <Text style={styles.heroPillTextDigital}>START INVESTING</Text>
                        </View>
                        <Text style={styles.heroTitleDigital}>Try Digital{"\n"}Gold</Text>
                        <Text style={styles.heroSubtitleDigital}>Start from ₹100 · Buy, sell anytime</Text>
                        <TouchableOpacity style={styles.heroCTADigital} onPress={() => navigation.navigate("HowItWorks")} activeOpacity={0.78}>
                          <Text style={styles.heroCTATextDigital}>Explore</Text>
                          <View style={styles.heroCTAArrowWrapDigital}>
                            <Text style={styles.heroCTAArrowDigital}>→</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.heroRight}>
                        <Animated.View style={[styles.coinOuterDigital, { transform: [{ scale: coinPulse }] }]}>
                          <View style={styles.coinInnerDigital}>
                            <Text style={styles.coinKaratDigital}>24K</Text>
                            <View style={styles.coinLineDigital} />
                            <Text style={styles.coinPurityDigital}>999.9</Text>
                            <Text style={styles.coinPureDigital}>PURE</Text>
                          </View>
                        </Animated.View>
                        <Text style={styles.coinLabelDigital}>DIGITAL</Text>
                      </View>
                    </View>
                  </ScrollView>

                  {/* Indicators */}
                  <View style={styles.indicatorRow}>
                    {[0, 1].map((i) => (
                      <TouchableOpacity key={i} onPress={() => setCurrentBannerIndex(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
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

                {/* All Categories Header */}
                <SectionHeader title="Categories" count={categories.length > 0 ? categories.length : null} />

                {/* All Categories Grid */}
                {renderCategoriesGrid()}

                {/* Digital Gold Bottom Banner */}
                <TouchableOpacity style={styles.digitalBanner} onPress={() => navigation.navigate("Dashboard")} activeOpacity={0.82}>
                  <View style={styles.digitalBannerGlow} />
                  <View style={styles.digitalBannerLeft}>
                    <View style={styles.digitalIconWrap}>
                      <Text style={styles.digitalIconText}>DG</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.digitalTitle}>Try Digital Gold</Text>
                      <Text style={styles.digitalSubtitle}>Start from ₹100 · Buy, sell anytime</Text>
                    </View>
                  </View>
                  <View style={styles.digitalCTA}>
                    <Text style={styles.digitalCTAText}>Explore</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* SUBCATEGORIES VIEW                                        */}
            {/* ══════════════════════════════════════════════════════════ */}
            {viewMode === "subcategories" && (
              <>
                <SectionHeader
                  title={activeCategoryName || "Sub-Categories"}
                  count={!loading.subCategories && subCategories.length > 0 ? subCategories.length : null}
                  showBack
                  onBack={handleBackToCategories}
                />
                {renderSubCategoriesGrid()}
              </>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* PRODUCTS VIEW                                             */}
            {/* ══════════════════════════════════════════════════════════ */}
            {viewMode === "products" && (
              <>
                {/* Breadcrumb path */}
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
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Toast */}
      {wishlistToast.visible && (
        <Animated.View style={[styles.toast, wishlistToast.added ? styles.toastAdded : styles.toastRemoved, { bottom: Platform.OS === "ios" ? 110 : 90 }]}>
          <Text style={styles.toastText}>{wishlistToast.added ? "❤️" : "💔"} {wishlistToast.text}</Text>
        </Animated.View>
      )}
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40, backgroundColor: "#F5F3EE" },

  // ── Search Bar ───────────────────────────────────────────────────────────────
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: C.bgCard,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    gap: 10,
    shadowColor: C.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },
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

  // ── Search Results ────────────────────────────────────────────────────────────
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
    backgroundColor: "#F0EDE6",
    borderWidth: 1.5,
    borderColor: C.goldBorder,
    overflow: "hidden",
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  searchCatImg: { width: 56, height: 56, borderRadius: 28, resizeMode: "contain" },
  searchCatLabel: { fontSize: 10, fontWeight: "600", color: C.textSecondary, textAlign: "center", lineHeight: 13 },
  searchSubChipRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  searchSubChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.goldBorder,
    gap: 7,
  },
  searchSubChipText: { fontSize: 12, fontWeight: "600", color: C.goldText },
  searchEmptyState: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 },
  searchEmptyIcon: { fontSize: 36, marginBottom: 16 },
  searchEmptyTitle: { fontSize: 16, fontWeight: "700", color: C.textPrimary, marginBottom: 6 },
  searchEmptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },

  // ── Banner Carousel ───────────────────────────────────────────────────────────
  bannerCarouselWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
  },
  bannerSlide: {
    width: BANNER_WIDTH,
    backgroundColor: "#1C2340",
    borderRadius: 24,
    padding: 26,
    paddingTop: 28,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.22)",
    overflow: "hidden",
    minHeight: 190,
  },
  ringLarge: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: "rgba(212,168,67,0.07)", right: -80, top: -90 },
  ringSmall: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: "rgba(212,168,67,0.06)", right: -20, top: -20 },
  ringTiny: { position: "absolute", width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: "rgba(212,168,67,0.09)", right: 38, bottom: 20 },
  goldGlowBlob: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(212,168,67,0.04)", right: -30, top: -40 },

  bannerSlideDigital: {
    width: BANNER_WIDTH,
    backgroundColor: "#13100A",
    borderRadius: 24,
    padding: 26,
    paddingTop: 28,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.30)",
    overflow: "hidden",
    minHeight: 190,
  },
  ringLargeD: { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: "rgba(212,168,67,0.10)", right: -70, top: -80 },
  ringSmallD: { position: "absolute", width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: "rgba(212,168,67,0.08)", right: -10, top: -10 },
  ringTinyD: { position: "absolute", width: 65, height: 65, borderRadius: 32, borderWidth: 1, borderColor: "rgba(212,168,67,0.12)", right: 40, bottom: 22 },
  digitalGlowBlob: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(212,168,67,0.05)", right: -25, top: -50 },

  heroLeft: { flex: 1, zIndex: 2 },
  heroPill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(212,168,67,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 14, borderWidth: 1, borderColor: "rgba(212,168,67,0.28)" },
  heroPillDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.goldBright, marginRight: 6 },
  heroPillText: { fontSize: 9, fontWeight: "800", color: C.goldText, letterSpacing: 1.3 },
  heroPillDigital: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(212,168,67,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 14, borderWidth: 1, borderColor: "rgba(212,168,67,0.30)" },
  heroPillDotDigital: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#D4A843", marginRight: 6 },
  heroPillTextDigital: { fontSize: 9, fontWeight: "800", color: "#D4A843", letterSpacing: 1.3 },
  heroTitle: { fontSize: 27, fontWeight: "900", color: "#FFFFFF", lineHeight: 33, marginBottom: 8, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.38)", marginBottom: 22, lineHeight: 18 },
  heroTitleDigital: { fontSize: 27, fontWeight: "900", color: "#FFFFFF", lineHeight: 33, marginBottom: 8, letterSpacing: -0.5 },
  heroSubtitleDigital: { fontSize: 12, color: "rgba(255,255,255,0.40)", marginBottom: 22, lineHeight: 18 },
  heroCTA: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#D4A843", borderRadius: 14, paddingLeft: 16, paddingRight: 6, paddingVertical: 9, gap: 8 },
  heroCTAText: { fontSize: 13, fontWeight: "800", color: "#1C2340" },
  heroCTAArrowWrap: { width: 26, height: 26, borderRadius: 10, backgroundColor: "rgba(28,35,64,0.15)", justifyContent: "center", alignItems: "center" },
  heroCTAArrow: { fontSize: 14, fontWeight: "700", color: "#1C2340" },
  heroCTADigital: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#D4A843", borderRadius: 14, paddingLeft: 16, paddingRight: 6, paddingVertical: 9, gap: 8 },
  heroCTATextDigital: { fontSize: 13, fontWeight: "800", color: "#13100A" },
  heroCTAArrowWrapDigital: { width: 26, height: 26, borderRadius: 10, backgroundColor: "rgba(19,16,10,0.18)", justifyContent: "center", alignItems: "center" },
  heroCTAArrowDigital: { fontSize: 14, fontWeight: "700", color: "#13100A" },
  heroRight: { alignItems: "center", marginLeft: 16, zIndex: 2 },
  coinOuter: { width: 86, height: 86, borderRadius: 43, backgroundColor: "#2A3158", borderWidth: 2, borderColor: "#D4A843", padding: 5, shadowColor: "#D4A843", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  coinInner: { flex: 1, borderRadius: 38, backgroundColor: "#D4A843", justifyContent: "center", alignItems: "center" },
  coinKarat: { fontSize: 22, fontWeight: "900", color: "#1C2340", lineHeight: 24 },
  coinLine: { width: 32, height: 1.5, backgroundColor: "rgba(28,35,64,0.35)", marginVertical: 3 },
  coinPurity: { fontSize: 11, fontWeight: "800", color: "#1C2340", lineHeight: 13 },
  coinPure: { fontSize: 7.5, fontWeight: "700", color: "rgba(28,35,64,0.55)", letterSpacing: 1.8, marginTop: 2 },
  coinLabel: { fontSize: 9, fontWeight: "800", color: "#D4A843", letterSpacing: 2.5, marginTop: 8 },
  coinOuterDigital: { width: 86, height: 86, borderRadius: 43, backgroundColor: "#1E1810", borderWidth: 2, borderColor: "#D4A843", padding: 5, shadowColor: "#D4A843", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  coinInnerDigital: { flex: 1, borderRadius: 38, backgroundColor: "#D4A843", justifyContent: "center", alignItems: "center" },
  coinKaratDigital: { fontSize: 22, fontWeight: "900", color: "#13100A", lineHeight: 24 },
  coinLineDigital: { width: 32, height: 1.5, backgroundColor: "rgba(19,16,10,0.35)", marginVertical: 3 },
  coinPurityDigital: { fontSize: 11, fontWeight: "800", color: "#13100A", lineHeight: 13 },
  coinPureDigital: { fontSize: 7.5, fontWeight: "700", color: "rgba(19,16,10,0.55)", letterSpacing: 1.8, marginTop: 2 },
  coinLabelDigital: { fontSize: 9, fontWeight: "800", color: "#D4A843", letterSpacing: 2.5, marginTop: 8 },

  // ── Carousel Indicators ───────────────────────────────────────────────────────
  indicatorRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingTop: 10, paddingBottom: 4, backgroundColor: "#F5F3EE" },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(184,134,11,0.22)" },
  indicatorActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: C.goldBright },

  // ── Trust Strip ───────────────────────────────────────────────────────────────
  trustStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 22,
    backgroundColor: C.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadowDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  trustItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  trustLabel: { fontSize: 9, fontWeight: "700", color: C.textSecondary, textAlign: "center", lineHeight: 13 },
  trustDivider: { width: 1, height: 22, backgroundColor: C.border },

  // ── Section Header ────────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionAccentGroup: { flexDirection: "column", gap: 3, alignItems: "center" },
  sectionAccentTall: { width: 3, height: 14, borderRadius: 2, backgroundColor: C.gold },
  sectionAccentShort: { width: 3, height: 6, borderRadius: 2, backgroundColor: "rgba(212,168,67,0.35)" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, letterSpacing: -0.3 },
  countPill: { backgroundColor: C.goldMuted, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: C.goldBorder },
  countPillText: { fontSize: 11, fontWeight: "700", color: C.goldText },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4 },
  viewAllText: { fontSize: 13, fontWeight: "700", color: C.gold },
  viewAllArrow: { fontSize: 20, color: C.goldBright, lineHeight: 22 },

  // ── Back Button ───────────────────────────────────────────────────────────────
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.goldBorder,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.shadowDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  backBtnText: { fontSize: 22, color: C.gold, lineHeight: 26, marginTop: -2 },

  // ── Breadcrumb ────────────────────────────────────────────────────────────────
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 2,
    flexWrap: "wrap",
    gap: 2,
  },
  breadcrumbLink: { fontSize: 11, color: C.gold, fontWeight: "600" },
  breadcrumbSep: { fontSize: 13, color: C.textMuted, marginHorizontal: 2 },
  breadcrumbCurrent: { fontSize: 11, color: C.textSecondary, fontWeight: "700" },

  // ── Category / Subcategory Grid ────────────────────────────────────────────────
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  categoryGridItem: { width: "50%", padding: 6 },
  categoryCard: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryCardShimmer: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryCardImgWrap: {
    width: "100%",
    height: 220,
    backgroundColor: "#F0EDE6",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  categoryCardGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(212,168,67,0.06)",
  },
  categoryCardImg: { width: "100%", height: "100%", resizeMode: "cover" },
  categoryCardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    lineHeight: 17,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  // ── Sub-chip (for search results) ─────────────────────────────────────────────
  subChipImg: { width: 22, height: 22, borderRadius: 11, resizeMode: "cover" },

  // ── Products Grid ─────────────────────────────────────────────────────────────
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    // FIX: slightly more generous outer padding so cards don't crowd the edges
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  gridItem: {
    width: "50%",
    // FIX: increased from 5 → 6 so cards have a visible gap between them
    padding: 6,
  },

  // ── Product shimmer — FIXED to better mirror ProductCard dimensions ────────────
  productShimmerCard: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    // Give the shimmer a realistic min-height so there's no layout jump
    minHeight: 280,
  },
  productShimmerHeartWrap: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  productShimmerBody: {
    padding: 12,
  },

  // ── Products summary row ──────────────────────────────────────────────────────
  productsSummaryRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: -4,
  },
  productsSummaryText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
  },
  productsSummaryBold: {
    color: C.goldText,
    fontWeight: "700",
  },

  // ── Load More ─────────────────────────────────────────────────────────────────
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
    borderColor: C.goldBorder,
    shadowColor: C.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  },
  loadMoreText: { fontSize: 14, fontWeight: "700", color: C.goldText },
  loadMoreArrow: { fontSize: 20, color: C.goldBright, lineHeight: 22 },

  // ── Collapse / Show Less button ───────────────────────────────────────────────
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
  collapseBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
  },

  // ── Empty State ───────────────────────────────────────────────────────────────
  emptyState: { alignItems: "center", paddingVertical: 52, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.textPrimary, marginBottom: 5 },
  emptySubtitle: { fontSize: 12, color: C.textMuted },

  // ── Digital Gold Bottom Banner ────────────────────────────────────────────────
  digitalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: "#1C2340",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.22)",
    overflow: "hidden",
    shadowColor: "rgba(28,35,64,0.18)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  digitalBannerGlow: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(212,168,67,0.05)", top: -60, right: 0 },
  digitalBannerLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  digitalIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(212,168,67,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(212,168,67,0.22)" },
  digitalIconText: { fontSize: 12, fontWeight: "900", color: "#E8C97A", letterSpacing: 0.8 },
  digitalTitle: { fontSize: 14, fontWeight: "800", color: "#E8C97A", marginBottom: 3 },
  digitalSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  digitalCTA: { backgroundColor: "#D4A843", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  digitalCTAText: { fontSize: 12, fontWeight: "800", color: "#1C2340" },

  // ── Toast ─────────────────────────────────────────────────────────────────────
  toast: { position: "absolute", alignSelf: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, zIndex: 99, elevation: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12 },
  toastAdded: { backgroundColor: "#065F46" },
  toastRemoved: { backgroundColor: "#7F1D1D" },
  toastText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

export default PgHomeScreen;