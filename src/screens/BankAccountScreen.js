import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { apiPost, apiGet } from "../services/apiClient";
import { PHYSICAL_GOLD_BASE_URL } from "../constants/api";
import { COLORS } from "../constants/theme";

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const C = {
  bg: COLORS.bg,
  card: COLORS.bgCard,
  navy: COLORS.navy,
  navySoft: COLORS.navySoft,
  textMuted: COLORS.textMuted,
  gold: COLORS.goldMid,
  goldPale: COLORS.goldPale,
  green: COLORS.green,
  greenBg: COLORS.greenBg,
  red: COLORS.red,
  border: COLORS.border,
};

const CTA = "#1A1A1A";

const BankAccountScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const returnTo = route?.params?.returnTo;

  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(true);
  const [hasExisting, setHasExisting] = useState(false);

  // ── Prefill from existing bank details, if any (so "Change" isn't a blank retype) ──
  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      if (!userId) {
        setPrefillLoading(false);
        return;
      }
      try {
        const data = await apiGet(
          `${PHYSICAL_GOLD_BASE_URL}/auth/getBankDetailsByuserId?userId=${userId}`
        );
        const list = data?.data;
        const existing = Array.isArray(list) && list.length > 0 ? list[0] : data;
        if (!cancelled && existing?.accountNumber) {
          setAccountNumber(existing.accountNumber);
          setConfirmAccountNumber(existing.accountNumber);
          setIfscCode(existing.ifsc || "");
          setHasExisting(true);
        }
      } catch {
        // No existing details yet — that's the normal "Add Bank" case, not an error.
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    };
    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSubmit = useCallback(async () => {
    const trimmedAccount = accountNumber.trim();
    const trimmedConfirm = confirmAccountNumber.trim();
    const trimmedIfsc = ifscCode.trim().toUpperCase();

    if (!trimmedAccount || !trimmedConfirm || !trimmedIfsc) {
      Alert.alert("Missing Details", "Please fill all fields");
      return;
    }
    if (trimmedAccount.length < 9 || trimmedAccount.length > 18) {
      Alert.alert("Invalid Account Number", "Account number must be 9–18 digits");
      return;
    }
    if (trimmedAccount !== trimmedConfirm) {
      Alert.alert("Account Numbers Don't Match", "Please re-check both account number fields");
      return;
    }
    if (!IFSC_REGEX.test(trimmedIfsc)) {
      Alert.alert("Invalid IFSC Code", "Enter a valid 11-character IFSC code, e.g. SBIN0001234");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: Number(userId),
        accountNumber: trimmedAccount,
        ifsc: trimmedIfsc,
        beneActive: false,
      };

      await apiPost(`${PHYSICAL_GOLD_BASE_URL}/auth/saveBankDetails`, payload);

      Alert.alert("Success", "Bank details saved successfully", [
        {
          text: "OK",
          onPress: () =>
            returnTo
              ? navigation.navigate(returnTo, { ...route.params })
              : navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to save bank details");
    } finally {
      setLoading(false);
    }
  }, [accountNumber, confirmAccountNumber, ifscCode, userId, returnTo, navigation, route?.params]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bank Details</Text>
        <View style={s.headerRightSpace} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {prefillLoading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color={C.gold} size="small" />
            </View>
          ) : (
            <>
              <View style={s.infoStrip}>
                <Ionicons name="information-circle" size={16} color={C.green} />
                <Text style={s.infoText}>Funds credited within T+1 working day</Text>
              </View>

              {hasExisting && (
                <View style={s.existingBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={C.green} />
                  <Text style={s.existingBadgeText}>
                    Bank account on file — update the fields below to change it
                  </Text>
                </View>
              )}

              <View style={s.card}>
                <View style={s.fieldGroup}>
                  <Text style={s.label}>Account Number</Text>
                  <View style={s.inputWrapper}>
                    <Ionicons name="card-outline" size={18} color={C.navySoft} style={s.icon} />
                    <TextInput
                      style={s.input}
                      placeholder="9–18 digit number"
                      placeholderTextColor="#D1D5DB"
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      keyboardType="numeric"
                      maxLength={18}
                    />
                  </View>
                </View>

                <View style={s.fieldGroup}>
                  <Text style={s.label}>Confirm Account Number</Text>
                  <View style={s.inputWrapper}>
                    <Ionicons name="checkmark-done-outline" size={18} color={C.navySoft} style={s.icon} />
                    <TextInput
                      style={s.input}
                      placeholder="Re-enter account number"
                      placeholderTextColor="#D1D5DB"
                      value={confirmAccountNumber}
                      onChangeText={setConfirmAccountNumber}
                      keyboardType="numeric"
                      maxLength={18}
                    />
                  </View>
                  {confirmAccountNumber.length > 0 &&
                    confirmAccountNumber !== accountNumber && (
                      <Text style={s.fieldError}>Account numbers don't match</Text>
                    )}
                </View>

                <View style={[s.fieldGroup, { marginBottom: 0 }]}>
                  <Text style={s.label}>IFSC Code</Text>
                  <View style={s.inputWrapper}>
                    <Ionicons name="business-outline" size={18} color={C.navySoft} style={s.icon} />
                    <TextInput
                      style={s.input}
                      placeholder="e.g. SBIN0001234"
                      placeholderTextColor="#D1D5DB"
                      value={ifscCode}
                      onChangeText={(t) => setIfscCode(t.toUpperCase())}
                      maxLength={11}
                      autoCapitalize="characters"
                    />
                  </View>
                  {ifscCode.length === 11 && !IFSC_REGEX.test(ifscCode) && (
                    <Text style={s.fieldError}>That doesn't look like a valid IFSC code</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.btnText}>
                    {hasExisting ? "Update Bank Details" : "Save Bank Details"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 6 : 10,
    paddingBottom: 10,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.navy, letterSpacing: 0.1 },
  headerRightSpace: { width: 36 },

  scroll: { padding: 16, paddingBottom: 40 },

  loadingBox: { paddingVertical: 60, alignItems: "center" },

  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.greenBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { fontSize: 12, color: "#2ECC71", fontWeight: "600", flex: 1 },

  existingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  existingBadgeText: { fontSize: 12, color: C.textMuted, flex: 1 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 11.5,
    fontWeight: "600",
    color: C.navySoft,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: C.navy },
  fieldError: { fontSize: 11.5, color: C.red, fontWeight: "600", marginTop: 6 },

  btn: {
    backgroundColor: CTA,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: "700", color: "#fff", letterSpacing: 0.1 },
});

export default BankAccountScreen;
