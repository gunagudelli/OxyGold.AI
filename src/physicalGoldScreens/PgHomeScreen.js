import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import ProductCard from "../../components/physical/ProductCard";
import PgLayout from "../../components/physical/PgLayout";
import {
  getMainCategories,
  getSubCategories,
  getProducts,
  getCategoryImage,
  getProductImage,
} from "./physicalGoldApi";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TRUST = [
  { label: "BIS\nHallmarked" },
  { label: "Free\nDelivery" },
  { label: "Secure\nPayment" },
  { label: "7-Day\nReturn" },
];

// ─── Shimmer Placeholder ──────────────────────────────────────────────────────
const ShimmerBox = ({ width, height, borderRadius = 8 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, []);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "#C8972A",
        opacity,
      }}
    />
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, count, onViewAll }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {count != null && <Text style={styles.sectionCount}>{count}</Text>}
    </View>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn}>
        <Text style={styles.viewAllText}>View All</Text>
        <Text style={styles.viewAllArrow}>›</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PgHomeScreen = ({ navigation, route }) => {
  const accessToken = route?.params?.accessToken;
  const userId = route?.params?.userId;

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

  const heroAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (activeCategory && userId) {
      fetchSubCategoriesData(activeCategory);
    }
  }, [activeCategory, userId]);

  // Fetch products when subcategory changes
  useEffect(() => {
    if (activeSubCat && userId) {
      fetchProductsData(activeSubCat);
    }
  }, [activeSubCat, userId]);

  const fetchCategories = async () => {
    if (!userId) return;
    const startTime = Date.now();
    try {
      setLoading((prev) => ({ ...prev, categories: true }));
      const data = await getMainCategories(userId);
      setCategories(data || []);
      if (data?.length > 0) {
        setActiveCategory(data[0].id);
      }
    } catch (error) {
      console.log("[PgHome] Error fetching categories:", error);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => {
        setLoading((prev) => ({ ...prev, categories: false }));
      }, remainingTime);
    }
  };

  const fetchSubCategoriesData = async (categoryId) => {
    const startTime = Date.now();
    try {
      setLoading((prev) => ({ ...prev, subCategories: true }));
      setActiveSubCat(null);
      const data = await getSubCategories(categoryId);
      setSubCategories(data || []);
      if (data?.length > 0) {
        setActiveSubCat(data[0].id);
      }
    } catch (error) {
      console.log("[PgHome] Error fetching subcategories:", error);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => {
        setLoading((prev) => ({ ...prev, subCategories: false }));
      }, remainingTime);
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
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => {
        setLoading((prev) => ({ ...prev, products: false }));
      }, remainingTime);
    }
  };

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!categories.length) return;
    categories.forEach((cat) => {
      if (!categoryImages[cat.id]) {
        const imageUrl = cat.imageUrl || cat.image || cat.categoryImage;
        if (imageUrl) {
          setCategoryImages((prev) => ({ ...prev, [cat.id]: imageUrl }));
        } else {
          getCategoryImage(cat.id)
            .then((img) => {
              if (img)
                setCategoryImages((prev) => ({ ...prev, [cat.id]: img }));
            })
            .catch(() => {});
        }
      }
    });
  }, [categories]);

  useEffect(() => {
    if (!subCategories.length) return;
    subCategories.forEach((subCat) => {
      if (!subCategoryImages[subCat.id]) {
        const imageUrl =
          subCat.imageUrl || subCat.image || subCat.categoryImage;
        if (imageUrl) {
          setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: imageUrl }));
        } else {
          getCategoryImage(subCat.id)
            .then((img) => {
              if (img)
                setSubCategoryImages((prev) => ({ ...prev, [subCat.id]: img }));
            })
            .catch(() => {});
        }
      }
    });
  }, [subCategories]);

  const heroTranslate = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <PgLayout title="GoldMart" showBack={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero ── */}
        <Animated.View
          style={[
            styles.hero,
            { opacity: heroAnim, transform: [{ translateY: heroTranslate }] },
          ]}
        >
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />

          <View style={styles.heroLeft}>
            <View style={styles.heroBadgePill}>
              <View style={styles.heroBadgeDot} />
              <Text style={styles.heroBadgePillText}>CERTIFIED PURE GOLD</Text>
            </View>
            <Text style={styles.heroTitle}>Buy Real{"\n"}Physical Gold</Text>
            <Text style={styles.heroSubtitle}>
              BIS Hallmarked · Delivered to your door
            </Text>
            <TouchableOpacity
              style={styles.heroShopBtn}
              onPress={() =>
                navigation.navigate("PgProducts", { accessToken, userId })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.heroShopBtnText}>Shop Now</Text>
              <Text style={styles.heroShopBtnArrow}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroRight}>
            <View style={styles.heroCoin}>
              <Text style={styles.heroCoinKarat}>24K</Text>
              <View style={styles.heroCoinDivider} />
              <Text style={styles.heroCoinPurity}>999.9</Text>
              <Text style={styles.heroCoinPure}>PURE</Text>
            </View>
            <Text style={styles.heroCoinLabel}>GOLD</Text>
          </View>
        </Animated.View>

        {/* ── Trust Strip ── */}
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

        {/* ── Categories ── */}
        <SectionHeader title="Categories" />

        {loading?.categories ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScrollPad}
          >
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.catShimmerWrap}>
                <ShimmerBox width={60} height={60} borderRadius={30} />
                <ShimmerBox width={44} height={10} borderRadius={4} />
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
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.catImgWrap,
                      isActive && styles.catImgWrapActive,
                    ]}
                  >
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
                  >
                    {c?.name}
                  </Text>
                  {isActive && <View style={styles.catActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Sub-Categories ── */}
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
                  activeOpacity={0.8}
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
                  >
                    {s?.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Products ── */}
        <SectionHeader
          title="Products"
          count={!loading?.products ? products?.length || 0 : null}
          onViewAll={() =>
            navigation.navigate("PgProducts", {
              categoryId: activeCategory,
              subCategoryId: activeSubCat,
              accessToken,
              userId,
            })
          }
        />

        {loading?.products ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.gridItem}>
                <View style={styles.productShimmer}>
                  <ShimmerBox width="100%" height={140} borderRadius={12} />
                  <View style={{ padding: 10, gap: 6 }}>
                    <ShimmerBox width="70%" height={10} borderRadius={4} />
                    <ShimmerBox width="40%" height={10} borderRadius={4} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : products?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🪙</Text>
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>Try a different category</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {products?.slice(0, 6)?.map((item) => (
              <View key={item?.id} style={styles.gridItem}>
                <ProductCard
                  product={item}
                  accessToken={accessToken}
                  onPress={() =>
                    navigation.navigate("PgProductDetails", {
                      productId: item?.id,
                      product: item,
                      accessToken,
                      userId,
                    })
                  }
                />
              </View>
            ))}
          </View>
        )}

        {products?.length > 6 && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() =>
              navigation.navigate("PgProducts", {
                categoryId: activeCategory,
                subCategoryId: activeSubCat,
                accessToken,
                userId,
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.loadMoreText}>
              View All {products?.length} Products
            </Text>
            <Text style={styles.loadMoreArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Digital Gold Banner ── */}
        <TouchableOpacity
          style={styles.digitalBanner}
          onPress={() =>
            navigation.navigate("Dashboard", { accessToken, userId })
          }
          activeOpacity={0.87}
        >
          <View style={styles.digitalBannerGlow} />
          <View style={styles.digitalBannerLeft}>
            <View style={styles.digitalIconWrap}>
              <Text style={styles.digitalIconText}>DG</Text>
            </View>
            <View>
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
    </PgLayout>
  );
};

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EDE6",
  border: "#E8E3D8",
  borderLight: "#EDE9DF",
  gold: "#B8891A",
  goldLight: "#D4A82A",
  goldBright: "#F0CC5A",
  goldDim: "rgba(184,137,26,0.10)",
  goldDimBorder: "rgba(184,137,26,0.22)",
  heroBase: "#1A1200",
  heroSurface: "#251C00",
  heroBorder: "rgba(212,175,55,0.30)",
  heroText: "#F5EDD0",
  heroTextSec: "rgba(245,237,208,0.55)",
  textPri: "#1A1508",
  textSec: "#6B6050",
  textTer: "#A89880",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 36 },

  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: C.heroBase,
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.heroBorder,
    overflow: "hidden",
  },
  heroCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(212,175,55,0.10)",
    top: -80,
    right: -60,
  },
  heroCircle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(212,175,55,0.05)",
    bottom: -50,
    left: 80,
  },
  heroLeft: { flex: 1, zIndex: 1 },
  heroBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,175,55,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.30)",
  },
  heroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.goldBright,
    marginRight: 6,
  },
  heroBadgePillText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.goldBright,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: C.heroText,
    lineHeight: 32,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: C.heroTextSec,
    marginBottom: 20,
    lineHeight: 18,
  },
  heroShopBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: C.goldBright,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 6,
  },
  heroShopBtnText: { fontSize: 13, fontWeight: "800", color: "#1A1200" },
  heroShopBtnArrow: { fontSize: 15, fontWeight: "700", color: "#1A1200" },

  heroRight: { alignItems: "center", marginLeft: 18, zIndex: 1 },
  heroCoin: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#201800",
    borderWidth: 2,
    borderColor: C.goldBright,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  heroCoinKarat: {
    fontSize: 20,
    fontWeight: "900",
    color: C.goldBright,
    lineHeight: 22,
  },
  heroCoinDivider: {
    width: 30,
    height: 1,
    backgroundColor: "rgba(212,175,55,0.45)",
    marginVertical: 3,
  },
  heroCoinPurity: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(240,204,90,0.75)",
    lineHeight: 14,
  },
  heroCoinPure: {
    fontSize: 8,
    fontWeight: "600",
    color: "rgba(245,237,208,0.35)",
    letterSpacing: 1.5,
  },
  heroCoinLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(245,237,208,0.35)",
    letterSpacing: 2,
    marginTop: 6,
  },

  trustStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trustItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  trustLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textSec,
    textAlign: "center",
    lineHeight: 15,
  },
  trustDivider: { width: 1, height: 32, backgroundColor: C.border },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPri,
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textTer,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { fontSize: 13, fontWeight: "700", color: C.gold },
  viewAllArrow: { fontSize: 18, color: C.gold, lineHeight: 20 },

  catScrollPad: { paddingHorizontal: 16, paddingBottom: 6, marginBottom: 8 },
  catItem: { alignItems: "center", marginRight: 18 },
  catImgWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surfaceAlt,
    borderWidth: 2,
    borderColor: C.border,
    marginBottom: 7,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  catImgWrapActive: { borderColor: C.gold, borderWidth: 2.5 },
  catImg: { width: 64, height: 64, borderRadius: 32 },
  catImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(184,137,26,0.10)",
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textSec,
    textAlign: "center",
    maxWidth: 68,
  },
  catLabelActive: { color: C.gold, fontWeight: "800" },
  catActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
    marginTop: 4,
  },
  catShimmerWrap: { alignItems: "center", marginRight: 18, gap: 6 },

  subScrollPad: { paddingHorizontal: 16, paddingBottom: 4, marginBottom: 18 },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    marginRight: 8,
    gap: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  subChipActive: { backgroundColor: C.goldDim, borderColor: C.gold },
  subChipImg: { width: 22, height: 22, borderRadius: 11 },
  subChipText: { fontSize: 12, fontWeight: "600", color: C.textSec },
  subChipTextActive: { color: C.gold, fontWeight: "700" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  gridItem: { width: "50%", padding: 5 },
  productShimmer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },

  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 4,
    borderWidth: 1.5,
    borderColor: C.goldDimBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  loadMoreText: { fontSize: 14, fontWeight: "700", color: C.gold },
  loadMoreArrow: { fontSize: 20, color: C.gold, lineHeight: 22 },

  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textSec,
    marginBottom: 4,
  },
  emptySubtitle: { fontSize: 12, color: C.textTer },

  digitalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: "#1A1200",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    overflow: "hidden",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  digitalBannerGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(212,175,55,0.08)",
    top: -50,
    right: 10,
  },
  digitalBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  digitalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(212,175,55,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },
  digitalIconText: {
    fontSize: 12,
    fontWeight: "900",
    color: C.goldBright,
    letterSpacing: 0.5,
  },
  digitalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.goldBright,
    marginBottom: 3,
  },
  digitalSubtitle: { fontSize: 11, color: "rgba(245,237,208,0.50)" },
  digitalCTA: {
    backgroundColor: C.goldBright,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  digitalCTAText: { fontSize: 12, fontWeight: "800", color: "#1A1200" },
});

export default PgHomeScreen;
