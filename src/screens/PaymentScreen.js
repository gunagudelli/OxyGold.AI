import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const PaymentScreen = ({ navigation, route }) => {
  const { amount, goldQuantity, goldValue, gst } = route.params;
  const [selectedPayment, setSelectedPayment] = useState("upi");
  const [payLoading, setPayLoading] = useState(false);

  const totalAmount = amount; // This is the total amount passed from PaymentReviewScreen

  const paymentMethods = [
    {
      id: "upi",
      name: "UPI Payment",
      icon: "phone-portrait-outline",
      color: "#4F46E5",
    },
    {
      id: "card",
      name: "Debit/Credit Card",
      icon: "card-outline",
      color: "#2ECC71",
    },
    {
      id: "netbanking",
      name: "Net Banking",
      icon: "business-outline",
      color: "#DC2626",
    },
    {
      id: "wallet",
      name: "Digital Wallet",
      icon: "wallet-outline",
      color: "#7C3AED",
    },
  ];

  const handlePaySecurely = () => {
    setPayLoading(true);
    setTimeout(() => {
      setPayLoading(false);
      navigation.replace("PaymentProcess", {
        amount: totalAmount,
        goldQuantity,
        paymentMethod: selectedPayment,
        targetScreen: "PaymentSuccessScreen",
      });
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8F8" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <View style={styles.headerRight}>
          <Ionicons name="lock-closed" size={20} color="#2ECC71" />
        </View>
      </View>

      <View style={styles.content}>
        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gold Quantity</Text>
            <Text style={styles.goldValue}>{goldQuantity} grams</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gold Value</Text>
            <Text style={styles.summaryValue}>
              ₹{goldValue?.toLocaleString()}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST (3%)</Text>
            <Text style={styles.summaryValue}>₹{gst}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>
              ₹{totalAmount?.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                selectedPayment === method.id && styles.selectedPayment,
              ]}
              onPress={() => setSelectedPayment(method.id)}
            >
              <View style={styles.methodLeft}>
                <View
                  style={[
                    styles.methodIcon,
                    { backgroundColor: method.color + "15" },
                  ]}
                >
                  <Ionicons name={method.icon} size={20} color={method.color} />
                </View>
                <Text style={styles.methodName}>{method.name}</Text>
              </View>

              <View
                style={[
                  styles.radioButton,
                  selectedPayment === method.id && { borderColor: "#D4AF37" },
                ]}
              >
                {selectedPayment === method.id && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={18} color="#2ECC71" />
          <Text style={styles.securityText}>
            256-bit SSL encrypted • 100% secure
          </Text>
        </View>
      </View>

      {/* Pay Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.payButton, payLoading && styles.payButtonDisabled]}
          onPress={handlePaySecurely}
          disabled={payLoading}
        >
          {payLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.buttonText}>Processing Payment...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              Pay ₹{totalAmount?.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#464B8B",
    justifyContent: "center",
    alignItems: "center",
  },
  headerBackText: {
    fontSize: 18,
    color: "#464B8B",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#464B8B",
  },
  headerRight: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  paymentSection: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#666",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  goldValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D4AF37",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D4AF37",
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  selectedPayment: {
    borderColor: "#D4AF37",
    backgroundColor: "#FFFEF7",
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  methodName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4AF37",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#2ECC71",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 13,
    color: "#2ECC71",
    marginLeft: 8,
    fontWeight: "500",
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  payButton: {
    backgroundColor: "#464B8B",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  payButtonDisabled: {
    backgroundColor: "#D4AF37",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default PaymentScreen;
