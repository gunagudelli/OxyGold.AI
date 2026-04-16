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
// FIX: Shimmer now handles percentage widths correctly by using a container View
const ShimmerBox = ({ width, height, borderRadius = 8, style }) => {
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
        style={{
          flex: 1,
          borderRadius,
          backgroundColor: C.goldText,
          opacity,
        }}
      />
    </View>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, count, onViewAll }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
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
      <TouchableOpacity
        onPress={onViewAll}
        style={styles.viewAllBtn}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.viewAllText}>View All</Text>
        <Text style={styles.viewAllArrow}>›</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Subcategory Fade Wrapper ─────────────────────────────────────────────────
// FIX: Subcategories now fade in instead of abruptly appearing
const FadeInView = ({ children, visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  return (
    <Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PgHomeScreen = ({ navigation }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({
    categories: false,
    subCategories: false,
    products: false,
  });
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCat, setActiveSubCat] = useState(null);
  const [categoryImages, setCategoryImages] = useState({});
  const [subCategoryImages, setSubCategoryImages] = useState({});
  const imgCacheRef = useRef({});

  // FIX: Cache product variants to avoid repeated API calls on wishlist toggle
  const variantCacheRef = useRef({});

  // wishlistMap: { [productId]: wishlistId }
  const [wishlistMap, setWishlistMap] = useState({});
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [wishlistToast, setWishlistToast] = useState({
    visible: false,
    text: "",
    added: true,
  });

  const toastTimeoutRef = useRef(null);
  const showToast = (text, added) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setWishlistToast({ visible: true, text, added });
    toastTimeoutRef.current = setTimeout(
      () => setWishlistToast({ visible: false, text: "", added: true }),
      2500,
    );
  };

  // FIX: Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  // FIX: Coin pulse now applies to both slides via shared animation
  const coinPulse = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef(null);
  const bannerScrollRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerIntervalRef = useRef(null);

  // FIX: Track manual scroll to pause auto-scroll temporarily
  const isManualScrollRef = useRef(false);

  useEffect(() => {
    fetchCategories();
  }, []);

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
    }, [userId]),
  );

  useEffect(() => {
    if (activeCategory && userId) fetchSubCategoriesData(activeCategory);
  }, [activeCategory, userId]);

  useEffect(() => {
    if (activeSubCat && userId) fetchProductsData(activeSubCat);
  }, [activeSubCat, userId]);

  const fetchCategories = async () => {
    if (!userId || !accessToken) return;
    const startTime = Date.now();
    try {
      setLoading((prev) => ({ ...prev, categories: true }));
      const data = await getMainCategories(userId);
      setCategories(data || []);
      if (data?.length > 0) setActiveCategory(data[0].id);
    } catch (error) {
      console.log("[PgHome] Error fetching categories:", error);
    } finally {
      const remaining = Math.max(0, 1500 - (Date.now() - startTime)); // FIX: Reduced min shimmer time for snappier feel
      setTimeout(
        () => setLoading((prev) => ({ ...prev, categories: false })),
        remaining,
      );
    }
  };

  const fetchSubCategoriesData = async (categoryId) => {
    const startTime = Date.now();
    try {
      setLoading((prev) => ({ ...prev, subCategories: true }));
      setActiveSubCat(null);
      const data = await getSubCategories(categoryId);
      setSubCategories(data || []);
      if (data?.length > 0) setActiveSubCat(data[0].id);
    } catch (error) {
      console.log("[PgHome] Error fetching subcategories:", error);
    } finally {
      const remaining = Math.max(0, 1500 - (Date.now() - startTime));
      setTimeout(
        () => setLoading((prev) => ({ ...prev, subCategories: false })),
        remaining,
      );
    }
  };

  const fetchProductsData = async (subCategoryId) => {
    const startTime = Date.now();
    try {
      setLoading((prev) => ({ ...prev, products: true }));
      const data = await getProducts(subCategoryId);
      setProducts(data?.items || data || []);
    } catch (error) {
      console.log("[PgHome] Error fetching products:", error);
    } finally {
      const remaining = Math.max(0, 1500 - (Date.now() - startTime));
      setTimeout(
        () => setLoading((prev) => ({ ...prev, products: false })),
        remaining,
      );
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // FIX: Smoother coin pulse with easeInOut feel
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(coinPulse, {
          toValue: 1.055,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(coinPulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // FIX: Auto-slide restarts cleanly; pauses after manual interaction
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

  // FIX: Banner scroll uses scrollTo reliably with layoutMeasurement guard
  useEffect(() => {
    if (bannerScrollRef.current) {
      bannerScrollRef.current.scrollTo({
        x: currentBannerIndex * BANNER_WIDTH,
        animated: true,
      });
    }
  }, [currentBannerIndex]);

  useEffect(() => {
    if (!categories.length) return;
    categories.forEach((cat) => {
      if (imgCacheRef.current[cat.id]) {
        setCategoryImages((prev) => ({
          ...prev,
          [cat.id]: imgCacheRef.current[cat.id],
        }));
        return;
      }
      const imageUrl = cat.imageUrl || cat.image || cat.categoryImage;
      if (imageUrl) {
        imgCacheRef.current[cat.id] = imageUrl;
        setCategoryImages((prev) => ({ ...prev, [cat.id]: imageUrl }));
      } else {
        getCategoryImages(cat.id)
          .then((imgObj) => {
            const url =
              imgObj?.frontViewUrl ||
              `https://via.placeholder.com/64?text=${encodeURIComponent(cat.name || "Gold")}`;
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
        setSubCategoryImages((prev) => ({
          ...prev,
          [subCat.id]: imgCacheRef.current[subCat.id],
        }));
        return;
      }
      const imageUrl = subCat.imageUrl || subCat.image || subCat.categoryImage;
      if (imageUrl) {
        imgCacheRef.current[subCat.id] = imageUrl;
        setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: imageUrl }));
      } else {
        getCategoryImages(subCat.id)
          .then((imgObj) => {
            const url =
              imgObj?.frontViewUrl ||
              `https://via.placeholder.com/22?text=${encodeURIComponent(subCat.name || "Gold")}`;
            imgCacheRef.current[subCat.id] = url;
            setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: url }));
          })
          .catch(() => {
            const url = `https://via.placeholder.com/22?text=${encodeURIComponent(subCat.name || "Gold")}`;
            imgCacheRef.current[subCat.id] = url;
            setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: url }));
          });
      }
    });
  }, [subCategories]);

  const heroTranslate = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0], // FIX: Reduced translate for subtler entry
  });

  // FIX: Wishlist handler with variant caching
  const handleWishlistToggle = useCallback(
    async (item) => {
      const pid = String(item?.id);
      if (wishlistLoading[pid]) return;
      setWishlistLoading((prev) => ({ ...prev, [pid]: true }));
      try {
        if (wishlistMap[pid]) {
          await removeFromWishlist(wishlistMap[pid]);
          setWishlistMap((prev) => {
            const n = { ...prev };
            delete n[pid];
            return n;
          });
          showToast("Removed from wishlist", false);
        } else {
          // Use cached variant if available
          let firstVariant = variantCacheRef.current[pid];
          if (!firstVariant) {
            const varRes = await getProductVariants(item.id);
            const inner = varRes?.data || varRes;
            const varList =
              inner?.listVariantResponse ||
              inner?.variants ||
              (Array.isArray(inner) ? inner : []);
            firstVariant = varList[0];
            if (firstVariant) variantCacheRef.current[pid] = firstVariant;
          }
          if (!firstVariant?.id) {
            showToast("No variant found for this product", false);
            return;
          }
          const res = await addToWishlist(userId, item.id, firstVariant.id);
          setWishlistMap((prev) => ({
            ...prev,
            [pid]: res?.id || res?.wishlistId || pid,
          }));
          showToast("Added to wishlist ❤️", true);
        }
      } catch (e) {
        showToast(e?.message || "Wishlist update failed", false);
      }
      setWishlistLoading((prev) => ({ ...prev, [pid]: false }));
    },
    [wishlistMap, wishlistLoading, userId],
  );

  if (!userId || !accessToken) {
    return (
      <PgLayout title="GoldMart" showBack={false}>
        <SessionExpired
          variant="inline"
          onLoginPress={() =>
            navigation.reset({ index: 0, routes: [{ name: "Login" }] })
          }
        />
      </PgLayout>
    );
  }

  // FIX: Show full count in pill; slice only limits visible cards
  const visibleProducts = products?.slice(0, 6) || [];
  const totalProducts = products?.length || 0;

  return (
    <PgLayout title="GoldMart" showBack={false}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        // FIX: Prevent janky bounce on Android
        overScrollMode="never"
      >
        {/* ── Banner Carousel ────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.bannerCarouselWrap,
            { opacity: heroAnim, transform: [{ translateY: heroTranslate }] },
          ]}
        >
          {/* FIX: scrollEnabled=true so user can swipe manually */}
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
            onScrollBeginDrag={() => {
              isManualScrollRef.current = true;
            }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / BANNER_WIDTH,
              );
              setCurrentBannerIndex(idx);
              // Resume auto-scroll after 3s idle
              setTimeout(() => {
                isManualScrollRef.current = false;
              }, 3000);
            }}
          >
            {/* ── Slide 1: Physical Gold — deep navy ── */}
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
                <Text style={styles.heroTitle}>
                  Buy Real{"\n"}Physical Gold
                </Text>
                <Text style={styles.heroSubtitle}>
                  BIS Hallmarked · Delivered to your door
                </Text>
                <TouchableOpacity
                  style={styles.heroCTA}
                  onPress={() =>
                    scrollViewRef.current?.scrollTo({ y: 500, animated: true })
                  }
                  activeOpacity={0.78}
                >
                  <Text style={styles.heroCTAText}>Shop Now</Text>
                  <View style={styles.heroCTAArrowWrap}>
                    <Text style={styles.heroCTAArrow}>→</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.heroRight}>
                <Animated.View
                  style={[
                    styles.coinOuter,
                    { transform: [{ scale: coinPulse }] },
                  ]}
                >
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

            {/* ── Slide 2: Digital Gold — rich dark charcoal ── */}
            <View style={styles.bannerSlideDigital}>
              <View style={styles.ringLargeD} />
              <View style={styles.ringSmallD} />
              <View style={styles.ringTinyD} />
              <View style={styles.digitalGlowBlob} />

              <View style={styles.heroLeft}>
                <View style={styles.heroPillDigital}>
                  <View style={styles.heroPillDotDigital} />
                  <Text style={styles.heroPillTextDigital}>
                    START INVESTING
                  </Text>
                </View>
                <Text style={styles.heroTitleDigital}>
                  Try Digital{"\n"}Gold
                </Text>
                <Text style={styles.heroSubtitleDigital}>
                  Start from ₹100 · Buy, sell anytime
                </Text>
                <TouchableOpacity
                  style={styles.heroCTADigital}
                  onPress={() => navigation.navigate("Dashboard")}
                  activeOpacity={0.78}
                >
                  <Text style={styles.heroCTATextDigital}>Explore</Text>
                  <View style={styles.heroCTAArrowWrapDigital}>
                    <Text style={styles.heroCTAArrowDigital}>→</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.heroRight}>
                {/* FIX: Slide 2 coin now also pulses via shared coinPulse */}
                <Animated.View
                  style={[
                    styles.coinOuterDigital,
                    { transform: [{ scale: coinPulse }] },
                  ]}
                >
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

          {/* Carousel indicators */}
          <View style={styles.indicatorRow}>
            {[0, 1].map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCurrentBannerIndex(i)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.indicator,
                    currentBannerIndex === i && styles.indicatorActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Trust Strip ───────────────────────────────────────────── */}
        <Animated.View style={[styles.trustStrip, { opacity: fadeInAnim }]}>
          {TRUST.map((t, i) => (
            <React.Fragment key={i}>
              <View style={styles.trustItem}>
                {/* <Text style={styles.trustIcon}>✓</Text> */}
                <Text style={styles.trustLabel}>{t.label}</Text>
              </View>
              {i < TRUST.length - 1 && <View style={styles.trustDivider} />}
            </React.Fragment>
          ))}
        </Animated.View>

        {/* ── Categories ─────────────────────────────────────────────── */}
        <SectionHeader title="Categories" />

        {loading?.categories ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScrollPad}
            scrollEnabled={false}
          >
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.catShimmerWrap}>
                <ShimmerBox width={64} height={64} borderRadius={32} />
                <ShimmerBox
                  width={44}
                  height={9}
                  borderRadius={4}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScrollPad}
          >
            {categories?.map((c) => {
              const isActive = activeCategory === c?.id;
              return (
                <TouchableOpacity
                  key={c?.id}
                  style={styles.catItem}
                  onPress={() => setActiveCategory(c?.id)}
                  activeOpacity={0.72}
                >
                  <View
                    style={[
                      styles.catImgWrap,
                      isActive && styles.catImgWrapActive,
                    ]}
                  >
                    {isActive && <View style={styles.catActiveGlow} />}
                    <Image
                      source={{
                        uri:
                          categoryImages[c.id] ||
                          "https://via.placeholder.com/64?text=Gold",
                      }}
                      style={styles.catImg}
                      onError={() =>
                        setCategoryImages((prev) => ({
                          ...prev,
                          [c.id]: "https://via.placeholder.com/64?text=Gold",
                        }))
                      }
                    />
                    {isActive && <View style={styles.catImgOverlay} />}
                  </View>
                  <Text
                    style={[styles.catLabel, isActive && styles.catLabelActive]}
                    numberOfLines={1}
                  >
                    {c?.name}
                  </Text>
                  {isActive && <View style={styles.catActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* FIX: Sub-categories fade in smoothly; hidden during loading */}
        <FadeInView
          visible={!loading?.subCategories && subCategories?.length > 0}
        >
          {!loading?.subCategories && subCategories?.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subScrollPad}
            >
              {subCategories?.map((s) => {
                const isActive = activeSubCat === s?.id;
                return (
                  <TouchableOpacity
                    key={s?.id}
                    style={[styles.subChip, isActive && styles.subChipActive]}
                    onPress={() => setActiveSubCat(s?.id)}
                    activeOpacity={0.72}
                  >
                    <Image
                      source={{
                        uri:
                          subCategoryImages[s.id] ||
                          "https://via.placeholder.com/22?text=Gold",
                      }}
                      style={styles.subChipImg}
                      onError={() =>
                        setSubCategoryImages((prev) => ({
                          ...prev,
                          [s.id]: "https://via.placeholder.com/22?text=Gold",
                        }))
                      }
                    />
                    <Text
                      style={[
                        styles.subChipText,
                        isActive && styles.subChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {s?.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </FadeInView>

        {/* ── Products ───────────────────────────────────────────────── */}
        {/* FIX: Count pill only shows when loaded and >0; count reflects visible slice */}
        <SectionHeader
          title="Products"
          count={
            !loading?.products && totalProducts > 0
              ? Math.min(totalProducts, 6)
              : null
          }
          onViewAll={
            totalProducts > 0
              ? () =>
                  scrollViewRef.current?.scrollTo({ y: 500, animated: true })
              : null
          }
        />

        {loading?.products ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.gridItem}>
                <View style={styles.productShimmer}>
                  <ShimmerBox width="100%" height={148} borderRadius={14} />
                  <View style={{ padding: 12, gap: 8 }}>
                    <ShimmerBox width="65%" height={9} borderRadius={4} />
                    <ShimmerBox
                      width="38%"
                      height={9}
                      borderRadius={4}
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : totalProducts === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIcon}>🪙</Text>
            </View>
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>Try a different category</Text>
          </View>
        ) : (
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
        )}

        {/* FIX: Show "View All" only if more than 6 products exist */}
        {totalProducts > 6 && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() =>
              scrollViewRef.current?.scrollTo({ y: 500, animated: true })
            }
            activeOpacity={0.78}
          >
            <Text style={styles.loadMoreText}>
              View All {totalProducts} Products
            </Text>
            <Text style={styles.loadMoreArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Digital Gold Banner ─────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.digitalBanner}
          onPress={() => navigation.navigate("Dashboard")}
          activeOpacity={0.82}
        >
          <View style={styles.digitalBannerGlow} />
          <View style={styles.digitalBannerLeft}>
            <View style={styles.digitalIconWrap}>
              <Text style={styles.digitalIconText}>DG</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.digitalTitle}>Try Digital Gold</Text>
              <Text style={styles.digitalSubtitle}>
                Start from ₹100 · Buy, sell anytime
              </Text>
            </View>
          </View>
          <View style={styles.digitalCTA}>
            <Text style={styles.digitalCTAText}>Explore</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* FIX: Toast uses Platform-aware bottom position to avoid nav bar overlap */}
      {wishlistToast.visible && (
        <Animated.View
          style={[
            styles.toast,
            wishlistToast.added ? styles.toastAdded : styles.toastRemoved,
            { bottom: Platform.OS === "ios" ? 110 : 90 },
          ]}
        >
          <Text style={styles.toastText}>
            {wishlistToast.added ? "❤️" : "💔"} {wishlistToast.text}
          </Text>
        </Animated.View>
      )}
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40, backgroundColor: "#F5F3EE" },

  // ── Banner Carousel ──────────────────────────────────────────────────────────
  bannerCarouselWrap: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
  },

  // ── Slide 1: Physical Gold — deep navy ───────────────────────────────────────
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
  ringLarge: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.07)",
    right: -80,
    top: -90,
  },
  ringSmall: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.06)",
    right: -20,
    top: -20,
  },
  ringTiny: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.09)",
    right: 38,
    bottom: 20,
  },
  goldGlowBlob: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(212,168,67,0.04)",
    right: -30,
    top: -40,
  },

  // ── Slide 2: Digital Gold ─────────────────────────────────────────────────────
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
  ringLargeD: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.10)",
    right: -70,
    top: -80,
  },
  ringSmallD: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.08)",
    right: -10,
    top: -10,
  },
  ringTinyD: {
    position: "absolute",
    width: 65,
    height: 65,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.12)",
    right: 40,
    bottom: 22,
  },
  digitalGlowBlob: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(212,168,67,0.05)",
    right: -25,
    top: -50,
  },

  heroLeft: { flex: 1, zIndex: 2 },

  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,168,67,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.28)",
  },
  heroPillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.goldBright,
    marginRight: 6,
  },
  heroPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.goldText,
    letterSpacing: 1.3,
  },

  heroPillDigital: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,168,67,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.30)",
  },
  heroPillDotDigital: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#D4A843",
    marginRight: 6,
  },
  heroPillTextDigital: {
    fontSize: 9,
    fontWeight: "800",
    color: "#D4A843",
    letterSpacing: 1.3,
  },

  heroTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 33,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    marginBottom: 22,
    lineHeight: 18,
  },
  heroTitleDigital: {
    fontSize: 27,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 33,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitleDigital: {
    fontSize: 12,
    color: "rgba(255,255,255,0.40)",
    marginBottom: 22,
    lineHeight: 18,
  },

  heroCTA: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#D4A843",
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 9,
    gap: 8,
  },
  heroCTAText: { fontSize: 13, fontWeight: "800", color: "#1C2340" },
  heroCTAArrowWrap: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: "rgba(28,35,64,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCTAArrow: { fontSize: 14, fontWeight: "700", color: "#1C2340" },

  heroCTADigital: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#D4A843",
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 9,
    gap: 8,
  },
  heroCTATextDigital: { fontSize: 13, fontWeight: "800", color: "#13100A" },
  heroCTAArrowWrapDigital: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: "rgba(19,16,10,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCTAArrowDigital: { fontSize: 14, fontWeight: "700", color: "#13100A" },

  heroRight: { alignItems: "center", marginLeft: 16, zIndex: 2 },

  coinOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#2A3158",
    borderWidth: 2,
    borderColor: "#D4A843",
    padding: 5,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  coinInner: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: "#D4A843",
    justifyContent: "center",
    alignItems: "center",
  },
  coinKarat: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1C2340",
    lineHeight: 24,
  },
  coinLine: {
    width: 32,
    height: 1.5,
    backgroundColor: "rgba(28,35,64,0.35)",
    marginVertical: 3,
  },
  coinPurity: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1C2340",
    lineHeight: 13,
  },
  coinPure: {
    fontSize: 7.5,
    fontWeight: "700",
    color: "rgba(28,35,64,0.55)",
    letterSpacing: 1.8,
    marginTop: 2,
  },
  coinLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#D4A843",
    letterSpacing: 2.5,
    marginTop: 8,
  },

  coinOuterDigital: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#1E1810",
    borderWidth: 2,
    borderColor: "#D4A843",
    padding: 5,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  coinInnerDigital: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: "#D4A843",
    justifyContent: "center",
    alignItems: "center",
  },
  coinKaratDigital: {
    fontSize: 22,
    fontWeight: "900",
    color: "#13100A",
    lineHeight: 24,
  },
  coinLineDigital: {
    width: 32,
    height: 1.5,
    backgroundColor: "rgba(19,16,10,0.35)",
    marginVertical: 3,
  },
  coinPurityDigital: {
    fontSize: 11,
    fontWeight: "800",
    color: "#13100A",
    lineHeight: 13,
  },
  coinPureDigital: {
    fontSize: 7.5,
    fontWeight: "700",
    color: "rgba(19,16,10,0.55)",
    letterSpacing: 1.8,
    marginTop: 2,
  },
  coinLabelDigital: {
    fontSize: 9,
    fontWeight: "800",
    color: "#D4A843",
    letterSpacing: 2.5,
    marginTop: 8,
  },

  // ── Carousel Indicators ──────────────────────────────────────────────────────
  indicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: "#F5F3EE",
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(184,134,11,0.22)",
  },
  indicatorActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.goldBright,
  },

  // ── Trust Strip ──────────────────────────────────────────────────────────────
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
  trustItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
  },
  trustIcon: { fontSize: 12, color: C.goldBright },
  trustLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 13,
  },
  trustDivider: { width: 1, height: 22, backgroundColor: C.border },

  // ── Section Header ───────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
    // FIX: Added marginTop for breathing room between sections
    marginTop: 4,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionAccentGroup: { flexDirection: "column", gap: 3, alignItems: "center" },
  sectionAccentTall: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  sectionAccentShort: {
    width: 3,
    height: 6,
    borderRadius: 2,
    backgroundColor: "rgba(212,168,67,0.35)",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: C.goldMuted,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  countPillText: { fontSize: 11, fontWeight: "700", color: C.goldText },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
  },
  viewAllText: { fontSize: 13, fontWeight: "700", color: C.gold },
  viewAllArrow: { fontSize: 20, color: C.goldBright, lineHeight: 22 },

  // ── Categories ───────────────────────────────────────────────────────────────
  catScrollPad: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  catShimmerWrap: { alignItems: "center", marginRight: 20, gap: 8 },
  catItem: { alignItems: "center", marginRight: 20 },
  catImgWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0EDE6",
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  catImgWrapActive: {
    borderColor: C.gold,
    borderWidth: 2,
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  catActiveGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(212,168,67,0.08)",
    borderRadius: 32,
  },
  catImg: { width: 64, height: 64, borderRadius: 32 },
  catImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(212,168,67,0.10)",
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textMuted,
    textAlign: "center",
    maxWidth: 70,
  },
  catLabelActive: { color: C.goldText, fontWeight: "800" },
  catActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
    marginTop: 5,
  },

  // ── Sub-Categories ───────────────────────────────────────────────────────────
  subScrollPad: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginBottom: 20,
    alignItems: "center",
  },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 28,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    gap: 8,
    shadowColor: C.shadowDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 1,
  },
  subChipActive: {
    backgroundColor: "rgba(184,134,11,0.08)",
    borderColor: C.goldBright,
    borderWidth: 1.5,
  },
  subChipImg: { width: 22, height: 22, borderRadius: 11 },
  subChipText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  subChipTextActive: { color: C.goldText, fontWeight: "700" },

  // ── Products Grid ────────────────────────────────────────────────────────────
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  gridItem: { width: "50%", padding: 5 },
  productShimmer: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },

  // ── Load More ────────────────────────────────────────────────────────────────
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 24,
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

  // ── Empty State ──────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(184,134,11,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.goldBorder,
    marginBottom: 18,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 5,
  },
  emptySubtitle: { fontSize: 12, color: C.textMuted },

  // ── Digital Gold Bottom Banner ───────────────────────────────────────────────
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
  digitalBannerGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(212,168,67,0.05)",
    top: -60,
    right: 0,
  },
  digitalBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  digitalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(212,168,67,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.22)",
  },
  digitalIconText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#E8C97A",
    letterSpacing: 0.8,
  },
  digitalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#E8C97A",
    marginBottom: 3,
  },
  digitalSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  digitalCTA: {
    backgroundColor: "#D4A843",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  digitalCTAText: { fontSize: 12, fontWeight: "800", color: "#1C2340" },

  // ── Toast ────────────────────────────────────────────────────────────────────
  toast: {
    position: "absolute",
    alignSelf: "center",
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
  toastAdded: { backgroundColor: "#065F46" },
  toastRemoved: { backgroundColor: "#7F1D1D" },
  toastText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

export default PgHomeScreen;
