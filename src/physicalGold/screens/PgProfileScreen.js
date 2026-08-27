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
} from "../../store/authSlice";
import { apiGet, apiPost } from "../../services/apiClient";
import { handleLogout } from "../../services/logoutService";
import { PHYSICAL_GOLD_BASE_URL } from "../../constants/api";
import PgLayout from "../components/PgLayout";

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

// ─── Section Header — minimal: dark semibold title, gold text-only action ──
const SectionHeader = ({ title, action, actionLabel }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity
        onPress={action}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text
          style={[
            styles.sectionAction,
            actionLabel === "Cancel" && styles.sectionActionMuted,
          ]}
        >
          {actionLabel}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── InfoRow — one line per field: label left, value/input right ───────────
const InfoRow = ({ label, required, value, placeholder, editing, editable = true, onChangeText, last, ...inputProps }) => (
  <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
    <Text style={styles.infoLabel}>
      {label}
      {required && <Text style={styles.fieldLabelRequired}> *</Text>}
    </Text>
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
      <Text style={styles.infoValue} numberOfLines={1}>
        {value || "—"}
      </Text>
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
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [panVerified, setPanVerified] = useState(false);
  const [verifyingPan, setVerifyingPan] = useState(false);

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
    // Validate name fields - only letters and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (formData.firstName && !nameRegex.test(formData.firstName)) {
      Alert.alert("Invalid Name", "First name should contain only letters");
      return;
    }
    if (formData.lastName && !nameRegex.test(formData.lastName)) {
      Alert.alert("Invalid Name", "Last name should contain only letters");
      return;
    }

    // Validate email format with better domain checking
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (formData.email && !emailRegex.test(formData.email)) {
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

    // Validate phone numbers (10 digits starting with 6-9)
    if (formData.alterMobileNumber) {
      if (!/^\d{10}$/.test(formData.alterMobileNumber)) {
        Alert.alert("Invalid Number", "Alternative mobile number must be exactly 10 digits");
        return;
      }
      if (!/^[6-9]/.test(formData.alterMobileNumber)) {
        Alert.alert("Invalid Number", "Alternative mobile number must start with 6, 7, 8, or 9");
        return;
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
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* ── Identity ── */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={T.gold} />
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>
              {formData.email || userEmail || "user@example.com"}
            </Text>
          </View>

          <View style={styles.idBadge}>
            <View style={styles.idDot} />
            <Text style={styles.idBadgeText}>ID {userId}</Text>
          </View>
        </View>

        {/* ── Wallet ── */}
        <TouchableOpacity
          style={styles.walletRow}
          onPress={() => navigation.navigate("PgWallet", { userId })}
          activeOpacity={0.7}
        >
          <View style={styles.walletIconWrap}>
            <Ionicons name="wallet-outline" size={18} color={T.gold} />
          </View>

          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmount}>
              ₹{Number(wallet).toLocaleString("en-IN")}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={T.faint} />
        </TouchableOpacity>

        {/* ── Personal Information ── */}
        <View style={styles.card}>
          <SectionHeader
            title="Personal Information"
            action={() => setEditing(!editing)}
            actionLabel={editing ? "Cancel" : "Edit"}
          />

          <View style={styles.infoList}>
            <InfoRow
              label="First Name"
              required
              editing={editing}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            />
            <InfoRow
              label="Last Name"
              required
              editing={editing}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            />
            <InfoRow label="Primary Mobile" editing={editing} editable={false} value={formData.mobileNumber} />
            <InfoRow
              label="Email"
              required
              editing={editing}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
            <InfoRow
              label="Alternative Mobile"
              required
              editing={editing}
              value={formData.alterMobileNumber}
              onChangeText={(text) => setFormData({ ...formData, alterMobileNumber: text })}
              keyboardType="phone-pad"
            />
            <InfoRow
              label="WhatsApp Number"
              editing={editing}
              value={formData.whatsappNumber}
              onChangeText={(text) => setFormData({ ...formData, whatsappNumber: text })}
              keyboardType="phone-pad"
            />

            <View style={[styles.infoRow, styles.infoRowDivider]}>
              <Text style={styles.infoLabel}>
                Gender<Text style={styles.fieldLabelRequired}> *</Text>
              </Text>
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
                <Text style={styles.infoValue}>
                  {formData.gender ? (formData.gender === "male" ? "Male" : "Female") : "—"}
                </Text>
              )}
            </View>

            <InfoRow
              label="PAN Number"
              required
              last
              editing={editing}
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
              onPress: () => navigation.navigate("PgTerms"),
            },
          ].map((item, index, arr) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.linkItem}
                onPress={item.onPress || undefined}
                activeOpacity={item.onPress ? 0.7 : 1}
              >
                <View style={styles.linkIconWrap}>
                  <Ionicons name={item.icon} size={17} color={T.gold} />
                </View>
                <Text style={styles.linkText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={T.faint} />
              </TouchableOpacity>
              {index < arr.length - 1 && <View style={styles.linkDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Logout ── */}
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
      </Animated.ScrollView>
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
    backgroundColor: T.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 10,
    shadowColor: "rgba(28,28,30,0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.goldTint,
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfo: { flex: 1, minWidth: 0 },
  heroName: {
    fontSize: 16,
    fontWeight: "600",
    color: T.ink,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  heroEmail: { fontSize: 12.5, fontWeight: "400", color: T.subtle },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: T.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  idDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.gold },
  idBadgeText: { fontSize: 10.5, fontWeight: "500", color: T.subtle },

  // ── Wallet ──
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: T.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: "rgba(28,28,30,0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  walletIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.goldTint,
    justifyContent: "center",
    alignItems: "center",
  },
  walletInfo: { flex: 1 },
  walletLabel: { fontSize: 11.5, fontWeight: "400", color: T.subtle, marginBottom: 2 },
  walletAmount: { fontSize: 19, fontWeight: "600", color: T.ink, letterSpacing: -0.3 },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: T.ink, letterSpacing: -0.1 },
  sectionAction: { fontSize: 13, fontWeight: "600", color: T.gold },
  sectionActionMuted: { color: T.subtle },

  // ── Cards ──
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
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
  infoLabel: {
    fontSize: 13,
    fontWeight: "400",
    color: T.subtle,
    flexShrink: 0,
  },
  fieldLabelRequired: { color: T.danger },
  infoValue: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    color: T.ink,
    textAlign: "right",
  },
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

  // Save button
  saveBtn: {
    backgroundColor: T.gold,
    borderRadius: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnDisabled: { backgroundColor: T.faint },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // ── Quick Links ──
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  linkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: T.goldTint,
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: { flex: 1, fontSize: 13.5, fontWeight: "500", color: T.ink },
  linkDivider: { height: 1, backgroundColor: T.divider },

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
