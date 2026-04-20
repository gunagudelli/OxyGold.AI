import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  BackHandler,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";
import { selectAccessToken } from "../store/authSlice";
import { BASE_URL } from "../constants/api";

const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  gold: "#C8952A",
  goldLight: "#F5ECD7",
  navy: "#1C2340",
  border: "#EAE8E2",
};

const SELL_EXECUTE_API = `${BASE_URL}/digital-gold/sell/execute`;
const PAYOUT_STATUS_API = `${BASE_URL}/digital-gold/payout/status`;

const STEPS = [
  "Executing sell order",
  "Initiating bank payout",
  "Verifying payment status",
];

export default function SellProcessingScreen({ navigation, route }) {
  const { transactionId, beneficiaryId, amount, grams, sellRate, bankDetails } =
    route.params ?? {};
  const accessToken = useSelector(selectAccessToken);

  const [currentStep, setCurrentStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    "Processing your sell order...",
  );

  const spinAnim = useRef(new Animated.Value(0)).current;
  const processed = useRef(false);

  // Block back button during processing
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // Spinner animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const run = async () => {
      try {
        // Step 1 — Execute sell
        setCurrentStep(0);
        setStatusMessage("Executing sell order...");

        const execRes = await fetch(
          `${SELL_EXECUTE_API}?txnId=${transactionId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );
        const execData = await execRes.json();
        console.log(
          "[SellProcess] Execute response:",
          JSON.stringify(execData),
        );

        // Execute succeeded if success=true OR if data has transferId
        const execSuccess = execData?.success && execData?.data?.transferId;
        if (!execSuccess) {
          throw new Error(
            execData?.message ||
              execData?.data?.message ||
              "Sell execution failed",
          );
        }

        const { transferId, message: execMsg } = execData.data;

        // Step 2 — Payout initiated
        setCurrentStep(1);
        setStatusMessage(execMsg || "Bank payout initiated...");

        await new Promise((r) => setTimeout(r, 1500));

        // Step 3 — Skip payout status check (API not ready), go to success
        setCurrentStep(2);
        setStatusMessage("Completing transaction...");

        await new Promise((r) => setTimeout(r, 1000));

        navigation.replace("SellSuccess", {
          transactionId,
          transferId,
          beneficiaryId,
          paymentStatus: "PENDING", // Bank payout initiated, settlement T+1
          amount,
          grams,
          sellRate,
          bankDetails,
        });
      } catch (e) {
        console.log("[SellProcess] Error:", e.message, e.stack);
        navigation.replace("SellSuccess", {
          transactionId,
          beneficiaryId,
          paymentStatus: "FAILED",
          amount,
          grams,
          sellRate,
          bankDetails,
        });
      }
    };

    const timer = setTimeout(run, 800);
    return () => clearTimeout(timer);
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Processing Transaction</Text>
      </View>

      <View style={s.center}>
        {/* Animated Spinner */}
        <View style={s.spinnerContainer}>
          <Animated.View
            style={[s.spinnerRing, { transform: [{ rotate: spin }] }]}
          />
          <LinearGradient
            colors={["#D4A535", "#C8952A"]}
            style={s.spinnerInner}
          >
            <Text style={s.spinnerEmoji}>🪙</Text>
          </LinearGradient>
        </View>

        <Text style={s.title}>Processing Sell Order</Text>
        <Text style={s.subtitle}>{statusMessage}</Text>
        
        {/* Transaction ID Card */}
        <View style={s.txnCard}>
          <Text style={s.txnLabel}>Transaction ID</Text>
          <Text style={s.txnId}>{transactionId}</Text>
        </View>

        {/* Steps */}
        <View style={s.stepsCard}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepDotWrap}>
                {i < currentStep ? (
                  <View style={s.stepDotComplete}>
                    <Text style={s.checkmark}>✓</Text>
                  </View>
                ) : i === currentStep ? (
                  <Animated.View
                    style={[
                      s.stepDotActive,
                      { transform: [{ scale: spinAnim }] },
                    ]}
                  />
                ) : (
                  <View style={s.stepDotInactive} />
                )}
              </View>
              <Text
                style={[
                  s.stepText,
                  i <= currentStep ? s.stepTextActive : s.stepTextInactive,
                ]}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.noteCard}>
          <Text style={s.noteIcon}>⚠️</Text>
          <Text style={s.note}>
            Please do not close the app or press the back button
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.navy,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,168,67,0.22)",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#E8C97A",
    letterSpacing: 0.2,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  spinnerContainer: {
    marginBottom: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "transparent",
    borderTopColor: C.gold,
    borderRightColor: C.gold,
  },
  spinnerInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  spinnerEmoji: { fontSize: 40 },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: C.navy,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#8891AF",
    marginBottom: 20,
    textAlign: "center",
  },

  txnCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    alignItems: "center",
  },
  txnLabel: {
    fontSize: 11,
    color: "#8891AF",
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  txnId: {
    fontSize: 13,
    color: C.navy,
    fontWeight: "700",
  },

  stepsCard: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  stepDotWrap: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotComplete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stepDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.gold,
  },
  stepDotInactive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
  },
  stepText: { fontSize: 14, flex: 1 },
  stepTextActive: { color: C.navy, fontWeight: "600" },
  stepTextInactive: { color: "#B0B0B0" },

  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    width: "100%",
  },
  noteIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  note: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    flex: 1,
    fontWeight: "500",
  },
});
