import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Alert,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { checkWebhookStatus } from "../services/goldApi";

const MAX_ATTEMPTS = 20;
const INTERVAL_MS = 3000;

// ── Polling View ──────────────────────────────────────────────────────────────
const PollingView = ({
  amount,
  grams,
  method,
  statusText,
  pollAttempt,
  spinAnim,
}) => {
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  return (
    <View style={s.center}>
      <View style={s.spinnerOuter}>
        <Animated.View style={[s.spinner, { transform: [{ rotate: spin }] }]}>
          <View style={s.spinnerArc} />
        </Animated.View>
        <View style={s.spinnerInner}>
          <Ionicons name="ellipse" size={28} color="#f0bb3a" />
        </View>
      </View>
      <Text style={s.title}>Confirming Payment</Text>
      <Text style={s.statusText}>{statusText}</Text>
      {pollAttempt > 1 && (
        <Text style={s.attemptText}>
          Checking... {pollAttempt}/{MAX_ATTEMPTS}
        </Text>
      )}
      <View style={s.infoCard}>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Amount</Text>
          <Text style={s.infoValue}>
            ₹
            {Number(amount).toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Gold</Text>
          <Text style={[s.infoValue, { color: "#f0bb3a" }]}>
            {Number(grams).toFixed(4)} grams
          </Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Payment via</Text>
          <Text style={s.infoValue}>{method || "UPI"}</Text>
        </View>
      </View>
      <Text style={s.note}>
        Please do not close the app{"\n"}or press the back button
      </Text>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const PaymentProcessingScreen = ({ navigation, route }) => {
  const { orderId, paymentSessionId, amount, grams, method } = route.params;
  console.log("[PaymentProcess] Received params:", route.params);

  // Strip backend corruption: trailing 'payment' / 'paymentpayment'
  const cleanSessionId =
    paymentSessionId?.replace(/(payment)+$/i, "").trim() || "";
  const isValidSession =
    cleanSessionId.startsWith("session_") && cleanSessionId.length > 20;

  // Production Cashfree hosted checkout — the web app's equivalent checkout
  // (PaymentMethod.tsx) loads Cashfree with `mode: 'production'`, and the
  // backend issues production session tokens, so this must point at
  // payments.cashfree.com, not sandbox.
  const checkoutUrl = `https://payments.cashfree.com/pg/view/sessions/${cleanSessionId}`;

  console.log("[PaymentProcess] orderId:", orderId);
  console.log("[PaymentProcess] raw sessionId:", paymentSessionId);
  console.log("[PaymentProcess] clean sessionId:", cleanSessionId);
  console.log("[PaymentProcess] isValid:", isValidSession);
  console.log("[PaymentProcess] checkoutUrl:", checkoutUrl);

  const [phase, setPhase] = useState("checkout");
  const [statusText, setStatusText] = useState("Verifying payment...");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [webviewKey, setWebviewKey] = useState(1);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const attempt = useRef(0);
  const pollRef = useRef(null);
  const pollingStarted = useRef(false);
  const httpErrorCount = useRef(0);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── Webhook polling ────────────────────────────────────────────────────────
  const startPolling = () => {
    if (pollingStarted.current) return;
    pollingStarted.current = true;
    setPhase("polling");

    const poll = async () => {
      attempt.current += 1;
      setPollAttempt(attempt.current);
      console.log(
        `[Webhook] Attempt ${attempt.current}/${MAX_ATTEMPTS} orderId: ${orderId}`,
      );

      if (attempt.current <= 3) setStatusText("Verifying payment...");
      else if (attempt.current <= 7)
        setStatusText("Confirming with payment gateway...");
      else if (attempt.current <= 12)
        setStatusText("Allocating gold to your vault...");
      else setStatusText("Almost done, please wait...");

      try {
        const result = await checkWebhookStatus(orderId);
        console.log("[Webhook] Status:", result.status);

        if (result.status === "SUCCESS") {
          clearInterval(pollRef.current);
          navigation.replace("PaymentSuccess", {
            transactionId: result.transactionId || orderId,
            amount: result.amount || amount,
            grams: result.grams || grams,
          });
          return;
        }

        if (["FAILED", "FAILURE", "CANCELLED"].includes(result.status)) {
          clearInterval(pollRef.current);
          Alert.alert(
            "Payment Failed",
            "Your payment could not be processed. Please try again.",
            [{ text: "OK", onPress: () => navigation.navigate("Dashboard") }],
          );
          return;
        }

        if (attempt.current >= MAX_ATTEMPTS) {
          clearInterval(pollRef.current);
          Alert.alert(
            "Taking longer than usual",
            "Your payment is being processed. Check your portfolio in a few minutes.",
            [
              {
                text: "Check Portfolio",
                onPress: () => navigation.navigate("Dashboard"),
              },
            ],
          );
        }
      } catch {
        // network hiccup — keep polling
      }
    };

    pollRef.current = setInterval(poll, INTERVAL_MS);
    poll();
  };

  // ── URL change — Cashfree redirects away when payment done ────────────────
  const handleNavigationChange = (navState) => {
    const { url, loading } = navState;
    if (!url || loading) return;
    if (url === "about:blank" || url === "about:srcdoc") return;
    console.log("[Cashfree] URL:", url);

    const isCashfreeDomain =
      url.includes("sandbox.cashfree.com") ||
      url.includes("payments.cashfree.com") ||
      url.includes("cashfree.com");

    if (!isCashfreeDomain && !pollingStarted.current) {
      console.log("[Cashfree] Left cashfree domain → starting polling");
      startPolling();
    }
  };

  // ── 404 handler ───────────────────────────────────────────────────────────
  const handleHttpError = (e) => {
    const { statusCode, url } = e.nativeEvent;
    console.log("[WebView HTTP Error]", statusCode, url);
    if (statusCode === 404) {
      httpErrorCount.current += 1;
      if (httpErrorCount.current >= 2) {
        Alert.alert(
          "Payment Session Error",
          "Could not load the payment page. The session may have expired. Please try again.",
          [
            { text: "Go Back", onPress: () => navigation.goBack() },
            {
              text: "Dashboard",
              onPress: () => navigation.navigate("Dashboard"),
            },
          ],
        );
      } else {
        setTimeout(() => setWebviewKey((k) => k + 1), 1500);
      }
    }
  };

  // ── Invalid session screen ────────────────────────────────────────────────
  if (!isValidSession) {
    return (
      <SafeAreaView style={s.root} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1f3c" />
        <View style={s.center}>
          <Text style={s.title}>Payment Error</Text>
          <Text style={s.statusText}>
            Invalid payment session.{"\n"}Please go back and try again.
          </Text>
          <TouchableOpacity
            style={s.errorBtn}
            onPress={() => navigation.navigate("Dashboard")}
          >
            <Text style={s.errorBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1f3c" />

      {phase === "checkout" ? (
        <View style={{ flex: 1 }}>
          <View style={s.webviewHeader}>
            <Text style={s.webviewTitle}>Complete Payment</Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Cancel Payment?",
                  "Are you sure you want to cancel this payment?",
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes, Cancel",
                      style: "destructive",
                      onPress: () => navigation.navigate("Dashboard"),
                    },
                  ],
                )
              }
            >
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <WebView
            key={webviewKey}
            source={{ uri: checkoutUrl }}
            style={s.webview}
            onNavigationStateChange={handleNavigationChange}
            onError={(e) =>
              console.log("[WebView Error]", e.nativeEvent.description)
            }
            onHttpError={handleHttpError}
            renderLoading={() => (
              <View style={s.loadingOverlay}>
                <ActivityIndicator size="large" color="#f0bb3a" />
                <Text style={s.loadingText}>Loading payment...</Text>
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            originWhitelist={["*"]}
            mixedContentMode="always"
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
          />
        </View>
      ) : (
        <PollingView
          amount={amount}
          grams={grams}
          method={method}
          statusText={statusText}
          pollAttempt={pollAttempt}
          spinAnim={spinAnim}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1f3c" },
  webview: { flex: 1 },

  webviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#0d1f3c",
  },
  webviewTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cancelText: { fontSize: 14, color: "#f0bb3a", fontWeight: "600" },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0d1f3c",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  spinnerOuter: {
    width: 110,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 36,
  },
  spinner: { position: "absolute", width: 110, height: 110, borderRadius: 55 },
  spinnerArc: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "transparent",
    borderTopColor: "#f0bb3a",
    borderRightColor: "rgba(240,187,58,0.3)",
  },
  spinnerInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(240,187,58,0.1)",
    borderWidth: 1,
    borderColor: "rgba(240,187,58,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 10 },
  statusText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 32,
    textAlign: "center",
  },
  attemptText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    marginTop: -24,
    marginBottom: 24,
  },

  infoCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(240,187,58,0.15)",
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, color: "rgba(255,255,255,0.45)" },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#fff" },

  note: {
    marginTop: 28,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    lineHeight: 18,
  },

  errorBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "#f0bb3a",
    borderRadius: 8,
  },
  errorBtnText: { color: "#0d1f3c", fontWeight: "700", fontSize: 14 },
});

export default PaymentProcessingScreen;
