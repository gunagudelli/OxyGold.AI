import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { useNavigationState, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { selectUserId } from "../../store/authSlice";
import { selectCartCount, selectWishlistCount, setCartCount, setWishlistCount } from "../../store/cartSlice";
import { PG_COLORS } from "../constants/physicalGoldColors";
import { getCart, getWishlist } from "../screens/physicalGoldApi";

// ─── COLORS ─────────────────────────────────────────
const HEADER_COLORS = {
  primary: "#FFFFFF",
  accent: "#CF8B17",
  text: "#1C1C1E",
  textSecondary: "#7A7A80",
};

// ─── HEADER ─────────────────────────────────────────
const PgHeader = ({ title, showBack, onBack, hideLogo }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: HEADER_COLORS.primary }}>
      <StatusBar
        backgroundColor={HEADER_COLORS.primary}
        barStyle="dark-content"
        translucent={false}
      />

      <View style={[h.header, { paddingTop: insets.top }]}>
        <View style={h.inner}>
          {/* LEFT */}
          {showBack ? (
            <TouchableOpacity style={h.backBtn} onPress={onBack}>
              <Ionicons name="arrow-back" size={22} color={HEADER_COLORS.text} />
            </TouchableOpacity>
          ) : hideLogo ? (
            <View style={{ width: 40 }} />
          ) : (
            <View style={h.logoWrap}>
              <Text style={h.logoOxy}>OXY</Text>
              <Text style={h.logoGold}>GOLD</Text>
              <Text style={h.logoAi}>.AI</Text>
            </View>
          )}

          {/* CENTER */}
          {showBack && (
            <Text style={h.title} numberOfLines={1}>
              {title}
            </Text>
          )}

          {/* RIGHT */}
          {!showBack ? (
            <View style={h.welcomeWrap}>
              <Text style={h.welcomeText}>Welcome Back</Text>
            </View>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>
    </View>
  );
};

// ─── BOTTOM BAR ─────────────────────────────────────
const TABS = [
  { name: "PgHome", label: "Home", icon: "home" },
  { name: "PgCart", label: "Cart", icon: "cart" },
  { name: "PgWishlist", label: "Wishlist", icon: "heart" },
  { name: "PgOrders", label: "Orders", icon: "receipt" },
  { name: "PgProfile", label: "Profile", icon: "person" },
];

const PgBottomBar = ({ activeTab, onTabPress, cartCount = 0, wishlistCount = 0 }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const userId = useSelector(selectUserId);

  const handleTabPress = async (tabName) => {
    onTabPress(tabName);
    if (!userId) return;
    
    if (tabName === "PgCart") {
      try {
        const cartData = await getCart(userId);
        dispatch(setCartCount(cartData?.totalItemsInCart || 0));
      } catch {}
    } else if (tabName === "PgWishlist") {
      try {
        const items = await getWishlist(userId);
        dispatch(setWishlistCount(items?.length || 0));
      } catch {}
    }
  };

  return (
    <View style={[b.bar, { paddingBottom: insets.bottom + 4 }]}>
      {TABS.map((tab) => {
        const active = activeTab === tab.name;
        const count = tab.name === "PgCart" ? cartCount : tab.name === "PgWishlist" ? wishlistCount : 0;

        return (
          <TouchableOpacity
            key={tab.name}
            style={b.tab}
            onPress={() => handleTabPress(tab.name)}
          >
            <View style={b.tabContent}>
              <Ionicons
                name={active ? tab.icon : `${tab.icon}-outline`}
                size={22}
                color={
                  active
                    ? HEADER_COLORS.accent
                    : "#A79C93"
                }
              />

              {(tab.name === "PgCart" || tab.name === "PgWishlist") && count > 0 && (
                <View style={b.badge}>
                  <Text style={b.badgeText}>
                    {count > 99 ? "99+" : count}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[b.label, active && b.labelActive]}>
              {tab.label}
            </Text>

            {active && <View style={b.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── CONNECTED BAR ──────────────────────────────────
const PgBottomBarConnected = () => {
  const navigation = useNavigation();
  const state = useNavigationState((s) => s);
  const userId = useSelector(selectUserId);
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const wishlistCount = useSelector(selectWishlistCount);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      if (!userId) return;
      try {
        const cartData = await getCart(userId);
        dispatch(setCartCount(cartData?.totalItemsInCart || 0));
      } catch {}
      try {
        const items = await getWishlist(userId);
        dispatch(setWishlistCount(items?.length || 0));
      } catch {}
    });
    return unsubscribe;
  }, [navigation, userId, dispatch]);

  const getActiveTab = () => {
    let current = state;
    while (current?.routes) {
      const route = current.routes[current.index ?? 0];
      if (route?.state) current = route.state;
      else return route?.name || "PgHome";
    }
    return "PgHome";
  };

  return (
    <PgBottomBar
      activeTab={getActiveTab()}
      onTabPress={(name) => navigation.navigate(name)}
      cartCount={cartCount}
      wishlistCount={wishlistCount}
    />
  );
};

// ─── LAYOUT ─────────────────────────────────────────
const PgLayout = ({
  children,
  title,
  showBack,
  onBack,
  hideBottomBar = false,
  hideLogo = false,
}) => {
  return (
    <View style={l.root}>
      <PgHeader
        title={title}
        showBack={showBack}
        onBack={onBack}
        hideLogo={hideLogo}
      />

      <View style={l.content}>{children}</View>

      {!hideBottomBar && <PgBottomBarConnected />}
    </View>
  );
};

export default PgLayout;

// ─── STYLES ─────────────────────────────────────────
const h = StyleSheet.create({
  header: {
    backgroundColor: HEADER_COLORS.primary,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E0DA",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: { flexDirection: "row", alignItems: "center" },
  logoOxy: { color: HEADER_COLORS.accent, fontWeight: "900", fontSize: 16 },
  logoGold: { color: HEADER_COLORS.text, fontWeight: "900", fontSize: 16 },
  logoAi: {
    color: HEADER_COLORS.accent,
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 2,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: HEADER_COLORS.text,
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  welcomeWrap: { alignItems: "flex-end" },
  welcomeText: {
    fontSize: 13,
    fontWeight: "600",
    color: HEADER_COLORS.text,
  },
});

const b = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E7E0DA",
  },
  tab: { flex: 1, alignItems: "center", paddingTop: 10 },
  tabContent: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#C85A54",
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 10 },
  label: { fontSize: 10, fontWeight: "400", color: "#A79C93" },
  labelActive: { color: "#CF8B17", fontWeight: "600" },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: "#CF8B17",
    borderRadius: 2,
    marginTop: 2,
  },
});

const l = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    backgroundColor: PG_COLORS.background,
  },
});
