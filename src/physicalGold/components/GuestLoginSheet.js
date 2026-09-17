import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { setTokens } from "../../store/authSlice";
import { persistTokens } from "../../services/apiClient";
import { API_AUTH, API_ROLE } from "../../constants/api";

const C = {
  emerald: "#0E6B57",
  charcoal: "#1C1C1E",
  muted: "#7A7A80",
  border: "#E7E0DA",
  error: "#C0392B",
};

// ─── Half-screen login sheet ────────────────────────────────────────────────
// Shown in place of a full navigation to the Login screen whenever a guest
// taps something that needs an account (Add to Cart, Buy Now, Wishlist).
// Same phone+OTP flow as LoginScreen, but on success it calls onSuccess()
// instead of navigating anywhere, so the caller can resume the action that
// triggered the login in the first place.
const GuestLoginSheet = ({ visible, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState("phone"); // 'phone' | 'otp'
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [authMode, setAuthMode] = useState("Login"); // 'Login' | 'Register' — whichever the send-OTP step succeeded with
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("phone");
    setPhone("");
    setOtp("");
    setSessionId("");
    setAuthMode("Login");
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Tries a single userType against the send-OTP endpoint, throwing on failure.
  const sendOtpAs = async (userType) => {
    const res = await fetch(API_AUTH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: phone,
        registrationType: "mobile",
        userType,
        userRole: "user",
        whatsappNumber: "",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to send OTP");
    return data;
  };

  const handleSendOtp = async () => {
    setError("");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      // We don't know upfront whether this number already has an account —
      // try Login first (the common case for a returning shopper), and if
      // that's rejected (number not registered yet), fall back to Register
      // so a genuinely new guest still gets through in the same flow.
      let data;
      let mode = "Login";
      try {
        data = await sendOtpAs("Login");
      } catch (_) {
        mode = "Register";
        data = await sendOtpAs("Register");
      }
      setAuthMode(mode);
      setSessionId(data?.mobileOtpSessionId || data?.data?.mobileOtpSessionId || "");
      setStep("otp");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (otp.length < 6) {
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
          userType: authMode,
          mobileOtpSessionId: sessionId,
          mobileOtpValue: otp,
          userRole: "user",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Invalid OTP");

      const tokenPayload = data?.data?.accessToken
        ? {
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            expiresIn: data.data.expiresIn,
            userId: data.data.userId,
            userPhone: phone,
            tokenType: data.data.tokenType || "Bearer",
          }
        : {
            accessToken:
              data?.token || data?.data?.token || data?.result?.token || data?.accessToken,
            userId: data?.data?.userId || data?.userId || null,
            userPhone: phone,
          };

      if (!tokenPayload.accessToken) throw new Error("Login failed. Please try again.");

      dispatch(setTokens(tokenPayload));
      await persistTokens(tokenPayload);

      // Assigns the "user" role for a brand-new account — a no-op for one
      // that already has it, so it's safe to call every time rather than
      // trying to detect new-vs-existing first.
      try {
        await fetch(API_ROLE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenPayload.accessToken}`,
          },
          body: JSON.stringify({ role: "user" }),
        });
      } catch (_) {}

      reset();
      onSuccess?.();
    } catch (err) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.overlayTap} activeOpacity={1} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.sheet}
        >
          <View style={s.grabber} />

          <View style={s.headerRow}>
            <Text style={s.title}>{step === "phone" ? "Login to continue" : "Enter OTP"}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={C.muted} />
            </TouchableOpacity>
          </View>

          <Text style={s.subtitle}>
            {step === "phone"
              ? "Sign in to add items to your cart and checkout."
              : `OTP sent to +91 ${phone}`}
          </Text>

          {step === "phone" ? (
            <>
              <View style={s.otpRow}>
                <View style={[s.inputRow, { flex: 1 }]}>
                  <Text style={s.prefix}>+91</Text>
                  <TextInput
                    style={s.input}
                    placeholder="10-digit mobile number"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
                    placeholderTextColor={C.muted}
                  />
                </View>
                <TouchableOpacity
                  style={[s.ctaInline, loading && { opacity: 0.7 }]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.ctaInlineText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>

              {!!error && <Text style={s.errorText}>{error}</Text>}
            </>
          ) : (
            <>
              {/* Field + button side by side — keeps this step short enough
                  that the button always stays above the keyboard, instead of
                  stacking (field, then error, then a full-width button) and
                  risking the button getting pushed out of view. */}
              <View style={s.otpRow}>
                <TextInput
                  style={s.otpInput}
                  placeholder="6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
                  placeholderTextColor={C.muted}
                  autoFocus
                  autoComplete="off"
                  textContentType="oneTimeCode"
                  importantForAutofill="no"
                />
                <TouchableOpacity
                  style={[s.ctaInline, loading && { opacity: 0.7 }]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.ctaInlineText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity onPress={() => setStep("phone")} style={s.changeNumberBtn}>
                <Text style={s.changeNumberText}>Change number</Text>
              </TouchableOpacity>
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default GuestLoginSheet;

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  overlayTap: { flex: 1 },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    minHeight: "48%",
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E7E0DA",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "700", color: C.charcoal },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 6, marginBottom: 20, lineHeight: 18 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  prefix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "600",
    color: C.charcoal,
    backgroundColor: "#F4F5F7",
  },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: C.charcoal },
  otpRow: { flexDirection: "row", gap: 10 },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 4,
    color: C.charcoal,
    textAlign: "center",
  },
  ctaInline: {
    backgroundColor: C.emerald,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaInlineText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  errorText: { color: C.error, fontSize: 12, marginTop: 10 },
  cta: {
    backgroundColor: C.emerald,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  changeNumberBtn: { alignSelf: "center", marginTop: 14 },
  changeNumberText: { color: C.emerald, fontSize: 13, fontWeight: "600" },
});
