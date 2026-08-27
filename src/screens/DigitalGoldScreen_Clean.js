import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Keyboard,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { useGold } from "../context/GoldContext";
import {
  previewBuy,
  fetchPortfolio,
  fetchTransactions,
} from "../services/goldApi";

// Clean Design Tokens
const C = {
  bg: "#FFFFFF",
  card: "#F8F9FA",
  primary: "#0E9F6E",
  primaryLight: "#D1FAE5",
  gold: "#F59E0B",
  goldLight: "#FEF3C7",
  text: "#1F2937",
  textLight: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  red: "#EF4444",
  redLight: "#FEE2E2",
};

const DigitalGoldScreen = ({ navigation, route }) => {
  const { state, refreshPrice } = useGold();
  const goldRate = state.goldPrice?.pricePerGram || 16236;
  const sellPrice = state.goldPrice?.sellPrice || 16236;
  const userId = useSelector(selectUserId);
  const accessToken = route?.params?.accessToken;

  const [buyMode, setBuyMode] = useState("rupees");
  const [amount, setAmount] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txnLoading, setTxnLoading] = useState(false);

  const scrollViewRef = useRef(null);

  const loadScreenData = useCallback(async () => {
    const uid = userId;
    if (!uid) return;

    setPortfolioLoading(true);
    setTxnLoading(true);
    try {
      const [portfolioData, txnData] = await Promise.allSettled([
        fetchPortfolio(uid),
        fetchTransactions(uid),
      ]);

      if (portfolioData.status === "fulfilled") {
        setPortfolio(portfolioData.value);
      } else {
        setPortfolio({
          totalGoldGrams: 0,
          totalInvestedAmount: 0,
          currentValue: 0,
          totalGain: 0,
          gainPercentage: 0,
        });
      }

      if (txnData.status === "fulfilled") {
        setTransactions(txnData.value.slice(0, 5));
      } else {
        setTransactions([]);
      }
    } catch (err) {
      setPortfolio({
        totalGoldGrams: 0,
        totalInvestedAmount: 0,
        currentValue: 0,
        totalGain: 0,
        gainPercentage: 0,
      });
      setTransactions([]);
    } finally {
      setPortfolioLoading(false);
      setTxnLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
    }, [loadScreenData]),
  );

  const goldBalance =
    portfolio?.totalGoldGrams ?? state.portfolio?.totalGrams ?? 0;
  const currentValue = portfolio?.currentValue ?? goldBalance * goldRate;
  const totalInvested =
    portfolio?.totalInvestedAmount ?? state.portfolio?.totalInvested ?? 0;
  const totalGain = portfolio?.totalGain ?? currentValue - totalInvested;
  const gainPercent = portfolio?.gainPercentage ?? 0;
  const isProfit = totalGain >= 0;

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardOffset(e.endCoordinates.height);
      setTimeout(
        () => scrollViewRef.current?.scrollTo({ y: 200, animated: true }),
        100,
      );
    });
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardOffset(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleBuyGold = async () => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      Alert.alert("Enter Amount", "Please enter a valid amount to proceed");
      return;
    }
    const numAmount = parseFloat(amount);
    if (buyMode === "rupees" && numAmount < 100) {
      Alert.alert("Minimum Amount", "Minimum purchase is ₹100");
      return;
    }
    if (buyMode === "grams" && numAmount <= 0) {
      Alert.alert("Invalid Grams", "Please enter a valid gram amount");
      return;
    }
    setPreviewLoading(true);
    try {
      const uid = userId;
      if (!uid) {
        Alert.alert("Session Expired", "Please login again.");
        navigation.replace("Login");
        return;
      }
      const purchaseType = buyMode === "rupees" ? "AMOUNT" : "GRAMS";
      let sendAmount = 0,
        sendGrams = 0;
      if (buyMode === "rupees") {
        const gst = Math.round(numAmount * 0.03 * 100) / 100;
        const goldValue = Math.round((numAmount - gst) * 100) / 100;
        sendAmount = Math.round(numAmount * 100) / 100;
        sendGrams = goldValue / goldRate;
      } else {
        sendGrams = Math.round(numAmount * 1000000) / 1000000;
        const goldValue = Math.round(sendGrams * goldRate * 100) / 100;
        const gst = Math.round(goldValue * 0.03 * 100) / 100;
        sendAmount = Math.round((goldValue + gst) * 100) / 100;
      }

      const preview = await previewBuy({
        userId: uid,
        purchaseType,
        amount: sendAmount,
        grams: sendGrams,
        pergramBuyingPrice: goldRate,
      });

      if (!preview)
        throw new Error("Failed to get order preview. Please try again.");
      navigation.navigate("PaymentReview", { preview, buyMode, goldRate });
    } catch (e) {
      Alert.alert(
        "Error",
        e.message || "Failed to preview order. Please try again.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const gramsPreview =
    amount && !isNaN(parseFloat(amount)) && buyMode === "rupees"
      ? (parseFloat(amount) / goldRate).toFixed(4)
      : null;
  const rupeesPreview =
    amount && !isNaN(parseFloat(amount)) && buyMode === "grams"
      ? (parseFloat(amount) * goldRate).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })
      : null;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Digital Gold</Text>
        <View style={s.liveChip}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: keyboardOffset > 0 ? keyboardOffset + 24 : 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Gold Price Card */}
        <View style={s.priceCard}>
          <View style={s.priceRow}>
            <View>
              <View style={s.liveBadge}>
                <View style={s.liveBadgeDot} />
                <Text style={s.liveBadgeText}>LIVE PRICE</Text>
              </View>
              <Text style={s.priceAmount}>
                ₹{goldRate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </Text>
              <Text style={s.priceLabel}>per gram · 24K Gold</Text>
            </View>
            <View style={s.goldIcon}>
              <Text style={s.goldIconText}>Au</Text>
            </View>
          </View>
        </View>

        {/* Portfolio Card */}
        <View style={s.portfolioCard}>
          <Text style={s.portfolioLabel}>Your Portfolio</Text>
          {portfolioLoading ? (
            <ActivityIndicator color={C.primary} size="small" style={{ marginTop: 12 }} />
          ) : (
            <>
              <Text style={s.portfolioValue}>
                ₹{currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </Text>
              <View style={s.portfolioRow}>
                <Text style={s.portfolioGrams}>{goldBalance.toFixed(4)} grams</Text>
                <View style={[s.gainBadge, !isProfit && s.gainBadgeRed]}>
                  <Text style={[s.gainText, !isProfit && s.gainTextRed]}>
                    {isProfit ? "↑" : "↓"} {gainPercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
              {goldBalance > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("SellGold")}
                  style={s.sellButton}
                  activeOpacity={0.8}
                >
                  <Text style={s.sellButtonText}>Sell Gold</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Buy Gold Card */}
        <View style={s.buyCard}>
          <Text style={s.buyTitle}>Buy Gold</Text>

          {/* Toggle */}
          <View style={s.toggle}>
            {["rupees", "grams"].map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  setBuyMode(mode);
                  setAmount("");
                }}
                style={[s.toggleBtn, buyMode === mode && s.toggleBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.toggleText, buyMode === mode && s.toggleTextActive]}>
                  {mode === "rupees" ? "₹ Rupees" : "⚖ Grams"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input */}
          <View style={s.inputBox}>
            <Text style={s.inputSymbol}>{buyMode === "rupees" ? "₹" : "g"}</Text>
            <TextInput
              style={s.input}
              placeholder={buyMode === "rupees" ? "0" : "0.0000"}
              placeholderTextColor={C.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          {/* Conversion */}
          {gramsPreview || rupeesPreview ? (
            <View style={s.conversionRow}>
              <Text style={s.conversionText}>
                {gramsPreview ? `≈ ${gramsPreview} grams` : `≈ ₹${rupeesPreview}`}
              </Text>
              <Text style={s.gstText}>Incl. 3% GST</Text>
            </View>
          ) : (
            <Text style={s.hintText}>
              {buyMode === "rupees" ? "Min ₹100 · Incl. 3% GST" : "Incl. 3% GST"}
            </Text>
          )}

          {/* Quick Chips */}
          {buyMode === "rupees" && (
            <View style={s.chips}>
              {[["100", "₹100"], ["500", "₹500"], ["1000", "₹1K"], ["10000", "₹10K"]].map(
                ([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setAmount(val)}
                    style={[s.chip, amount === val && s.chipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipText, amount === val && s.chipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          )}

          {/* CTA Button */}
          <TouchableOpacity
            onPress={handleBuyGold}
            disabled={previewLoading}
            activeOpacity={0.85}
            style={[s.ctaBtn, previewLoading && { opacity: 0.6 }]}
          >
            {previewLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.ctaText}>Start Saving →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Physical Gold Banner */}
        <TouchableOpacity
          style={s.pgBanner}
          onPress={() => navigation.navigate("PgHome", { accessToken, userId })}
          activeOpacity={0.85}
        >
          <View style={s.pgLeft}>
            <View style={s.pgIcon}>
              <Text style={s.pgIconText}>🪙</Text>
            </View>
            <View>
              <Text style={s.pgTitle}>Physical Gold</Text>
              <Text style={s.pgSub}>BIS Hallmarked · Home Delivery</Text>
            </View>
          </View>
          <Text style={s.pgArrow}>→</Text>
        </TouchableOpacity>

        {/* Recent Transactions */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
              <Text style={s.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={s.txnCard}>
            {txnLoading ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 28 }} />
            ) : transactions.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>📭</Text>
                <Text style={s.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map((txn, i) => {
                const isBuy = txn.type === "BUY";
                return (
                  <View
                    key={txn.id}
                    style={[s.txnRow, i < transactions.length - 1 && s.txnBorder]}
                  >
                    <View style={[s.txnIcon, isBuy ? s.txnIconBuy : s.txnIconSell]}>
                      <Text style={s.txnIconText}>{isBuy ? "↑" : "↓"}</Text>
                    </View>
                    <View style={s.txnMid}>
                      <Text style={s.txnType}>{isBuy ? "Bought Gold" : "Sold Gold"}</Text>
                      <Text style={s.txnDate}>
                        {new Date(txn.timestamp).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={s.txnRight}>
                      <Text style={s.txnAmt}>
                        ₹{txn.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </Text>
                      <Text style={s.txnGrams}>{txn.grams.toFixed(4)} g</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { fontSize: 20, color: C.text },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  liveText: { fontSize: 10, fontWeight: "700", color: C.primary, letterSpacing: 0.5 },

  scroll: { paddingBottom: 40 },

  // Price Card
  priceCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  liveBadgeText: { fontSize: 10, fontWeight: "700", color: C.primary, letterSpacing: 0.8 },
  priceAmount: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 4 },
  priceLabel: { fontSize: 13, color: C.textLight },
  goldIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.goldLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.gold,
  },
  goldIconText: { fontSize: 20, fontWeight: "900", color: C.gold },

  // Portfolio Card
  portfolioCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  portfolioLabel: { fontSize: 12, fontWeight: "600", color: C.textLight, marginBottom: 8 },
  portfolioValue: { fontSize: 26, fontWeight: "800", color: C.text, marginBottom: 6 },
  portfolioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  portfolioGrams: { fontSize: 13, color: C.textLight },
  gainBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gainBadgeRed: { backgroundColor: C.redLight },
  gainText: { fontSize: 12, fontWeight: "700", color: C.primary },
  gainTextRed: { color: C.red },
  sellButton: {
    backgroundColor: C.redLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  sellButtonText: { fontSize: 14, fontWeight: "700", color: C.red },

  // Buy Card
  buyCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  buyTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16 },

  // Toggle
  toggle: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  toggleBtnActive: { backgroundColor: C.card },
  toggleText: { fontSize: 14, fontWeight: "500", color: C.textMuted },
  toggleTextActive: { color: C.text, fontWeight: "700" },

  // Input
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputSymbol: { fontSize: 24, fontWeight: "700", color: C.gold, marginRight: 8 },
  input: { flex: 1, fontSize: 28, fontWeight: "700", color: C.text, paddingVertical: 14 },
  conversionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.goldLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  conversionText: { fontSize: 13, fontWeight: "600", color: C.gold },
  gstText: { fontSize: 11, color: C.textLight },
  hintText: { fontSize: 12, color: C.textMuted, marginBottom: 14 },

  // Chips
  chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipActive: { borderColor: C.gold, backgroundColor: C.goldLight },
  chipText: { fontSize: 13, fontWeight: "600", color: C.textMuted },
  chipTextActive: { color: C.gold },

  // CTA Button
  ctaBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  // Physical Gold Banner
  pgBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  pgLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  pgIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.goldLight,
    justifyContent: "center",
    alignItems: "center",
  },
  pgIconText: { fontSize: 20 },
  pgTitle: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  pgSub: { fontSize: 12, color: C.textLight },
  pgArrow: { fontSize: 20, color: C.textMuted },

  // Section
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  viewAll: { fontSize: 13, fontWeight: "600", color: C.primary },

  // Transactions
  txnCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textMuted },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txnBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txnIconBuy: { backgroundColor: C.primaryLight },
  txnIconSell: { backgroundColor: C.redLight },
  txnIconText: { fontSize: 16, fontWeight: "700" },
  txnMid: { flex: 1 },
  txnType: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 2 },
  txnDate: { fontSize: 12, color: C.textLight },
  txnRight: { alignItems: "flex-end" },
  txnAmt: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 2 },
  txnGrams: { fontSize: 12, color: C.gold },
});

export default DigitalGoldScreen;
