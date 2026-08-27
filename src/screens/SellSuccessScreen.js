import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectAccessToken } from "../store/authSlice";
import { downloadSellInvoicePDF, openInvoicePDF } from "../utils/downloadInvoice";

const C = {
  bg: "#F5F3F0",
  card: "#FFFFFF",
  gold: "#D4AF37",
  goldLight: "#F8F6F2",
  navy: "#1F2933",
  green: "#2ECC71",
  greenBg: "#E8F5E9",
  red: "#C85A54",
  redBg: "#FDECEA",
  border: "#E5E7EB",
};

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
  const accessToken = useSelector(selectAccessToken);

  const isFailed = paymentStatus === "FAILED";
  const isPending = paymentStatus === "PENDING";

  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
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

  const iconColor = isFailed ? C.red : C.green;
  const iconName = isFailed ? "close-circle" : "checkmark-circle";
  const iconBg = isFailed ? C.redBg : C.greenBg;

  const handleViewInvoice = () => {
    if (!transactionId) {
      Alert.alert("Error", "Transaction ID not available");
      return;
    }
    console.log("[SellSuccess] View invoice for transaction:", transactionId);
    navigation.navigate("PgInvoiceViewer", { orderNumber: transactionId });
  };

  const handleDownloadInvoice = async () => {
    if (!transactionId) {
      Alert.alert("Error", "Transaction ID not available");
      return;
    }

    console.log("[SellSuccess] Download invoice for transaction:", transactionId);

    if (!accessToken) {
      Alert.alert("Error", "Session expired. Please login again.");
      return;
    }

    setDownloadingInvoice(true);

    try {
      const fileUri = await downloadSellInvoicePDF(transactionId, accessToken);

      Alert.alert("Success", "Invoice downloaded successfully", [
        {
          text: "Open",
          onPress: async () => {
            try {
              await openInvoicePDF(fileUri);
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
        { text: "Close" },
      ]);
    } catch (error) {
      console.error("[SellSuccess Download Error]", error.message);
      Alert.alert("Download Failed", error.message || "Could not download invoice");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.navigate("Dashboard")}
          activeOpacity={0.7}
        >
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isFailed ? "Transaction Failed" : "Transaction Complete"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <Animated.View
          style={[
            s.iconWrap,
            isFailed ? s.iconWrapFail : s.iconWrapSuccess,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Ionicons name={iconName} size={64} color={iconColor} />
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
          <View style={[s.card, isFailed && s.cardFailed]}>
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
              <View style={s.bankIconBox}>
                <Ionicons name="card" size={20} color={C.green} />
              </View>
              <View style={s.bankContent}>
                <Text style={s.bankTitle}>Credited To</Text>
                <Text style={s.bankName}>{bankDetails.nameAtBank}</Text>
                <Text style={s.bankInfo}>
                  {bankDetails.bankName} · {bankDetails.accountNumber}
                </Text>
                {bankDetails.ifsc && (
                  <Text style={s.bankInfo}>IFSC: {bankDetails.ifsc}</Text>
                )}
              </View>
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

          {/* Invoice Actions */}
          {!isFailed && (
            <View style={s.invoiceActions}>
              <TouchableOpacity
                style={s.invoiceBtn}
                onPress={handleViewInvoice}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text" size={18} color={C.gold} />
                <Text style={s.invoiceBtnText}>View Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.invoiceBtn}
                onPress={handleDownloadInvoice}
                disabled={downloadingInvoice}
                activeOpacity={0.8}
              >
                {downloadingInvoice ? (
                  <ActivityIndicator size="small" color={C.gold} />
                ) : (
                  <Ionicons name="download" size={18} color={C.gold} />
                )}
                <Text style={s.invoiceBtnText}>
                  {downloadingInvoice ? "Downloading..." : "Download"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        {!isFailed && (
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => navigation.navigate("Dashboard", { forceRefresh: true })}
            activeOpacity={0.8}
          >
            <Text style={s.secondaryBtnText}>View Portfolio</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.primaryBtn, isFailed && s.primaryBtnFull]}
          onPress={() =>
            isFailed
              ? navigation.navigate("SellGold")
              : navigation.navigate("Dashboard", { forceRefresh: true })
          }
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={isFailed ? ["#C85A54", "#C81E1E"] : ["#D4A535", "#D4AF37", "#C5A100"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.primaryBtnGrad}
          >
            <Text style={s.primaryBtnText}>
              {isFailed ? "Try Again" : "Done"}
            </Text>
          </LinearGradient>
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
  root: { flex: 1, backgroundColor: C.bg },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.navy,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,168,67,0.22)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(212,168,67,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.28)",
  },
  backBtnText: {
    fontSize: 20,
    color: "#D4AF37",
    fontWeight: "400",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#C5A100",
    letterSpacing: 0.2,
  },

  scroll: { padding: 20, alignItems: "center", paddingBottom: 20 },

  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 24,
    borderWidth: 3,
  },
  iconWrapSuccess: {
    backgroundColor: C.greenBg,
    borderColor: C.green,
  },
  iconWrapFail: {
    backgroundColor: C.redBg,
    borderColor: C.red,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: C.navy,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 16,
  },

  card: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  cardFailed: {
    borderColor: "rgba(224,36,36,0.2)",
    backgroundColor: "#FFFBFB",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLabel: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },
  rowValue: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navy,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  rowGold: { color: C.gold, fontSize: 15 },
  rowFail: { color: C.red },
  rowOk: { color: C.green },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },

  bankCard: {
    width: "100%",
    backgroundColor: C.greenBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(14,159,110,0.25)",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bankIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(14,159,110,0.2)",
  },
  bankContent: { flex: 1 },
  bankTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: C.green,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  bankName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 4,
  },
  bankInfo: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF6ED",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D4A574",
  },
  infoText: { fontSize: 11, color: "#92400E", flex: 1, lineHeight: 16, marginLeft: 8 },

  invoiceActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 16,
  },
  invoiceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.goldLight,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: C.gold,
  },
  invoiceBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gold,
  },

  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    backgroundColor: C.bg,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: C.navy },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryBtnFull: { flex: 2 },
  primaryBtnGrad: {
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
});
