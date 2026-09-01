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
  Image,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  selectUserId,
  selectUserEmail,
  selectAccessToken,
  selectRefreshToken,
} from "../../store/authSlice";
import { apiGet, apiPost } from "../../services/apiClient";
import { handleLogout } from "../../services/logoutService";
import { PHYSICAL_GOLD_BASE_URL } from "../../constants/api";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";
import { getUserOrders, getWishlist, getUserAddresses } from "./physicalGoldApi";

// ─── Design Tokens — premium, restrained. Gold is an accent only. ────────────
const T = {
  ink: "#1C1C1E",
  subtle: "#7A7A80",
  faint: "#ACACB2",
  bg: "#F7F6F4",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F4F1",
  divider: "#ECEAE6",
  gold: "#CF8B17",
  goldTint: "rgba(207,139,23,0.08)",
  goldBorder: "rgba(207,139,23,0.30)",
  danger: "#C85A54",
  dangerTint: "rgba(200,90,84,0.06)",
};

// ─── Shimmer ───────────────────────────────────────────────────────────────
const ShimmerBox = ({ width, height, borderRadius = 8 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.45] });
  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: T.divider, opacity }}
    />
  );
};

// ─── GroupHead — icon box + title + subtitle, above each grouped detail card ─
const GroupHead = ({ icon, title, subtitle, onEdit }) => (
  <View style={styles.groupHead}>
    <View style={styles.groupIconBox}>
      <Ionicons name={icon} size={16} color={T.gold} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      {subtitle ? <Text style={styles.groupSubtitle}>{subtitle}</Text> : null}
    </View>
    {onEdit && (
      <TouchableOpacity
        style={styles.groupEditBtn}
        onPress={onEdit}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="pencil-outline" size={12} color={T.gold} />
        <Text style={styles.groupEditBtnText}>Edit</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── InfoRow — label left, value/input right ─────────────────────────────────
const InfoRow = ({ label, required, value, placeholder, editing, editable = true, onChangeText, last, verified, ...inputProps }) => (
  <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
    <View style={styles.infoRowLeft}>
      <Text style={styles.infoLabel}>
        {label}
        {required && <Text style={styles.fieldLabelRequired}> *</Text>}
      </Text>
    </View>
    {editing && editable ? (
      <TextInput
        style={styles.infoInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.faint}
        textAlign="right"
        {...inputProps}
      />
    ) : (
      <View style={styles.infoValueRow}>
        <Text style={[styles.infoValue, !value && styles.infoValueEmpty]} numberOfLines={1}>
          {value || "Not provided"}
        </Text>
        {verified && value && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={T.gold} />
            <Text style={styles.verifiedBadgeText}>Verified</Text>
          </View>
        )}
      </View>
    )}
  </View>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const PgProfileScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const userId = useSelector(selectUserId);
  const userEmail = useSelector(selectUserEmail);
  const refreshToken = useSelector(selectRefreshToken);
  const returnTo = route?.params?.returnTo;

  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [addressesCount, setAddressesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [panVerified, setPanVerified] = useState(false);
  const [verifyingPan, setVerifyingPan] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    if (!userId) return;
    const startTime = Date.now();
    try {
      setLoading(true);

      console.log('========================================');
      console.log('[Profile] FETCHING PROFILE DATA');
      console.log('[Profile] userId:', userId);
      console.log('========================================');

      const data = await apiGet(`${PHYSICAL_GOLD_BASE_URL}/auth/getUserBasedOnUserId`, {
        params: { userId },
      });

      console.log('========================================');
      console.log('[Profile] GET PROFILE API RAW RESPONSE');
      console.log(JSON.stringify(data, null, 2));
      console.log('========================================');

      const profileData = data?.data?.body || data?.data || data || {};

      console.log('========================================');
      console.log('[Profile] EXTRACTED PROFILE DATA');
      console.log(JSON.stringify(profileData, null, 2));
      console.log('========================================');
      console.log('[Profile] Field Check:');
      console.log('  - firstName:', profileData.firstName);
      console.log('  - lastName:', profileData.lastName);
      console.log('  - email:', profileData.email);
      console.log('  - mobileNumber:', profileData.mobileNumber);
      console.log('  - whatsappNumber:', profileData.whatsappNumber);
      console.log('  - whatsAppNumber:', profileData.whatsAppNumber);
      console.log('  - alternativeNumber:', profileData.alternativeNumber);
      console.log('  - alterMobileNumber:', profileData.alterMobileNumber);
      console.log('========================================');

      setProfile(profileData);
      const formFields = {
        firstName: profileData.firstName || profileData.name || "",
        lastName: profileData.lastName || "",
        email: profileData.email || userEmail || "",
        mobileNumber: profileData.mobileNumber || profileData.phone || "",
        alterMobileNumber:
          profileData.alterMobileNumber || profileData.alternativeNumber || "",
        whatsappNumber: profileData.whatsappNumber || profileData.whatsAppNumber || "",
        gender: profileData.gender || "",
        panNumber: profileData.panNumber || profileData.pan || "",
      };
      setPanVerified(!!(profileData.panNumber || profileData.pan));

      console.log('========================================');
      console.log('[Profile] FORM FIELDS SET');
      console.log(JSON.stringify(formFields, null, 2));
      console.log('========================================');

      setFormData(formFields);

      // Check if important fields are missing
      const hasFirstName = !!formFields.firstName;
      const hasLastName = !!formFields.lastName;
      const hasEmail = !!formFields.email;

      // Show message if any important field is missing
      if (!hasFirstName || !hasLastName || !hasEmail) {
        setTimeout(() => {
          Alert.alert(
            "Complete Your Profile",
            "Please fill your profile details",
            [
              { text: "Fill Now", onPress: () => setEditing(true) },
              { text: "Later", style: "cancel" }
            ]
          );
        }, 500);
      }

      try {
        const walletData = await apiGet(
          `${PHYSICAL_GOLD_BASE_URL}/wallet/getWallet/${userId}`,
        );
        setWallet(walletData?.data?.balance || walletData?.balance || 0);
      } catch (e) {}

      // Quick-stats counts for the profile header tiles — best-effort, read-only.
      const [ordersRes, wishlistRes, addressesRes] = await Promise.allSettled([
        getUserOrders(userId),
        getWishlist(userId),
        getUserAddresses(userId),
      ]);
      if (ordersRes.status === "fulfilled") setOrdersCount(ordersRes.value?.length || 0);
      if (wishlistRes.status === "fulfilled") setWishlistCount(wishlistRes.value?.length || 0);
      if (addressesRes.status === "fulfilled") setAddressesCount(addressesRes.value?.length || 0);
    } catch (e) {
      // For new users or 404, just show empty profile (no error)
      if (e?.status === 404) {
        setProfile({});
        const emptyFormData = {
          firstName: "",
          lastName: "",
          email: userEmail || "",
          mobileNumber: "",
          alterMobileNumber: "",
          whatsappNumber: "",
          gender: "",
          panNumber: "",
        };
        setFormData(emptyFormData);

        // Show message for new user to fill profile
        setTimeout(() => {
          Alert.alert(
            "Complete Your Profile",
            "Please fill your profile details",
            [
              { text: "Fill Now", onPress: () => setEditing(true) },
              { text: "Later", style: "cancel" }
            ]
          );
        }, 500);
      } else if (e?.status >= 500) {
        // Only show error for actual server errors
        Alert.alert("Error", "Server error. Please try again later.");
      }
      // For other errors, silently handle and show empty profile
    } finally {
      const remaining = Math.max(0, 2000 - (Date.now() - startTime));
      setTimeout(() => setLoading(false), remaining);
    }
  };

  const handleSaveProfile = async () => {
    // Validate name fields - required, only letters and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!formData.firstName?.trim()) {
      Alert.alert("First Name Required", "Please enter your first name");
      return;
    }
    if (!nameRegex.test(formData.firstName)) {
      Alert.alert("Invalid Name", "First name should contain only letters");
      return;
    }

    // Validate email — required, with domain format checking
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email?.trim()) {
      Alert.alert("Email Required", "Please enter your email address");
      return;
    }
    if (!emailRegex.test(formData.email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address\n\nExample: user@gmail.com");
      return;
    }

    // Additional check for common typos in popular domains
    if (formData.email) {
      const email = formData.email.toLowerCase();
      const commonTypos = [
        { wrong: '@gail.', correct: '@gmail.' },
        { wrong: '@gmial.', correct: '@gmail.' },
        { wrong: '@yahooo.', correct: '@yahoo.' },
        { wrong: '@hotmial.', correct: '@hotmail.' },
        { wrong: '.con', correct: '.com' },
        { wrong: '.cmo', correct: '.com' },
        { wrong: '.ocm', correct: '.com' },
      ];

      for (const typo of commonTypos) {
        if (email.includes(typo.wrong)) {
          Alert.alert(
            "Check Email",
            `Did you mean ${email.replace(typo.wrong, typo.correct)}?\n\nPlease verify your email address.`
          );
          return;
        }
      }
    }


    if (formData.whatsappNumber) {
      if (!/^\d{10}$/.test(formData.whatsappNumber)) {
        Alert.alert("Invalid Number", "WhatsApp number must be exactly 10 digits");
        return;
      }
      if (!/^[6-9]/.test(formData.whatsappNumber)) {
        Alert.alert("Invalid Number", "WhatsApp number must start with 6, 7, 8, or 9");
        return;
      }
    }

    // Gender and PAN are required by the backend's saveUserProfile endpoint.
    if (!formData.gender) {
      Alert.alert("Gender Required", "Please select your gender");
      return;
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const panNumber = (formData.panNumber || "").trim().toUpperCase();
    if (!panNumber) {
      Alert.alert("PAN Required", "Please enter your PAN number");
      return;
    }
    if (!panRegex.test(panNumber)) {
      Alert.alert("Invalid PAN", "Enter a valid PAN number, e.g. ABCDE1234F");
      return;
    }

    setSaving(true);
    try {
      // PAN must be verified with the backend before the profile can be saved.
      if (!panVerified) {
        setVerifyingPan(true);
        try {
          await apiPost(`${PHYSICAL_GOLD_BASE_URL}/auth/verifyPan`, {
            pan: panNumber,
            firstName: formData.firstName,
            lastName: formData.lastName,
          });
          setPanVerified(true);
        } catch (panErr) {
          setVerifyingPan(false);
          setSaving(false);
          Alert.alert("PAN Verification Failed", panErr?.message || "Could not verify PAN. Please check your details.");
          return;
        }
        setVerifyingPan(false);
      }

      const payload = {
        userId: Number(userId),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        alternativeNumber: formData.alterMobileNumber,
        whatsappNumber: formData.whatsappNumber,
        gender: formData.gender,
        panNumber,
      };

      console.log('========================================');
      console.log('[Profile] SAVE PROFILE API CALL');
      console.log('[Profile] Payload:', JSON.stringify(payload, null, 2));
      console.log('========================================');

      const responseData = await apiPost(
        `${PHYSICAL_GOLD_BASE_URL}/auth/saveUserProfile`,
        payload,
      );

      console.log('========================================');
      console.log('[Profile] SAVE PROFILE API RESPONSE');
      console.log(JSON.stringify(responseData, null, 2));
      console.log('========================================');

      // Refresh profile data from API after save
      console.log('[Profile] Refreshing profile data after save...');
      await fetchProfileData();

      setEditing(false);
      Alert.alert("Success", "Profile updated successfully");

      // Navigate back to checkout if returnTo is specified
      if (returnTo === 'PgCheckout') {
        setTimeout(() => {
          navigation.navigate('PgCheckout');
        }, 500);
      }
    } catch (e) {
      console.log('========================================');
      console.error('[Profile] SAVE PROFILE ERROR');
      console.error('[Profile] Error:', e);
      console.error('[Profile] Error Message:', e?.message);
      console.log('========================================');
      Alert.alert("Error", e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
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
            <View style={styles.shimmerHeroCard}>
              <ShimmerBox width={56} height={56} borderRadius={28} />
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerBox width="55%" height={16} />
                <ShimmerBox width="75%" height={12} />
              </View>
            </View>
            <View style={{ height: 12 }} />
            <ShimmerBox width="100%" height={76} borderRadius={16} />
            <View style={{ height: 12 }} />
            <ShimmerBox width="100%" height={340} borderRadius={16} />
            <View style={{ height: 12 }} />
            <ShimmerBox width="100%" height={200} borderRadius={16} />
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Identity ── */}
        <FadeSlideIn delay={0}>
        <LinearGradient
          colors={[T.ink, T.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.avatar}>
            <Image source={require("../../../assets/profieicon.png")} style={styles.avatarImg} resizeMode="cover" />
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>
              {formData.email || userEmail || "user@example.com"}
            </Text>
            <View style={styles.idBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#fff" />
              <Text style={styles.idBadgeText}>ID {userId}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.heroEditBtn}
            onPress={() => setEditing(!editing)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={editing ? "close" : "pencil-outline"}
              size={13}
              color="#fff"
            />
            <Text style={styles.heroEditBtnText}>{editing ? "Cancel" : "Edit Profile"}</Text>
          </TouchableOpacity>
        </LinearGradient>
        </FadeSlideIn>

        {/* ── Quick Stats ── */}
        <FadeSlideIn delay={60}>
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("PgWallet", { userId })}
            activeOpacity={0.75}
          >
            <View style={styles.statIconWrap}>
              <Ionicons name="wallet-outline" size={17} color={T.gold} />
            </View>
            <Text style={styles.statLabel}>Wallet Balance</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue} numberOfLines={1}>
                ₹{Number(wallet).toLocaleString("en-IN")}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={T.faint} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("PgOrders", { userId })}
            activeOpacity={0.75}
          >
            <View style={styles.statIconWrap}>
              <Ionicons name="clipboard-outline" size={17} color={T.gold} />
            </View>
            <Text style={styles.statLabel}>My Orders</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue} numberOfLines={1}>
                {ordersCount} Order{ordersCount === 1 ? "" : "s"}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={T.faint} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("PgWishlist", { userId })}
            activeOpacity={0.75}
          >
            <View style={styles.statIconWrap}>
              <Ionicons name="heart-outline" size={17} color={T.gold} />
            </View>
            <Text style={styles.statLabel}>Wishlist</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue} numberOfLines={1}>
                {wishlistCount} Item{wishlistCount === 1 ? "" : "s"}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={T.faint} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("PgAddress", { userId })}
            activeOpacity={0.75}
          >
            <View style={styles.statIconWrap}>
              <Ionicons name="location-outline" size={17} color={T.gold} />
            </View>
            <Text style={styles.statLabel}>Addresses</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue} numberOfLines={1}>
                {addressesCount} Saved
              </Text>
              <Ionicons name="chevron-forward" size={12} color={T.faint} />
            </View>
          </TouchableOpacity>
        </View>
        </FadeSlideIn>

        {/* ── User Details ── */}
        <FadeSlideIn delay={120}>
        <View style={styles.card}>
          <GroupHead
            icon="person-outline"
            title="User Details"
            subtitle="Your personal, contact & KYC info"
            onEdit={!editing ? () => setEditing(true) : null}
          />
          <View style={styles.infoList}>
            <View style={[styles.infoRow, styles.infoRowDivider]}>
              <View style={styles.infoRowLeft}>
                <Text style={styles.infoLabel}>
                  Gender<Text style={styles.fieldLabelRequired}> *</Text>
                </Text>
              </View>
              {editing ? (
                <View style={styles.genderRow}>
                  {["male", "female"].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderOption, formData.gender === g && styles.genderOptionActive]}
                      onPress={() => setFormData({ ...formData, gender: g })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          formData.gender === g && styles.genderOptionTextActive,
                        ]}
                      >
                        {g === "male" ? "Male" : "Female"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.infoValue, !formData.gender && styles.infoValueEmpty]}>
                  {formData.gender ? (formData.gender === "male" ? "Male" : "Female") : "Not provided"}
                </Text>
              )}
            </View>

            <InfoRow label="Primary Mobile" editing={editing} editable={false} value={formData.mobileNumber} />
            <InfoRow
              label="WhatsApp Number"
              editing={editing}
              value={formData.whatsappNumber}
              onChangeText={(text) => setFormData({ ...formData, whatsappNumber: text })}
              keyboardType="phone-pad"
            />
            <InfoRow
              label="Email"
              required
              editing={editing}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
            <InfoRow
              label="PAN Number"
              required
              last
              editing={editing}
              editable={!panVerified}
              verified={panVerified}
              value={formData.panNumber}
              onChangeText={(text) => {
                setFormData({ ...formData, panNumber: text.toUpperCase() });
                setPanVerified(false);
              }}
              placeholder="ABCDE1234F"
              autoCapitalize="characters"
              maxLength={10}
            />
          </View>

          {editing && (
            <View style={styles.editActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditing(false)}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    {verifyingPan && (
                      <Text style={[styles.saveBtnText, { marginLeft: 8 }]}>Verifying PAN…</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
        </FadeSlideIn>

        {/* ── Quick Links ── */}
        <FadeSlideIn delay={300}>
        <View style={styles.card}>
          <GroupHead icon="grid-outline" title="Quick Links" />

          <View style={styles.linkGrid}>
            {[
              {
                icon: "headset-outline",
                label: "Help & Support",
                onPress: () => Linking.openURL("mailto:support@askoxy.ai"),
              },
              {
                icon: "shield-checkmark-outline",
                label: "Privacy Policy",
                onPress: () => navigation.navigate("PgPrivacyPolicy"),
              },
              {
                icon: "document-text-outline",
                label: "Terms & Conditions",
                onPress: () => navigation.navigate("PgTerms"),
              },
              {
                icon: "cube-outline",
                label: "Shipping Policy",
                onPress: () => navigation.navigate("PgShippingPolicy"),
              },
              {
                icon: "return-down-back-outline",
                label: "Return & Refund Policy",
                onPress: () => navigation.navigate("PgReturnRefundPolicy"),
              },
              {
                icon: "close-circle-outline",
                label: "Cancellation Policy",
                onPress: () => navigation.navigate("PgCancellationPolicy"),
              },
              {
                icon: "help-circle-outline",
                label: "FAQs",
                onPress: () => navigation.navigate("PgFAQ"),
              },
              {
                icon: "settings-outline",
                label: "Cookie Policy",
                onPress: () => navigation.navigate("PgCookiePolicy"),
              },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.linkTile}
                onPress={item.onPress || undefined}
                activeOpacity={item.onPress ? 0.75 : 1}
              >
                <View style={styles.linkIconWrap}>
                  <Ionicons name={item.icon} size={17} color={T.gold} />
                </View>
                <Text style={styles.linkText} numberOfLines={2}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={T.faint} style={styles.linkChevron} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        </FadeSlideIn>

        {/* ── Logout ── */}
        <FadeSlideIn delay={340}>
        <TouchableOpacity
          style={[styles.logoutBtn, logoutLoading && styles.logoutBtnDisabled]}
          onPress={handleLogoutPress}
          disabled={logoutLoading}
          activeOpacity={0.7}
        >
          {logoutLoading ? (
            <ActivityIndicator size="small" color={T.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={17} color={T.danger} />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
        </FadeSlideIn>
      </ScrollView>
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },

  shimmerBody: { padding: 0 },
  shimmerHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 18,
  },

  // ── Identity ──
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarImg: { width: "100%", height: "100%" },
  heroInfo: { flex: 1, minWidth: 0 },
  heroName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  heroEmail: { fontSize: 12.5, fontWeight: "400", color: "rgba(255,255,255,0.75)" },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 6,
  },
  idBadgeText: { fontSize: 10.5, fontWeight: "600", color: "#fff" },
  heroEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroEditBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },

  // ── Quick stats (Wallet / Orders / Wishlist / Addresses) ──
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: T.divider,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: T.goldTint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: { fontSize: 11.5, fontWeight: "400", color: T.subtle, marginBottom: 3 },
  statValueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  statValue: { flex: 1, fontSize: 14, fontWeight: "600", color: T.ink },

  // ── Group head — icon box + title/subtitle + optional Edit pill ──
  groupHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  groupIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: T.goldTint,
    justifyContent: "center",
    alignItems: "center",
  },
  groupTitle: { fontSize: 14.5, fontWeight: "600", color: T.ink },
  groupSubtitle: { fontSize: 11.5, fontWeight: "400", color: T.subtle, marginTop: 1 },
  groupEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.goldTint,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  groupEditBtnText: { fontSize: 11.5, fontWeight: "600", color: T.gold },

  // ── Cards ──
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.divider,
    shadowColor: "rgba(28,28,30,0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },

  // ── Info list — one row per field ──
  infoList: { marginTop: 2 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 12,
  },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: T.divider },
  infoRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 },
  infoLabel: {
    fontSize: 13,
    fontWeight: "400",
    color: T.subtle,
    flexShrink: 0,
  },
  fieldLabelRequired: { color: T.danger },
  infoValueRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  infoValue: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: "500",
    color: T.ink,
    textAlign: "right",
  },
  infoValueEmpty: { fontWeight: "400", color: T.faint, fontStyle: "italic" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 },
  verifiedBadgeText: { fontSize: 10.5, fontWeight: "600", color: T.gold },
  infoInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    color: T.ink,
    paddingVertical: 0,
  },
  genderRow: { flexDirection: "row", gap: 8 },
  genderOption: {
    backgroundColor: T.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
  },
  genderOptionActive: {
    backgroundColor: T.goldTint,
    borderColor: T.goldBorder,
  },
  genderOptionText: { fontSize: 13, fontWeight: "500", color: T.subtle },
  genderOptionTextActive: { color: T.gold, fontWeight: "600" },

  // Edit mode actions — Cancel (outlined) + Save (filled), side by side
  editActionsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: T.divider,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: T.subtle },
  saveBtn: {
    flex: 1,
    backgroundColor: T.ink,
    borderRadius: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: T.faint },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // ── Quick Links ──
  linkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  linkTile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: T.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.divider,
    padding: 12,
    gap: 8,
  },
  linkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: T.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.divider,
  },
  linkText: { fontSize: 12.5, fontWeight: "500", color: T.ink, lineHeight: 16 },
  linkChevron: { position: "absolute", top: 12, right: 12 },

  // ── Logout ──
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.divider,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 2,
    marginBottom: 20,
  },
  logoutBtnDisabled: { opacity: 0.6 },
  logoutBtnText: { fontSize: 13.5, fontWeight: "600", color: T.danger },
});

export default PgProfileScreen;
