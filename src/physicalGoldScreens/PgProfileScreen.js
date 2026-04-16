import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import {
  selectUserId,
  selectUserEmail,
  selectAccessToken,
  selectRefreshToken,
} from "../store/authSlice";
import { apiGet, apiPost } from "../services/apiClient";
import { handleLogout } from "../services/logoutService";
import { PHYSICAL_GOLD_BASE_URL } from "../constants/api";
import PgLayout from "../../components/physical/PgLayout";

// ─── Design Tokens (mirrors PgProductDetailsScreen exactly) ──────────────────
const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  gold: "#C8952A",
  goldLight: "#F5ECD7",
  goldMid: "#E8C97A",
  goldDim: "rgba(200,149,42,0.10)",
  goldDimBorder: "rgba(200,149,42,0.25)",
  navy: "#1C2340",
  navyMid: "#3D4463",
  navyLight: "#8891AF",
  green: "#0E9F6E",
  greenBg: "#ECFDF5",
  greenBorder: "#A7F3D0",
  red: "#E02424",
  redBg: "#FEF2F2",
  redBorder: "#FECACA",
  border: "#EAE8E2",
  divider: "#F0EEE9",
  surfaceAlt: "#F7F6F3",
};

// ─── Shimmer (same as PgProductDetailsScreen) ─────────────────────────────────
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
        backgroundColor: C.goldMid,
        opacity,
      }}
    />
  );
};

