/**
 * Physical Gold Payment Handler Screen
 * Handles Cashfree payment via SDK (NOT WebView)
 * Uses callback-based approach like Digital Gold
 */

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  BackHandler,
  Animated,
  Easing,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { CFPaymentGatewayService } from "react-native-cashfree-pg-sdk";
import { CFEnvironment, CFSession } from "cashfree-pg-api-contract";
import { selectUserId, selectAccessToken } from "../../store/authSlice";
import {
  paymentWebhook,
  generateInvoice,
  getInvoicePdfUrl,
} from "../api/physicalGoldApi";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#503189",
  navy: "#333333",
  navyLight: "#757575",
  textMuted: "#9E9E9E",
  border: "#E0E0E0",
  green: "#1F8A4C",
  red: "#E53935",
};

const PgPaymentHandlerScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);

  const {
    orderId,
    orderNumber,
    txnId,
    paymentSessionId,
    totalAmount,
    paymentMode = "CASHFREE",
  } = route?.params || {};


  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | 'success' | 'failed'
  const [invoiceUrl, setInvoiceUrl] = useState(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const paymentStarted = useRef(false);

  // Prevent back button during payment
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // Animations
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Start payment flow on mount
  useEffect(() => {
    if (!paymentStarted.current) {
      paymentStarted.current = true;
      if (paymentMode === "WALLET") {
        handleWalletPayment();
      } else {
        startCashfreePayment();
      }
    }
  }, []);

  // ── Wallet Payment Handler ──────────────────────────────────────────────
  const handleWalletPayment = async () => {
    setLoading(true);
    try {

      // For wallet, verify payment immediately
      const result = await paymentWebhook(orderId);

      if (
        result?.paymentStatus === "SUCCESS" ||
        result?.orderStatus === "CONFIRMED"
      ) {
        await handlePaymentSuccess();
      } else {
        setStatus("failed");
      }
    } catch (error) {
      console.error("[Wallet Payment] Error:", error.message);
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Cashfree SDK Payment ─────────────────────────────────────────────────
  const startCashfreePayment = () => {
    try {

      if (!paymentSessionId) {
        throw new Error("No payment session ID received");
      }

      // Clean corrupted suffix from backend
      const cleanSessionId = paymentSessionId
        .replace(/(payment)+$/i, "")
        .trim();

      // Validate session ID
      if (
        !cleanSessionId.startsWith("session_") ||
        cleanSessionId.length < 20
      ) {
        throw new Error("Invalid payment session ID format");
      }

      // ✅ Try using txnId (TRXN-xxx) instead of orderId
      // Backend might be using txnId as Cashfree order_id
      const cashfreeOrderId = txnId || orderId.toString();

      // Backend issues PRODUCTION session tokens — the web app's equivalent
      // checkout (CartSlider.tsx) loads Cashfree with `mode: "production"`.
      // Validating a production session against SANDBOX is what was causing
      // the SDK's "token is not present" error.
      let session = new CFSession(
        cleanSessionId,
        cashfreeOrderId,
        CFEnvironment.PRODUCTION,
      );

      // Set callback then launch
      CFPaymentGatewayService.setCallback({
        onVerify: handleCashfreeVerify,
        onError: handleCashfreeError,
      });
      CFPaymentGatewayService.doWebPayment(session);
    } catch (error) {
      console.error("[Cashfree SDK] Error:", error.message);
      Alert.alert("Payment Error", error.message || "Could not start payment");
      navigation.goBack();
    }
  };

  // ── Cashfree Callbacks ───────────────────────────────────────────────────
  const handleCashfreeVerify = async (txId) => {
    setLoading(true);
    try {
      // Verify payment via webhook using orderId
      const result = await paymentWebhook(txId);

      if (
        result?.status === "SUCCESS" ||
        result?.paymentStatus === "SUCCESS" ||
        result?.orderStatus === "CONFIRMED"
      ) {
        await handlePaymentSuccess();
      } else {
        setStatus("failed");
      }
    } catch (error) {
      console.error("[Cashfree SDK] Verification error:", error);
      Alert.alert("Payment Error", error.message || "Could not verify payment");
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCashfreeError = (error, orderID) => {
    console.error(
      "[Cashfree SDK] onError:",
      error?.getMessage?.() || error?.message,
      "OrderID:",
      orderID,
    );
    // Alert.alert('Payment Failed', error?.getMessage?.() || 'Payment could not be processed');
    setStatus("failed");
  };

  // ── Payment Success Handler ──────────────────────────────────────────────
  const handlePaymentSuccess = async () => {
    try {
      // Try to generate invoice

      const invoice = await generateInvoice(orderId);

      // Get invoice URL
      if (orderNumber) {
        const pdfUrl = getInvoicePdfUrl(orderNumber);
        setInvoiceUrl(pdfUrl);
      } else {
        console.warn(
          "[Invoice] No orderNumber available, cannot generate PDF URL",
        );
      }

      setStatus("success");
    } catch (error) {
      console.error("[Invoice] Generation failed:", error);
      console.error("[Invoice] Error message:", error.message);

      // If invoice already exists (status 500), just get the URL
      if (error.message?.includes('already exists') || error.message?.includes('500')) {
        if (orderNumber) {
          const pdfUrl = getInvoicePdfUrl(orderNumber);
          setInvoiceUrl(pdfUrl);
        }
        setStatus("success");
      } else {
        // Show success but log that invoice failed
        Alert.alert(
          "Payment Successful",
          "Your payment was successful but invoice generation failed. You can download it later from Orders.",
          [{ text: "OK" }],
        );
        setStatus("success");
      }
    }
  };

  const handleViewInvoice = async () => {
    try {
      
      if (!invoiceUrl) {
        console.error('[View Invoice] ❌ Invoice URL not available');
        Alert.alert('Error', 'Invoice URL not available');
        return;
      }

      Alert.alert(
        'View Invoice',
        'Invoice will open in your browser where you can view and download it.\n\nNote: You may need to login again in the browser.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Browser', 
            onPress: async () => {
              const supported = await Linking.canOpenURL(invoiceUrl);
              if (supported) {
                await Linking.openURL(invoiceUrl);
              } else {
                Alert.alert('Error', 'Cannot open URL');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('[View Invoice] ❌ Error:', error);
      console.error('[View Invoice] Error message:', error.message);
      Alert.alert("Error", "Unable to open invoice");
    }
  };

  const handleTrackOrder = () => {
    navigation.navigate("PgOrders");
  };

  const handleContinueShopping = () => {
    navigation.navigate("PgHome");
  };

  const handleRetry = () => {
    navigation.navigate("PgCart");
  };

  // ── Loading view (during verification) ──────────────────────────────────
  if (loading || status === null) {
    const spin = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.centerContainer}>
          <Animated.View
            style={[styles.spinnerOuter, { transform: [{ scale: pulseAnim }] }]}
          >
            <Animated.View
              style={[styles.spinner, { transform: [{ rotate: spin }] }]}
            >
              <View style={styles.spinnerArc} />
            </Animated.View>
            <View style={styles.spinnerInner}>
              <Ionicons name="card" size={32} color="#503189" />
            </View>
          </Animated.View>
          <Text style={styles.processingTitle}>Processing Payment</Text>
          <Text style={styles.processingSubtitle}>
            Please wait while we verify your payment...
          </Text>
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order Number</Text>
              <Text style={styles.infoValue}>{orderNumber}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Amount</Text>
              <Text style={styles.infoValue}>
                ₹{Number(totalAmount).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment via</Text>
              <Text style={styles.infoValue}>{paymentMode}</Text>
            </View>
          </View>
          <Text style={styles.note}>
            Please do not close the app{"\n"}or press the back button
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success view ─────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#1F8A4C" />
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your order has been confirmed
          </Text>

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Number</Text>
              <Text style={styles.detailValue}>{orderNumber}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>
                ₹{Number(totalAmount).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.detailValue, styles.statusSuccess]}>
                SUCCESS
              </Text>
            </View>
          </View>

          {/* {invoiceUrl && (
            <TouchableOpacity
              style={styles.invoiceButton}
              onPress={handleViewInvoice}
            >
              <Ionicons name="document-text" size={18} color="#fff" />
              <Text style={styles.invoiceButtonText}>View Invoice</Text>
            </TouchableOpacity>
          )} */}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleTrackOrder}
          >
            <Text style={styles.primaryButtonText}>Track My Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContinueShopping}
          >
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Failed view ──────────────────────────────────────────────────────────
  if (status === "failed") {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.centerContainer}>
          <Ionicons name="close-circle" size={80} color="#E53935" />
          <Text style={styles.failedTitle}>Payment Failed</Text>
          <Text style={styles.failedSubtitle}>
            Unable to process your payment
          </Text>

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Number</Text>
              <Text style={styles.detailValue}>{orderNumber}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>
                ₹{Number(totalAmount).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.detailValue, styles.statusFailed]}>
                FAILED
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContinueShopping}
          >
            <Text style={styles.secondaryButtonText}>Go Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
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
    borderTopColor: C.gold,
    borderRightColor: "rgba(80,49,137,0.25)",
  },
  spinnerInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(80,49,137,0.08)",
    borderWidth: 1,
    borderColor: "rgba(80,49,137,0.20)",
    justifyContent: "center",
    alignItems: "center",
  },

  processingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 8,
    textAlign: "center",
  },
  processingSubtitle: {
    fontSize: 14,
    color: C.navyLight,
    textAlign: "center",
    marginBottom: 32,
  },

  orderInfo: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: { fontSize: 13, color: C.navyLight },
  infoValue: { fontSize: 13, fontWeight: "600", color: C.navy },

  note: {
    marginTop: 28,
    fontSize: 12,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.navy,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    color: C.navyLight,
    textAlign: "center",
    marginBottom: 24,
  },

  failedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.navy,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  failedSubtitle: {
    fontSize: 14,
    color: C.navyLight,
    textAlign: "center",
    marginBottom: 24,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.navy,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: C.navyLight,
    textAlign: "center",
    marginBottom: 24,
  },

  detailsBox: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: { fontSize: 13, color: C.navyLight },
  detailValue: { fontSize: 13, fontWeight: "600", color: C.navy },
  statusSuccess: { color: C.green },
  statusFailed: { color: C.red },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },

  invoiceButton: {
    flexDirection: "row",
    backgroundColor: C.gold,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
    gap: 8,
  },
  invoiceButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  primaryButton: {
    backgroundColor: C.gold,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  secondaryButton: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  secondaryButtonText: { color: C.navy, fontSize: 15, fontWeight: "700" },
});

export default PgPaymentHandlerScreen;
