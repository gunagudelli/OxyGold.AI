import React from "react";
import {
  View,
  Text,
  Image,
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
// `accent` is brand gold — kept only for the OXYGOLD.AI wordmark, which is
// product identity, not an interactive element. `interactive` (deep emerald)
// is the actual UI accent: active states, badges, buttons, links.
const HEADER_COLORS = {
  primary: "#F7F4ED",
  accent: "#CF8B17",
  interactive: "#0E6B57",
  text: "#1C1C1E",
  textSecondary: "#7A7A80",
};

// ─── HEADER ─────────────────────────────────────────
const PgHeader = ({ title, showBack, onBack, hideLogo, hideCart, cartCount = 0, onCartPress }) => {
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
          {/* LEFT — logo sits here now, not centered, when there's no back
              button. A left-aligned logo next to the actions on the right
              is the standard, professional header layout. */}
          {showBack ? (
            <TouchableOpacity style={h.iconBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={22} color={HEADER_COLORS.text} />
            </TouchableOpacity>
          ) : !hideLogo ? (
            <Image
              source={require("../../../assets/logo.png")}
              style={h.logoImg}
              resizeMode="contain"
            />
          ) : (
            <View style={h.iconBtn} />
          )}

          {/* CENTER */}
          {showBack && (
            <Text style={h.title} numberOfLines={1}>
              {title}
            </Text>
          )}

          {/* RIGHT — cart is reachable from every shopping-related screen;
              hidden on purely informational pages (Legal, Terms, etc.) via
              hideCart, where it's just noise, not a real action. */}
          {hideCart ? (
            <View style={h.iconBtn} />
          ) : (
            <TouchableOpacity style={h.iconBtn} onPress={onCartPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View>
                <Ionicons name="cart-outline" size={23} color={HEADER_COLORS.text} />
                {cartCount > 0 && (
                  <View style={h.cartBadge}>
                    <Text style={h.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── BOTTOM BAR ─────────────────────────────────────
const TABS = [
  { name: "PgHome", label: "Home", icon: "home" },
  { name: "PgWishlist", label: "Wishlist", icon: "heart" },
  { name: "PgProfile", label: "Profile", icon: "person" },
];

const PgBottomBar = ({ activeTab, onTabPress, wishlistCount = 0 }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[b.bar, { paddingBottom: insets.bottom + 6 }]}>
      {TABS.map((tab) => {
        const active = activeTab === tab.name;
        const count = tab.name === "PgWishlist" ? wishlistCount : 0;

        return (
          <TouchableOpacity
            key={tab.name}
            style={b.tab}
            onPress={() => onTabPress(tab.name)}
          >
            <View style={b.tabContent}>
              <Ionicons
                name={active ? tab.icon : `${tab.icon}-outline`}
                size={20}
                color={
                  active
                    ? HEADER_COLORS.interactive
                    : "#A79C93"
                }
              />

              {count > 0 && (
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
      wishlistCount={wishlistCount}
    />
  );
};

// ─── HEADER, CONNECTED ────────────────────────────────
const PgHeaderConnected = ({ title, showBack, onBack, hideLogo, hideCart }) => {
  const navigation = useNavigation();
  const cartCount = useSelector(selectCartCount);

  return (
    <PgHeader
      title={title}
      showBack={showBack}
      onBack={onBack}
      hideLogo={hideLogo}
      hideCart={hideCart}
      cartCount={cartCount}
      onCartPress={() => navigation.navigate("PgCart")}
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
  hideCart = false,
}) => {
  return (
    <View style={l.root}>
      <PgHeaderConnected
        title={title}
        showBack={showBack}
        onBack={onBack}
        hideLogo={hideLogo}
        hideCart={hideCart}
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
    paddingHorizontal: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: "#0E6B57",
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  logoImg: { width: 52, height: 52 },
  title: {
    flex: 1,
    textAlign: "center",
    color: HEADER_COLORS.text,
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: -0.2,
  },
});

const b = StyleSheet.create({
  // ── Compact, modern footer — moderate horizontal padding, balanced
  // top/bottom padding, rounded top edge, buttons evenly distributed.
  // A deeper tan than the header's pale cream so it doesn't wash out. ──
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "rgba(34,30,28,0.12)",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 3,
  },
  tabContent: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#C0392B",
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 10 },
  label: { fontSize: 10, fontWeight: "400", color: "#A79C93" },
  labelActive: { color: "#1C1C1E", fontWeight: "600" },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: "#0E6B57",
    borderRadius: 2,
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