// ─── Section Header (same as PgProductDetailsScreen) ──────────────────────────
const SectionHeader = ({ title, action, actionLabel }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={action} style={styles.sectionAction}>
        <Text style={styles.sectionActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PgProfileScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const userId = useSelector(selectUserId);
  const userEmail = useSelector(selectUserEmail);
  const refreshToken = useSelector(selectRefreshToken);

  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    if (!userId) return;
    const startTime = Date.now();
    try {
      setLoading(true);
      const data = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/auth/getUserBasedOnUserId`, {
        params: { userId },
      });
      const profileData = data?.data?.body || data?.data || data || {};
      setProfile(profileData);
      setFormData({
        firstName: profileData.firstName || profileData.name || "",
        lastName: profileData.lastName || "",
        email: profileData.email || userEmail || "",
        mobileNumber: profileData.mobileNumber || profileData.phone || "",
        alterMobileNumber:
          profileData.alterMobileNumber || profileData.alternativeNumber || "",
        whatsappNumber: profileData.whatsappNumber || "",
      });
      try {
        const walletData = await apiGet(
          `${PHYSICAL_GOLD_BASE_URL}/wallet/getWallet/${userId}`,
        );
        setWallet(walletData?.data?.balance || walletData?.balance || 0);
      } catch (e) {}
    } catch (e) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      const remaining = Math.max(0, 2000 - (Date.now() - startTime));
      setTimeout(() => {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }, remaining);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        userId: Number(userId),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        alternativeNumber: formData.alterMobileNumber,
        whatsappNumber: formData.whatsappNumber,
      };
      const responseData = await apiPost(
        `${PHYSICAL_GOLD_BASE_URL}/auth/saveUserProfile`,
        payload,
      );
      const updatedProfile = {
        ...profile,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        alterMobileNumber: formData.alterMobileNumber,
        whatsappNumber: formData.whatsappNumber,
      };
      setProfile(updatedProfile);
      const user = JSON.parse(
        (await AsyncStorage.getItem("auth_tokens")) || "{}",
      );
      user.profile = updatedProfile;
      await AsyncStorage.setItem("auth_tokens", JSON.stringify(user));
      setEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddressClick = async () => {
    try {
      const response = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/auth/addresses/${userId}`);
      const addresses = response?.data || [];
      const addressList = Array.isArray(addresses) ? addresses : [];
      if (addressList.length === 0) {
        Alert.alert("Addresses", "No addresses found. Add one now?", [
          { text: "Cancel" },
          {
            text: "Add Address",
            onPress: () =>
              navigation.navigate("PgAddress", { userId }),
          },
        ]);
      } else {
        const addressText = addressList
          .filter((addr) => addr.address || addr.flatNo)
          .map((addr, idx) => {
            const type = addr.type || "Home";
            const flatNo = addr.flatNo || "N/A";
            const address = addr.address || "N/A";
            const pincode = addr.pincode || addr.pinCode || "N/A";
            return `${idx + 1}. ${type}\n${flatNo}, ${address}\n${pincode}`;
          })
          .join("\n\n");
        Alert.alert(
          "Your Addresses",
          addressText || "No complete addresses found",
          [
            { text: "Close" },
            {
              text: "Manage",
              onPress: () =>
                navigation.navigate("PgAddress", { userId }),
            },
          ],
        );
      }
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to load addresses");
    }
  };

  const handleLogoutPress = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setLogoutLoading(true);
          try {
            const store = require("../store/index").default;
            const navigationRef = {
              isReady: () => true,
              reset: navigation.reset,
            };

            await handleLogout({
              refreshToken,
              userId,
              store,
              navigationRef,
              onSuccess: () => {
                console.log("[Profile] Logout successful");
              },
              onError: (error) => {
                Alert.alert(
                  "Logout Error",
                  error || "Failed to logout. Please try again."
                );
              },
            });
          } catch (error) {
            Alert.alert(
              "Error",
              error?.message || "An unexpected error occurred"
            );
          } finally {
            setLogoutLoading(false);
          }
        },
      },
    ]);
  };

  // ── Loading ──
  if (loading) {
    return (
      <PgLayout
        title="My Profile"
        showBack
        onBack={() => navigation.goBack()}
        hideLogo
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.shimmerBody}>
            {/* Hero shimmer */}
            <View style={styles.shimmerHeroCard}>
              <ShimmerBox width={68} height={68} borderRadius={34} />
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerBox width="60%" height={16} />
                <ShimmerBox width="80%" height={12} />
                <ShimmerBox width="40%" height={11} />
              </View>
            </View>
            <View style={{ height: 12 }} />
            <ShimmerBox width="100%" height={88} borderRadius={18} />
            <View style={{ height: 12 }} />
            <ShimmerBox width="45%" height={14} />
            <View style={{ height: 10 }} />
            <ShimmerBox width="100%" height={200} borderRadius={16} />
            <View style={{ height: 12 }} />
            <ShimmerBox width="45%" height={14} />
            <View style={{ height: 10 }} />
            <ShimmerBox width="100%" height={180} borderRadius={16} />
          </View>
        </ScrollView>
      </PgLayout>
    );
  }

  const displayName =
    [formData.firstName, formData.lastName].filter(Boolean).join(" ") || "User";

  return (
    <PgLayout
      title="My Profile"
      showBack
      onBack={() => navigation.goBack()}
      hideLogo
    >
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* ── Hero (navy — same as PgProductDetailsScreen hero card) ── */}
        <View style={styles.hero}>
          <View style={styles.heroRing1} />
          <View style={styles.heroRing2} />
          <View style={styles.heroRing3} />

          {/* Avatar coin — mirrors heroCoin */}
          <View style={styles.avatarCoin}>
            <Ionicons name="person" size={32} color={C.goldMid} />
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroEmail}>
              {formData.email || userEmail || "user@example.com"}
            </Text>
            <View style={styles.heroIdPill}>
              <Text style={styles.heroIdText}>ID: {userId}</Text>
            </View>
          </View>
        </View>

        {/* ── Wallet Card (navy, same pattern as priceCard) ── */}
        <TouchableOpacity
          style={styles.walletCard}
          onPress={() => navigation.navigate("PgWallet", { userId })}
          activeOpacity={0.85}
        >
          <View style={styles.walletRing1} />
          <View style={styles.walletRing2} />

          <View style={styles.walletIconWrap}>
            <Ionicons name="wallet" size={22} color={C.goldMid} />
          </View>

          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmount}>
              ₹{Number(wallet).toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.walletChevron}>
            <Ionicons name="chevron-forward" size={18} color={C.goldMid} />
          </View>
        </TouchableOpacity>

        {/* ── Personal Information ── */}
        <View style={styles.card}>
          <SectionHeader
            title="Personal Information"
            action={() => setEditing(!editing)}
            actionLabel={editing ? "Cancel" : "Edit"}
          />

          {/* Row 1: First Name & Last Name */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !editing && styles.fieldInputDisabled,
                ]}
                value={formData.firstName || ""}
                onChangeText={(text) =>
                  setFormData({ ...formData, firstName: text })
                }
                editable={editing}
                placeholderTextColor={C.navyLight}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !editing && styles.fieldInputDisabled,
                ]}
                value={formData.lastName || ""}
                onChangeText={(text) =>
                  setFormData({ ...formData, lastName: text })
                }
                editable={editing}
                placeholderTextColor={C.navyLight}
              />
            </View>
          </View>

          {/* Row 2: Primary Mobile & Email */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Primary Mobile</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputDisabled]}
                value={formData.mobileNumber || ""}
                editable={false}
                placeholderTextColor={C.navyLight}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !editing && styles.fieldInputDisabled,
                ]}
                value={formData.email || ""}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                editable={editing}
                placeholderTextColor={C.navyLight}
              />
            </View>
          </View>

          {/* Row 3: Alternative Mobile & WhatsApp */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Alternative Mobile</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !editing && styles.fieldInputDisabled,
                ]}
                value={formData.alterMobileNumber || ""}
                onChangeText={(text) =>
                  setFormData({ ...formData, alterMobileNumber: text })
                }
                editable={editing}
                placeholderTextColor={C.navyLight}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>WhatsApp Number</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !editing && styles.fieldInputDisabled,
                ]}
                value={formData.whatsappNumber || ""}
                onChangeText={(text) =>
                  setFormData({ ...formData, whatsappNumber: text })
                }
                editable={editing}
                placeholderTextColor={C.navyLight}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {editing && (
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={C.navy} />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Quick Links ── */}
        <View style={styles.card}>
          <SectionHeader title="Quick Links" />

          {[
            {
              icon: "receipt-outline",
              label: "My Orders",
              onPress: () => navigation.navigate("PgOrders", { userId }),
            },
            {
              icon: "location-outline",
              label: "Addresses",
              onPress: handleAddressClick,
            },
            {
              icon: "wallet-outline",
              label: "Wallet & Transactions",
              onPress: () => navigation.navigate("PgWallet", { userId }),
            },
            {
              icon: "help-circle-outline",
              label: "Help & Support",
              onPress: null,
            },
            {
              icon: "document-text-outline",
              label: "Terms & Conditions",
              onPress: null,
            },
          ].map((item, index, arr) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.linkItem}
                onPress={item.onPress || undefined}
                activeOpacity={item.onPress ? 0.75 : 1}
              >
                {/* Gold icon badge — matches sectionAccent/specGold pattern */}
                <View style={styles.linkIconWrap}>
                  <Ionicons name={item.icon} size={18} color={C.gold} />
                </View>
                <Text style={styles.linkText}>{item.label}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={C.navyLight}
                />
              </TouchableOpacity>
              {index < arr.length - 1 && <View style={styles.linkDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Logout — matches redBg/redBorder pattern ── */}
        <TouchableOpacity
          style={[styles.logoutBtn, logoutLoading && styles.logoutBtnDisabled]}
          onPress={handleLogoutPress}
          disabled={logoutLoading}
          activeOpacity={0.85}
        >
          {logoutLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.ScrollView>
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },

  // Loading shimmer
  shimmerBody: { padding: 16, gap: 0 },
  shimmerHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.navy,
    borderRadius: 22,
    padding: 20,
    marginBottom: 0,
  },

  // ── Hero (navy — same as PgProductDetailsScreen hero card) ──
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: C.navy,
    borderRadius: 22,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.25)",
    overflow: "hidden",
  },
  heroRing1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    right: -50,
    top: -70,
  },
  heroRing2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    right: 10,
    top: -10,
  },
  heroRing3: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.06)",
    left: -40,
    bottom: -50,
  },

  // Avatar coin — mirrors heroCoin from PgProductDetailsScreen
  avatarCoin: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: C.goldMid,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1,
  },

  heroInfo: { flex: 1, zIndex: 1 },
  heroName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroEmail: { fontSize: 12, color: "rgba(255,255,255,0.60)", marginBottom: 8 },
  heroIdPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(232,201,122,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.30)",
  },
  heroIdText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.goldMid,
    letterSpacing: 0.5,
  },

  // ── Wallet Card (navy, mirrors priceCard) ──
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.navy,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.25)",
    overflow: "hidden",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  walletRing1: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(232,201,122,0.07)",
    top: -30,
    right: 40,
  },
  walletRing2: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.10)",
    right: -10,
    bottom: -20,
  },
  walletIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(232,201,122,0.15)",
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.30)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  walletInfo: { flex: 1, zIndex: 1 },
  walletLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.40)",
    marginBottom: 4,
  },
  walletAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: C.goldMid,
    letterSpacing: -0.5,
  },
  walletChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(232,201,122,0.12)",
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },

  // ── Section Header (same as PgProductDetailsScreen) ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: C.navyMid,
    letterSpacing: 0.5,
  },
  sectionAction: { paddingHorizontal: 8, paddingVertical: 4 },
  sectionActionText: { fontSize: 12, fontWeight: "700", color: C.gold },

  // ── Cards (same as PgProductDetailsScreen) ──
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Form Fields ──
  fieldRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  fieldHalf: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.navyLight,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  fieldInput: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    fontWeight: "600",
    color: C.navy,
    minHeight: 44,
  },
  fieldInputDisabled: { backgroundColor: C.surfaceAlt, color: C.navyLight },

  // Save button — matches cartBtn from PgProductDetailsScreen
  saveBtn: {
    backgroundColor: C.gold,
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: C.navy,
    letterSpacing: 0.3,
  },

  // ── Quick Links ──
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  linkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldDimBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: { flex: 1, fontSize: 13, fontWeight: "600", color: C.navy },
  linkDivider: { height: 1, backgroundColor: C.divider },

  // ── Logout — matches redBg/redBorder ──
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.red,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.redBorder,
    marginTop: 4,
    marginBottom: 20,
  },
  logoutBtnDisabled: {
    opacity: 0.6,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});

export default PgProfileScreen;
