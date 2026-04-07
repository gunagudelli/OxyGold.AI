import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function SellSuccessScreen({ navigation, route }) {
  const {
    transactionId,
    transferId,
    paymentStatus,
    amount,
    grams,
    sellRate,
    bankDetails,
  } = route.params ?? {};

  const isFailed = paymentStatus === "FAILED";
  const isPending = paymentStatus === "PENDING";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const timestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const iconColor = isFailed ? "#dc2626" : "#16a34a";
  const iconName = isFailed ? "close" : "checkmark";
  const iconBg = isFailed ? "#fef2f2" : "#f0fdf4";

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <Animated.View
          style={[
            s.iconWrap,
            { backgroundColor: iconBg, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Ionicons name={iconName} size={48} color={iconColor} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
          <Text style={s.title}>
            {isFailed
              ? "Payment Failed"
              : isPending
                ? "Sell Order Placed!"
                : "Gold Sold Successfully!"}
          </Text>
          <Text style={s.subtitle}>
            {isFailed
              ? "Your sell order could not be processed. Please try again."
              : "Amount will be credited to your bank account in 1-2 business days"}
          </Text>

          {/* Summary Card */}
          <View style={s.card}>
            <Row label="Transaction ID" value={transactionId || "—"} />
            {transferId && <Row label="Transfer ID" value={transferId} />}
            <Row
              label="Gold Sold"
              value={`${parseFloat(grams).toFixed(4)} grams`}
            />
            <Row
              label="Sell Rate"
              value={`₹${parseFloat(sellRate).toLocaleString("en-IN", { maximumFractionDigits: 2 })} / gram`}
            />
            <View style={s.divider} />
            <Row
              label="Amount"
              value={`₹${parseFloat(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              gold
            />
            <Row
              label="Status"
              value={isFailed ? "FAILED" : "PENDING — T+1 Settlement"}
              status={isFailed ? "fail" : "ok"}
            />
            <Row label="Date & Time" value={timestamp} />
          </View>

          {/* Bank Details */}
          {bankDetails && !isFailed && (
            <View style={s.bankCard}>
              <Text style={s.bankTitle}>💳 Credited To</Text>
              <Text style={s.bankName}>{bankDetails.nameAtBank}</Text>
              <Text style={s.bankInfo}>
                {bankDetails.bankName} · {bankDetails.accountNumber}
              </Text>
              {bankDetails.ifsc && (
                <Text style={s.bankInfo}>IFSC: {bankDetails.ifsc}</Text>
              )}
            </View>
          )}

          {/* Info note */}
          {!isFailed && (
            <View style={s.infoRow}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#8a96a3"
              />
              <Text style={s.infoText}>
                TDS applicable on transactions above ₹50,000 · T+1 settlement
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={s.secondaryBtnText}>View Portfolio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() =>
            isFailed
              ? navigation.navigate("SellGold")
              : navigation.navigate("Dashboard")
          }
        >
          <Text style={s.primaryBtnText}>
            {isFailed ? "Try Again" : "Done"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const Row = ({ label, value, gold, status }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text
      style={[
        s.rowValue,
        gold && s.rowGold,
        status === "fail" && s.rowFail,
        status === "ok" && s.rowOk,
      ]}
    >
      {value}
    </Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 24, alignItems: "center", paddingBottom: 20 },

  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1c2b3a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#8a96a3",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  card: {
    width: "100%",
    backgroundColor: "#fafbfc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8ecf0",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f5",
  },
  rowLabel: { fontSize: 13, color: "#9eaab8" },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1c2b3a",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  rowGold: { color: "#b8720a" },
  rowFail: { color: "#dc2626" },
  rowOk: { color: "#16a34a" },
  divider: { height: 1, backgroundColor: "#e8ecf0", marginVertical: 6 },

  bankCard: {
    width: "100%",
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.2)",
    marginBottom: 14,
  },
  bankTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
    marginBottom: 6,
  },
  bankName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1c2b3a",
    marginBottom: 2,
  },
  bankInfo: { fontSize: 12, color: "#8a96a3" },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
  },
  infoText: { fontSize: 11, color: "#8a96a3", flex: 1, lineHeight: 16 },

  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "600", color: "#666" },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f0bb3a",
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 14, fontWeight: "700", color: "#0d1f3c" },
});
