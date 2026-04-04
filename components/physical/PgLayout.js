import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useStatusBar from "../../hooks/useStatusBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigationState, useNavigation } from "@react-navigation/native";
import { PG_COLORS } from "../../constants/physicalGoldColors";

// ─── Fixed Top Header ─────────────────────────────────────────────────────────
const PgHeader = ({ title, showBack, onBack, hideLogo }) => {
  const insets = useSafeAreaInsets();
  useStatusBar("dark-content", PG_COLORS.surface);
  return (
    <View style={[h.header, { paddingTop: insets.top }]}>
      <View style={h.inner}>
        {showBack ? (
          <TouchableOpacity style={h.backBtn} onPress={onBack}>
            <Text style={h.backIcon}>←</Text>
          </TouchableOpacity>
        ) : hideLogo ? (
          <View style={{ width: 38 }} />
        ) : (
          <View style={h.logoWrap}>
            <Text style={h.logoOxy}>OXY</Text>
            <Text style={h.logoGold}>GOLD.AI</Text>
          </View>
        )}

        {showBack && (
          <Text style={h.title} numberOfLines={1}>
            {String(title || "")}
          </Text>
        )}

        {!showBack ? (
          <View style={h.welcomeWrap}>
            <Text style={h.welcomeText}>Welcome Back</Text>
          </View>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>
    </View>
  );
};

// ─── Fixed Bottom Tab Bar ─────────────────────────────────────────────────────
const TABS = [
  { name: "PgHome", label: "Home", icon: "home" },
  { name: "PgCart", label: "Cart", icon: "cart" },
  { name: "PgOrders", label: "Orders", icon: "receipt" },
  { name: "PgProfile", label: "Profile", icon: "person" },
];

const PgBottomBar = ({ activeTab, onTabPress, cartCount = 0 }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[b.bar, { paddingBottom: insets.bottom + 4 }]}>
      {TABS.map((tab) => {
        const active = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={b.tab}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <View style={b.tabContent}>
              <Ionicons
                name={active ? tab.icon : `${tab.icon}-outline`}
                size={22}
                color={active ? PG_COLORS.gold : PG_COLORS.lightGray}
              />
              {tab.name === "PgCart" && cartCount > 0 && (
                <View style={b.badge}>
                  <Text style={b.badgeText}>
                    {String(cartCount > 99 ? "99+" : cartCount)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[b.label, active && b.labelActive]}>
              {String(tab.label)}
            </Text>
            {active && <View style={b.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Layout Wrapper ───────────────────────────────────────────────────────────
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
        h
        ideLogo={hideLogo}
      />
      <View style={l.content}>{children}</View>
      {!hideBottomBar && <PgBottomBarConnected />}
    </View>
  );
};

// Connected bottom bar that reads active route from navigation state
const PgBottomBarConnected = () => {
  const navigation = useNavigation();
  const state = useNavigationState((s) => s);
  const [cartCount, setCartCount] = React.useState(0);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      try {
        const user = await AsyncStorage.getItem("user");
        if (user) {
          const userData = JSON.parse(user);
          const userId = userData?.userId;
          if (userId) {
            const response = await fetch(
              `http://65.0.147.157:9900/api/cart/customer-cart-info?customerId=${userId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${userData?.accessToken || ""}`,
                },
              },
            );
            if (response.ok) {
              const data = await response.json();
              // Response is NOT wrapped in data object - items are at root level
              const totalItems = data?.totalItemsInCart || 0;
              console.log("[PgLayout Cart Badge] Total items:", totalItems);
              setCartCount(totalItems);
            }
          }
        }
      } catch (err) {
        console.log("[PgLayout] Cart fetch error:", err);
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Find the active tab name from navigation state
  const getActiveTab = () => {
    try {
      // Walk down the state tree to find the active tab screen
      let current = state;
      while (current?.routes) {
        const active = current.routes[current.index ?? 0];
        if (active?.state) {
          current = active.state;
        } else {
          return active?.name || "PgHome";
        }
      }
    } catch {}
    return "PgHome";
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tabName) => {
    navigation.navigate(tabName);
  };

  return (
    <PgBottomBar
      activeTab={activeTab}
      onTabPress={handleTabPress}
      cartCount={cartCount}
    />
  );
};

export { PgHeader, PgBottomBar, PgLayout };
export default PgLayout;

// ─── Styles ───────────────────────────────────────────────────────────────────
const h = StyleSheet.create({
  header: {
    backgroundColor: PG_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: PG_COLORS.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PG_COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: PG_COLORS.border,
  },
  backIcon: { fontSize: 18, color: PG_COLORS.darkGray },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 0 },
  logoOxy: {
    fontSize: 18,
    fontWeight: "900",
    color: "#6312d5",
    letterSpacing: -0.5,
  },
  logoGold: {
    fontSize: 18,
    fontWeight: "900",
    color: PG_COLORS.gold,
    letterSpacing: -0.5,
  },
  welcomeWrap: { alignItems: "flex-end" },
  welcomeText: { fontSize: 13, fontWeight: "700", color: PG_COLORS.darkGray },
  logoText: { fontSize: 22 },
  brand: { fontSize: 16, fontWeight: "900", color: PG_COLORS.darkGray },
  brandSub: { fontSize: 10, color: PG_COLORS.lightGray },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: PG_COLORS.darkGray,
    flex: 1,
    textAlign: "center",
  },
});

const b = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: PG_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: PG_COLORS.border,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
    position: "relative",
  },
  tabContent: { position: "relative", alignItems: "center" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: PG_COLORS.surface,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF" },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: PG_COLORS.lightGray,
    marginTop: 3,
  },
  labelActive: { color: PG_COLORS.gold, fontWeight: "800" },
  dot: {
    position: "absolute",
    top: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PG_COLORS.gold,
  },
});

const l = StyleSheet.create({
  root: { flex: 1, backgroundColor: PG_COLORS.background },
  content: { flex: 1 },
});
