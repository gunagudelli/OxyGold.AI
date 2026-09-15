import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
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
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import { getUserOrders, getUserAddresses } from "./physicalGoldApi";

// ─── Design Tokens — premium, restrained. One accent, used sparingly. ────────
const T = {
  ink: "#1C1C1E",
  subtle: "#7A7A80",
  faint: "#ACACB2",
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  divider: "#EDEBE7",
  gold: "#0E6B57",
  goldTint: "rgba(14,107,87,0.08)",
  goldBorder: "rgba(14,107,87,0.24)",
  danger: "#C0392B",
};

// ─── SectionHead — title + optional subtitle above a group of rows ──────────
const SectionHead = ({ title, subtitle }) => (
  <View style={styles.sectionHead}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
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
      const [ordersRes, addressesRes] = await Promise.allSettled([
        getUserOrders(userId),
        getUserAddresses(userId),
      ]);
      if (ordersRes.status === "fulfilled") setOrdersCount(ordersRes.value?.length || 0);
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
            const store = require("../../store/index").default;
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
        <PgLoader label="Loading profile..." />
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
        {/* ── Profile Hero — light gold fading to white, same family as
            Home's Delivery/Banner sections, not a bold solid block. ── */}
        <FadeSlideIn delay={0}>
        <LinearGradient
          colors={["rgba(14,107,87,0.32)", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
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
              color={T.ink}
            />
            <Text style={styles.heroEditBtnText}>{editing ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        </LinearGradient>
        </FadeSlideIn>

        {/* ── One cohesive panel: Summary, Info, Actions ── */}
        <FadeSlideIn delay={60}>
        <View style={styles.panel}>

        {/* ── Account Summary — light gold tint, like Home's sections ── */}
        <View style={[styles.statsRow, styles.statsRowTinted]}>
          <TouchableOpacity
            style={[styles.statCol, styles.statColDivider]}
            onPress={() => navigation.navigate("PgWallet", { userId })}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue} numberOfLines={1}>
              ₹{Number(wallet).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCol, styles.statColDivider]}
            onPress={() => navigation.navigate("PgOrders", { userId })}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue} numberOfLines={1}>{ordersCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCol}
            onPress={() => navigation.navigate("PgAddress", { userId })}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue} numberOfLines={1}>{addressesCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Addresses</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hairline} />

        {/* ── Personal Information — plain white ── */}
        <View style={styles.section}>
          <SectionHead
            title="Personal Information"
            subtitle="Your personal, contact & KYC information"
          />

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

        <View style={styles.hairline} />

        {/* ── Quick Actions ── */}
        <View style={[styles.section, { marginBottom: 0 }]}>
          <SectionHead title="Quick Actions" />
          {[
            {
              icon: "headset-outline",
              label: "Help & Support",
              onPress: () => navigation.navigate("PgSupport"),
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
          ].map((item, idx, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.linkRow, idx < arr.length - 1 && styles.infoRowDivider]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.linkIconBox}>
                <Ionicons name={item.icon} size={15} color={T.gold} />
              </View>
              <Text style={styles.linkRowText} numberOfLines={1}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={T.faint} />
            </TouchableOpacity>
          ))}
        </View>

        </View>
        </FadeSlideIn>

        {/* ── Logout — clean outlined pill, outside the panel ── */}
        <FadeSlideIn delay={80}>
        <TouchableOpacity
          style={[styles.logoutBtn, logoutLoading && styles.logoutBtnDisabled]}
          onPress={handleLogoutPress}
          disabled={logoutLoading}
          activeOpacity={0.75}
        >
          {logoutLoading ? (
            <ActivityIndicator size="small" color={T.danger} />
          ) : (
            <Text style={styles.logoutBtnText}>Logout</Text>
          )}
        </TouchableOpacity>
        </FadeSlideIn>
      </ScrollView>
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48, backgroundColor: T.bg },

  // ── The one cohesive surface — Summary through Quick Actions live here ──
  panel: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 18,
    marginTop: 12,
    shadowColor: "rgba(28,28,30,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 1,
  },

  // ── Hairline between sections inside the panel ──
  hairline: { height: 1, backgroundColor: T.divider, marginVertical: 18 },

  // ── Profile hero — a full-bleed banner flush with the header, not a
  // rounded container floating inside the page's side padding ──
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: -16,
    marginTop: -8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 18,
    paddingHorizontal: 16 + 18,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(28,28,30,0.18)",
  },
  avatarImg: { width: "100%", height: "100%" },
  heroInfo: { flex: 1, minWidth: 0 },
  heroName: {
    fontSize: 15.5,
    fontWeight: "700",
    color: T.ink,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  heroEmail: { fontSize: 11.5, fontWeight: "400", color: T.subtle },
  idBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(28,28,30,0.06)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 6,
  },
  idBadgeText: { fontSize: 10.5, fontWeight: "700", color: T.ink, letterSpacing: 0.2 },
  heroEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(28,28,30,0.2)",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  heroEditBtnText: { fontSize: 12, fontWeight: "600", color: T.ink },

  // ── Account summary — three plain columns, small icon chips ──
  statsRow: { flexDirection: "row" },
  statsRowTinted: {
    backgroundColor: "rgba(14,107,87,0.16)",
    borderRadius: 14,
    paddingVertical: 6,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 2,
  },
  statColDivider: { borderRightWidth: 1, borderRightColor: T.divider },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: T.goldTint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  // ── Same lavender / burgundy / plum family used on Home, each on a light
  // grey-tinted box — so the three stats read as distinct, not one flat green ──
  statIconBoxWallet:    { backgroundColor: "rgba(150,140,210,0.16)" },
  statIconBoxOrders:    { backgroundColor: "rgba(140,47,59,0.14)" },
  statIconBoxAddresses: { backgroundColor: "rgba(106,44,110,0.14)" },
  statLabel: { fontSize: 10.5, fontWeight: "400", color: T.subtle },
  statValue: { fontSize: 14, fontWeight: "700", color: T.ink },

  // ── Section — no extra card, lives inside the shared panel ──
  section: { marginBottom: 4 },
  sectionHead: { marginBottom: 14 },
  sectionTitle: { fontSize: 13.5, fontWeight: "700", color: T.ink },
  sectionSubtitle: { fontSize: 11, fontWeight: "400", color: T.subtle, marginTop: 2 },

  // ── Info list — one row per field ──
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 13,
  },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: T.divider },
  infoRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 },
  infoLabel: {
    fontSize: 12.5,
    fontWeight: "400",
    color: T.subtle,
    flexShrink: 0,
  },
  fieldLabelRequired: { color: T.danger },
  infoValueRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  infoValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: T.ink,
    textAlign: "right",
  },
  infoValueEmpty: { fontWeight: "400", color: T.faint, fontStyle: "italic" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },
  verifiedBadgeText: { fontSize: 10, fontWeight: "700", color: T.gold },
  infoInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: T.ink,
    paddingVertical: 0,
  },
  genderRow: { flexDirection: "row", gap: 8 },
  genderOption: {
    backgroundColor: T.bg,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.divider,
    justifyContent: "center",
  },
  genderOptionActive: {
    backgroundColor: T.goldTint,
    borderColor: T.goldBorder,
  },
  genderOptionText: { fontSize: 12, fontWeight: "500", color: T.subtle },
  genderOptionTextActive: { color: T.gold, fontWeight: "700" },

  // Edit mode actions — Cancel (outlined) + Save (filled), side by side
  editActionsRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: T.divider,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: T.subtle },
  saveBtn: {
    flex: 1,
    backgroundColor: T.gold,
    borderRadius: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: T.faint },
  saveBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  // ── Quick Actions — plain list rows, small rounded icon container ──
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  linkIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: T.goldTint,
    justifyContent: "center",
    alignItems: "center",
  },
  linkRowText: { flex: 1, fontSize: 13, fontWeight: "500", color: T.ink },

  // ── Logout — clean outlined secondary button, not visually dominant ──
  logoutBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.divider,
    backgroundColor: T.surface,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  logoutBtnDisabled: { opacity: 0.6 },
  logoutBtnText: { fontSize: 13, fontWeight: "600", color: T.danger },
});

export default PgProfileScreen;
