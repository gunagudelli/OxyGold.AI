import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useNavigationState, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { selectUserId } from "../../src/store/authSlice";
import { apiGet } from "../../src/services/apiClient";
import { BASE_URL } from "../../src/constants/api";
import { PG_COLORS } from "../../constants/physicalGoldColors";

// ─── COLORS ─────────────────────────────────────────
const HEADER_COLORS = {
  primary: "#1C2340",
  accent: "#E8C97A",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.70)",
};

// ─── HEADER ─────────────────────────────────────────
const PgHeader = ({ title, showBack, onBack, hideLogo }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: HEADER_COLORS.primary }}>
      {/* ✅ FIXED STATUS BAR */}
      <StatusBar
        backgroundColor={HEADER_COLORS.primary}
        barStyle="light-content"
        translucent={false}
      />

      <View style={[h.header, { paddingTop: insets.top }]}>
        <View style={h.inner}>
          
          {/* LEFT */}
          {showBack ? (
            <TouchableOpacity style={h.backBtn} onPress={onBack}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
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
  <Text style={h.welcomeText}>Welcome Back 👋</Text>
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
          >
            <View style={b.tabContent}>
              <Ionicons
                name={active ? tab.icon : `${tab.icon}-outline`}
                size={22}
                color={
                  active
                    ? HEADER_COLORS.accent
                    : "rgba(255,255,255,0.5)"
                }
              />

              {tab.name === "PgCart" && cartCount > 0 && (
                <View style={b.badge}>
                  <Text style={b.badgeText}>
                    {cartCount > 99 ? "99+" : cartCount}
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

// ─── CONNECTED BAR ──────────────────────────────────
const PgBottomBarConnected = () => {
  const navigation = useNavigation();
  const state = useNavigationState((s) => s);
  const userId = useSelector(selectUserId);
  const [cartCount, setCartCount] = React.useState(0);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      if (!userId) return;
      try {
        const data = await apiGet(
          `${BASE_URL}/cart/customer-cart-info`,
          { params: { customerId: userId } }
        );
        setCartCount(data?.totalItemsInCart || 0);
      } catch {}
    });
    return unsubscribe;
  }, [navigation, userId]);

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
    />
  );
};

export default PgLayout;

// ─── STYLES ─────────────────────────────────────────
const h = StyleSheet.create({
  header: {
    backgroundColor: HEADER_COLORS.primary,
    paddingBottom: 10,
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
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  rightSection: {
  minWidth: 70,              // ✅ increase space
  justifyContent: "center",
  alignItems: "flex-end",
},
  logoWrap: { flexDirection: "row", alignItems: "center" },
  logoOxy: { color: "#E8C97A", fontWeight: "900", fontSize: 16 },
  logoGold: { color: "#fff", fontWeight: "900", fontSize: 16 },
logoAi: {
  color: "#E8C97A",
  fontWeight: "900",
  fontSize: 16,        // ✅ same as OXY GOLD
  marginLeft: 2,
},


  title: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  welcomeWrap: { alignItems: "flex-end" },
welcomeLabel: {
  fontSize: 11,
  color: "rgba(255,255,255,0.7)",
},

welcomeText: {
  fontSize: 13,
  fontWeight: "800",
  color: "#fff",
},
});

const b = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: HEADER_COLORS.primary,
  },
  tab: { flex: 1, alignItems: "center", paddingTop: 10 },
  tabContent: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "red",
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 10 },

  label: { fontSize: 10, color: "rgba(255,255,255,0.5)" },
  labelActive: { color: "#E8C97A" },

  dot: {
    width: 4,
    height: 4,
    backgroundColor: "#E8C97A",
    borderRadius: 2,
    marginTop: 2,
  },
});

const l = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1C2340", // 🔥 FIX
  },
  content: {
    flex: 1,
    backgroundColor: PG_COLORS.background,
  },
});