import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_AUTH, API_ROLE } from "../constants/api";

const { width: W } = Dimensions.get("window");

const SELECTED_ROLE = "DIGITALGOld";

// ── Colours — warm cream page, matching Login and the rest of the app ──────
const C = {
  bg: "#FBF3E4",
  bgLight: "#1a3060",
  card: "#FBF3E4",
  gold: "#f0bb3a",
  goldDark: "#d9a020",
  navy: "#1C1C1E",
  blue: "#2a4e9e",
  white: "#ffffff",
  label: "#8A7F6E",
  border: "rgba(217,160,32,0.28)",
  inputBg: "#ffffff",
  prefixBg: "#f4f5f7",
  success: "#16a34a",
  successBg: "#f0fdf4",
  successBd: "#bbf7d0",
  error: "#dc2626",
  errorBg: "#fef2f2",
  muted: "#A79C8E",
  text: "#1C1C1E",
};

// ── Slide-in animation hook ───────────────────────────────────────────────────
const useSlideIn = (trigger) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    opacity.setValue(0);
    translateX.setValue(16);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [trigger]);
  return { opacity, transform: [{ translateX }] };
};

// ── OTP Box ───────────────────────────────────────────────────────────────────
// A single-box display driven by one hidden TextInput. Six separate real
// TextInputs (the old approach) each declared textContentType="oneTimeCode",
// which confuses iOS/Android's autofill suggestion — tapping the OS chip can
// fire onChangeText on more than one box at once, corrupting the code. One
// real input (see hiddenOtpInput below) is what the OS actually autofills;
// these boxes just render its value.
const OtpBox = ({ value, filled }) => (
  <View style={[styles.otpBox, filled && styles.otpBoxFilled]}>
    <Text style={styles.otpBoxText}>{value}</Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState("phone"); // 'phone' | 'otp'
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOtpSent, setShowOtpSent] = useState(false);

  const hiddenOtpRef = useRef(null);
  // Removed animation to prevent blinking on navigation

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setError("");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          registrationType: "mobile",
          userType: "Register",
          userRole: "user",
          whatsappNumber: "",
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Failed to send OTP");
      setSessionId(
        data?.mobileOtpSessionId ||
          data?.data?.mobileOtpSessionId ||
          data?.result?.mobileOtpSessionId ||
          "",
      );
      setShowOtpSent(true);
      setTimeout(() => setShowOtpSent(false), 3000);
      setStep("otp");
      setResendTimer(30);
      setTimeout(() => hiddenOtpRef.current?.focus(), 150);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setError("");
    const otpValue = otp;
    if (otpValue.length < 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          registrationType: "mobile",
          userType: "Register",
          mobileOtpSessionId: sessionId,
          mobileOtpValue: otpValue,
          userRole: "user",
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Invalid OTP");

      const token =
        data?.token ||
        data?.data?.token ||
        data?.result?.token ||
        data?.accessToken ||
        data?.data?.accessToken ||
        "";

      await AsyncStorage.setItem(
        "user",
        JSON.stringify({
          phone,
          isLoggedIn: true,
          token,
          role: SELECTED_ROLE,
        }),
      );

      // Create role
      await fetch(API_ROLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: SELECTED_ROLE }),
      });

      setShowSuccess(true);
      setTimeout(() => navigation.replace("PgHome"), 1500);
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP helpers ─────────────────────────────────────────────────────────────
  const handleOtpChange = (val) => {
    setError("");
    setOtp(val.replace(/\D/g, "").slice(0, 6));
  };

  const handleResend = () => {
    setOtp("");
    setError("");
    handleSendOtp();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Plain decorative gold-corner texture, same one Login uses —
            wordmark/tagline are real Text elements below, not baked in. */}
        <Image
          source={require("../../assets/Backgrond image.png")}
          style={styles.screenBg}
          resizeMode="cover"
          pointerEvents="none"
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Card ── */}
          <View style={styles.card}>
            {/* LEFT PANEL — shown on wider screens, hidden on mobile */}
            {W > 600 && (
              <View style={styles.leftPanel}>
                <Image
                  source={require("../../assets/loginImg.png")}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <View style={styles.leftOverlay} />
                <View style={styles.leftContent}>
                  <Text style={styles.logoName}>OXYGOLD.AI</Text>
                  <View>
                    <Text style={styles.tagline}>
                      Start your{"\n"}
                      <Text style={styles.taglineGold}>gold journey</Text>
                      {"\n"}today
                    </Text>
                    <Text style={styles.leftDesc}>
                      Join thousands of smart investors building wealth with
                      digital gold — secure, insured, and always live rates.
                    </Text>
                    <View style={styles.statsRow}>
                      {[
                        ["24K", "Purity"],
                        ["₹100", "Min. Buy"],
                        ["100%", "Insured"],
                      ].map(([v, l]) => (
                        <View key={l} style={styles.stat}>
                          <Text style={styles.statVal}>{v}</Text>
                          <Text style={styles.statLbl}>{l}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* RIGHT PANEL */}
            <View style={styles.rightPanel}>
              <View>
                {step === "phone" ? (
                  <>
                    <View style={styles.wordmarkRow}>
                      <Text style={styles.wordmarkOxy}>OXY</Text>
                      <Text style={styles.wordmarkGold}>GOLD</Text>
                      <Text style={styles.wordmarkAi}>.AI</Text>
                    </View>
                    <Text style={styles.heroTagline}>
                      Pure Gold & Silver Delivered Home
                    </Text>

                    <View style={styles.phonePillWrap}>
                      <Text style={styles.flagEmoji}>🇮🇳</Text>
                      <Text style={styles.countryCodeText}>+91</Text>
                      <Ionicons name="chevron-down" size={13} color={C.muted} />
                      <View style={styles.phonePillDivider} />
                      <TextInput
                        style={styles.phonePillInput}
                        value={phone}
                        onChangeText={(v) => {
                          setPhone(v.replace(/\D/g, "").slice(0, 10));
                          setError("");
                        }}
                        keyboardType="number-pad"
                        placeholder="Enter your mobile number"
                        placeholderTextColor={C.muted}
                        returnKeyType="done"
                        onSubmitEditing={handleSendOtp}
                        maxLength={10}
                      />
                    </View>

                    {error ? (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      onPress={handleSendOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                      style={loading && styles.btnDisabled}
                    >
                      <LinearGradient
                        colors={["#FBDA86", "#E7A730"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.continueBtn}
                      >
                        {loading ? (
                          <ActivityIndicator color={C.navy} size="small" />
                        ) : (
                          <View style={styles.continueBtnInner}>
                            <Text style={styles.continueBtnText}>Continue</Text>
                            <Ionicons name="arrow-forward" size={18} color={C.navy} />
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.trustRow}>
                      <Ionicons name="shield-checkmark-outline" size={15} color={C.goldDark} />
                      <Text style={styles.trustText}>Secure & trusted delivery</Text>
                    </View>

                    <Text style={styles.footerText}>
                      Already have an account?{"  "}
                      <Text
                        style={styles.link}
                        onPress={() => navigation.navigate("Login")}
                      >
                        Sign in
                      </Text>
                    </Text>

                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => navigation.goBack()}
                    >
                      <Text style={styles.backBtnText}>← Back to home</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.formTitle}>Verify OTP</Text>
                    <Text style={styles.formSub}>Code sent to your mobile</Text>

                    {showOtpSent && (
                      <View style={styles.successBox}>
                        <View style={styles.successIcon}>
                          <Text style={styles.successIconText}>✓</Text>
                        </View>
                        <Text style={styles.successText}>
                          OTP sent to +91 {phone}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.changePhoneBtn}
                      onPress={() => {
                        setStep("phone");
                        setOtp("");
                        setError("");
                      }}
                    >
                      <Text style={styles.changePhoneText}>← +91 {phone}</Text>
                    </TouchableOpacity>

                    {/* OTP boxes */}
                    <Text style={styles.fieldLabel}>ENTER 6-DIGIT OTP</Text>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => hiddenOtpRef.current?.focus()}
                    >
                      <View style={styles.otpRow}>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <OtpBox key={i} value={otp[i] || ""} filled={!!otp[i]} />
                        ))}
                      </View>
                    </TouchableOpacity>
                    <TextInput
                      ref={hiddenOtpRef}
                      value={otp}
                      onChangeText={handleOtpChange}
                      onFocus={() => setError("")}
                      keyboardType="number-pad"
                      maxLength={6}
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      style={styles.hiddenOtpInput}
                      caretHidden
                    />

                    <Text style={styles.otpHint}>
                      Didn't receive it?{"  "}
                      {resendTimer > 0 ? (
                        <Text>
                          Resend in{" "}
                          <Text style={styles.otpHintBold}>{resendTimer}s</Text>
                        </Text>
                      ) : (
                        <Text style={styles.resendBtn} onPress={handleResend}>
                          Resend OTP
                        </Text>
                      )}
                    </Text>

                    {showSuccess && (
                      <View style={styles.successBox}>
                        <View style={styles.successIcon}>
                          <Text style={styles.successIconText}>✓</Text>
                        </View>
                        <Text style={styles.successText}>
                          Registration successful! Redirecting...
                        </Text>
                      </View>
                    )}

                    {error ? (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.btn,
                        (loading || otp.length < 6 || showSuccess) &&
                          styles.btnDisabled,
                      ]}
                      onPress={handleVerifyOtp}
                      disabled={
                        loading || otp.length < 6 || showSuccess
                      }
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color={C.navy} size="small" />
                      ) : (
                        <Text style={styles.btnText}>
                          {showSuccess ? "Success!" : "Verify & Continue  →"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // Plain decorative texture — fine to crop with "cover" since there's no
  // baked-in text/content that needs to land in a specific spot.
  screenBg: {
    ...StyleSheet.absoluteFillObject,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignSelf: "center",
    marginBottom: 8,
  },
  wordmarkOxy: { fontSize: 30, fontWeight: "800", color: C.goldDark, letterSpacing: -0.5 },
  wordmarkGold: { fontSize: 30, fontWeight: "800", color: C.navy, letterSpacing: -0.5 },
  wordmarkAi: { fontSize: 30, fontWeight: "800", color: C.goldDark, letterSpacing: -0.5 },
  heroTagline: {
    fontSize: 14,
    color: C.label,
    textAlign: "center",
    marginBottom: 28,
  },

  // Card — no floating-card shadow/border on mobile, sits flush on the
  // cream page. Desktop leftPanel keeps its own dark side-panel look.
  card: {
    width: "100%",
    maxWidth: 720,
    borderRadius: 18,
    overflow: "hidden",
    flexDirection: "row",
  },

  // Left panel
  leftPanel: { width: 280, backgroundColor: "#060f1e", overflow: "hidden" },
  leftOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,15,30,0.65)",
  },
  leftContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 28,
    zIndex: 2,
  },
  logoName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.gold,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 22,
    fontWeight: "700",
    color: C.white,
    lineHeight: 28,
    marginBottom: 10,
  },
  taglineGold: { color: C.gold },
  leftDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.42)",
    lineHeight: 18,
    marginBottom: 20,
  },
  statsRow: { flexDirection: "row", gap: 18 },
  stat: { gap: 2 },
  statVal: { fontSize: 18, fontWeight: "700", color: C.gold },
  statLbl: {
    fontSize: 9,
    color: "rgba(255,255,255,0.32)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Right panel
  rightPanel: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 32,
    justifyContent: "center",
  },

  phonePillWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 16,
    height: 56,
    gap: 8,
  },
  flagEmoji: { fontSize: 18 },
  countryCodeText: { fontSize: 15, fontWeight: "600", color: C.text },
  phonePillDivider: { width: 1, height: 24, backgroundColor: C.border, marginHorizontal: 4 },
  phonePillInput: { flex: 1, fontSize: 15, color: C.text, padding: 0 },

  continueBtn: {
    marginTop: 22,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.goldDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  continueBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  continueBtnText: { fontSize: 16, fontWeight: "700", color: C.navy },

  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  trustText: { fontSize: 12.5, color: C.label, fontWeight: "500" },

  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  formSub: { fontSize: 12, color: C.label, marginBottom: 22 },

  fieldLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: C.label,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 7,
  },

  // Phone input
  phoneWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: C.inputBg,
    marginBottom: 14,
  },
  phonePrefix: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: C.prefixBg,
    borderRightWidth: 1.5,
    borderRightColor: C.border,
  },
  phonePrefixText: { fontSize: 13, fontWeight: "600", color: "#6b82a8" },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: C.text,
  },

  // OTP
  otpRow: { flexDirection: "row", gap: 7, marginBottom: 10 },
  otpBox: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 9,
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxText: { fontSize: 18, fontWeight: "600", color: C.navy },
  otpBoxFilled: { borderColor: C.goldDark, backgroundColor: "#fffcf2" },
  // Sole real input on the whole screen. Tapping any display box above
  // (via the wrapping TouchableOpacity) focuses this one directly, so
  // manual entry never depends on touch passing through an overlay. Kept
  // at 1x1 with near-zero opacity rather than opacity:0/width:0 — some
  // Android autofill heuristics skip fully invisible / zero-size fields
  // when deciding whether to show the SMS-code suggestion chip.
  hiddenOtpInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  otpHint: { fontSize: 11, color: C.label, marginBottom: 14 },
  otpHintBold: { fontWeight: "700", color: C.navy },
  resendBtn: { color: C.goldDark, fontWeight: "600" },

  changePhoneBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    borderWidth: 1,
    borderColor: "#e4e7eb",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 18,
  },
  changePhoneText: { fontSize: 11, color: "#6b82a8" },

  // Feedback
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.successBg,
    borderWidth: 1,
    borderColor: C.successBd,
    borderRadius: 7,
    padding: 10,
    marginBottom: 12,
  },
  successIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.success,
    alignItems: "center",
    justifyContent: "center",
  },
  successIconText: { color: C.white, fontSize: 9, fontWeight: "700" },
  successText: { fontSize: 11, color: C.success, flex: 1 },

  errorBox: {
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
    borderRadius: 7,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 11, color: C.error },

  // Button
  btn: {
    backgroundColor: C.gold,
    borderRadius: 9,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: C.goldDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 13, fontWeight: "700", color: C.navy },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e8ecf0" },
  dividerText: { fontSize: 10, color: C.muted },

  // Footer
  footerText: {
    textAlign: "center",
    fontSize: 12,
    color: C.label,
    marginBottom: 8,
  },
  link: { color: C.goldDark, fontWeight: "600" },

  backBtn: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  backBtnText: { fontSize: 12, color: C.label },
});

export default RegisterScreen;
