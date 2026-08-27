import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Keyboard,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useGold } from "../context/GoldContext";
import { useSelector } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { fetchPortfolio } from "../services/goldApi";

// ─── Design Tokens (mirrors DigitalGoldScreen) ────────────────────────────────
const C = {
  bg: "#F5F3F0",
  card: "#FFFFFF",
  gold: "#D4AF37",
  goldLight: "#F8F6F2",
  goldMid: "#C5A100",
  navy: "#1F2933",
  navyMid: "#6B7280",
  navyLight: "#9CA3AF",
  green: "#2ECC71",
  greenBg: "#E8F5E9",
  red: "#C85A54",
  redBg: "#FDECEA",
  border: "#E5E7EB",
  divider: "#F2F0EB",
};

// ─── Component ────────────────────────────────────────────────────────────────
const SellGoldScreen = ({ navigation, route }) => {
  const { state, dispatch, loadUserData } = useGold();
  const userId = useSelector(selectUserId);
  const sellRate = state.goldPrice?.sellPrice || 16236;
  const lastUpdated = state.goldPrice?.lastUpdated || null;

  const [sellMode, setSellMode] = useState("rupees");
  const [amount, setAmount] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState(null);

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  const availableGold = portfolio?.totalGoldGrams ?? state.portfolio?.totalGrams ?? 0;
  const currentValue = availableGold * sellRate;

  // Fetch fresh portfolio data
  const loadPortfolio = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPortfolio(userId);
      setPortfolio(data);
      dispatch({ type: "SET_PORTFOLIO", payload: { 
        totalGrams: data.totalGoldGrams,
        totalInvested: data.totalInvestedAmount,
        currentValue: data.currentValue 
      } });
    } catch (err) {
      console.error("Portfolio fetch error:", err);
      // Set empty portfolio on error
      const emptyPortfolio = {
        totalGoldGrams: 0,
        totalInvestedAmount: 0,
        currentValue: 0,
      };
      setPortfolio(emptyPortfolio);
      dispatch({ type: "SET_PORTFOLIO", payload: { 
        totalGrams: 0,
        totalInvested: 0,
        currentValue: 0 
      } });
      
      // Only show error if we don't have cached data
      if (!state.portfolio?.totalGrams || state.portfolio.totalGrams === 0) {
        setError("Unable to load balance. You can still buy gold.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if we need to force refresh from route params
  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.forceRefresh) {
        loadPortfolio();
        // Clear the param so it doesn't refresh again
        navigation.setParams({ forceRefresh: undefined });
      } else {
        loadPortfolio();
      }
    }, [userId, route?.params?.forceRefresh])
  );

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardOffset(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardOffset(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSell = () => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      Alert.alert("Enter Amount", "Please enter a valid amount to proceed");
      return;
    }
    const numAmount = parseFloat(amount);
    if (sellMode === "rupees" && numAmount < 100) {
      Alert.alert("Error", "Minimum sell amount is ₹100");
      return;
    }
    const grams =
      sellMode === "rupees"
        ? (numAmount / sellRate).toFixed(3)
        : numAmount.toFixed(3);
    if (parseFloat(grams) > availableGold) {
      Alert.alert("Error", "Insufficient gold balance");
      return;
    }
    navigation.navigate("SellSummary", {
      amount:
        sellMode === "rupees" ? numAmount : (numAmount * sellRate).toFixed(2),
      grams,
      sellRate,
      availableGold,
      lockedAt: new Date().toISOString(),
    });
  };

  const rupeesPreview =
    amount && !isNaN(parseFloat(amount)) && sellMode === "grams"
      ? (parseFloat(amount) * sellRate).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })
      : null;
  const gramsPreview =
    amount && !isNaN(parseFloat(amount)) && sellMode === "rupees"
      ? (parseFloat(amount) / sellRate).toFixed(4)
      : null;

  return (
    <SafeAreaView style={s.container} edges={["top"]} backgroundColor={C.bg}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ─── Header ───────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sell Gold</Text>
        <View style={s.headerRightSpace} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: keyboardOffset > 0 ? keyboardOffset + 24 : 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Hero Card ────────────────────────────────────────────── */}
        <View style={s.heroCard}>
          {/* Sell price row */}
          <View style={s.heroPriceRow}>
            <View style={{ flex: 1 }}>
              <View style={s.livePriceTag}>
                <View style={s.livePriceDot} />
                <Text style={s.livePriceText}>LIVE SELL PRICE</Text>
              </View>
              <View style={s.heroPriceLine}>
                <Text style={s.heroPrice}>
                  ₹
                  {sellRate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </Text>
                <Text style={s.heroPriceSub}>/ gram</Text>
              </View>
              <Text style={s.heroPurity}>24K · 999.9 purity</Text>
            </View>
          </View>

          <View style={s.heroDivider} />

          {/* Available balance */}
          <View style={s.heroPortfolio}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroPortLabel}>AVAILABLE TO SELL</Text>
              {loading ? (
                <ActivityIndicator
                  color="#C5A100"
                  size="small"
                  style={{ marginTop: 10 }}
                />
              ) : error ? (
                <View>
                  <Text style={s.errorText}>{error}</Text>
                  <TouchableOpacity
                    onPress={loadPortfolio}
                    style={s.retryBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={s.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={s.heroPortValue}>
                    ₹
                    {currentValue.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                  <Text style={s.heroPortGrams}>
                    {availableGold.toFixed(4)} grams owned
                  </Text>
                </>
              )}
            </View>
            {!loading && !error && (
              <View style={s.heroBalanceTag}>
                <Text style={s.heroBalanceGrams}>{availableGold.toFixed(4)}</Text>
                <Text style={s.heroBalanceUnit}>grams</Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Sell Gold Card ───────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardTop}>
            <Text style={s.cardTitle}>Sell Gold</Text>
            <TouchableOpacity
              style={s.buyGoldBtn}
              onPress={() => navigation.navigate("Dashboard")}
              activeOpacity={0.85}
            >
              <Text style={s.buyGoldText}>Buy Gold</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Toggle */}
          <View style={s.toggle}>
            {["rupees", "grams"].map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  setSellMode(mode);
                  setAmount("");
                }}
                style={[s.toggleTab, sellMode === mode && s.toggleTabActive]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.toggleTabText,
                    sellMode === mode && s.toggleTabTextActive,
                  ]}
                >
                  {mode === "rupees" ? "₹  Rupees" : "Grams"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input */}
          <View style={s.inputBox}>
            <Text style={s.inputSymbol}>
              {sellMode === "rupees" ? "₹" : "g"}
            </Text>
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder={sellMode === "rupees" ? "0" : "0.0000"}
              placeholderTextColor="#D1D5DB"
              value={amount}
              onChangeText={(value) => {
                const numValue = parseFloat(value) || 0;
                if (sellMode === "grams" && numValue > availableGold) return;
                if (
                  sellMode === "rupees" &&
                  numValue > availableGold * sellRate
                )
                  return;
                setAmount(value);
              }}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          {/* Equivalent row */}
          {gramsPreview || rupeesPreview ? (
            <View style={s.equivRow}>
              <Text style={s.equivText}>
                {gramsPreview
                  ? `≈ ${gramsPreview} grams`
                  : `≈ ₹${rupeesPreview}`}
              </Text>
              <Text style={s.equivSub}>Based on live rate</Text>
            </View>
          ) : (
            <Text style={s.inputHint}>
              {`Available: ${availableGold.toFixed(4)}g  ·  Min sell ₹100`}
            </Text>
          )}

          {/* Quick % Chips */}
          <View style={s.chips}>
            {[
              {
                label: "25%",
                rupVal: (availableGold * sellRate * 0.25).toFixed(0),
                gramVal: (availableGold * 0.25).toFixed(4),
              },
              {
                label: "50%",
                rupVal: (availableGold * sellRate * 0.5).toFixed(0),
                gramVal: (availableGold * 0.5).toFixed(4),
              },
              {
                label: "75%",
                rupVal: (availableGold * sellRate * 0.75).toFixed(0),
                gramVal: (availableGold * 0.75).toFixed(4),
              },
              {
                label: "All",
                rupVal: (availableGold * sellRate).toFixed(0),
                gramVal: availableGold.toFixed(4),
              },
            ].map(({ label, rupVal, gramVal }) => {
              const val = sellMode === "rupees" ? rupVal : gramVal;
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => setAmount(val)}
                  style={[s.chip, amount === val && s.chipActive]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[s.chipText, amount === val && s.chipTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleSell}
            activeOpacity={0.85}
            style={s.sellBtnMain}
          >
            <Text style={s.sellBtnText}>Proceed to Sell</Text>
            <Ionicons name="arrow-forward" size={17} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ─── Settlement Details ───────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Settlement Details</Text>
          <View style={s.infoCard}>
            {[
              {
                icon: "business-outline",
                title: "T+1 Settlement",
                sub: "Amount credited to your bank next business day",
              },
              {
                icon: "document-text-outline",
                title: "TDS Deduction",
                sub: "Tax deducted at source as per regulations",
              },
              {
                icon: "lock-closed-outline",
                title: "Price Lock",
                sub: "Sell price locked for 30 minutes after confirm",
              },
            ].map((item, i, arr) => (
              <View
                key={item.title}
                style={[s.infoRow, i < arr.length - 1 && s.infoRowBorder]}
              >
                <View style={s.infoIconBox}>
                  <Ionicons name={item.icon} size={17} color={C.gold} />
                </View>
                <View style={s.infoContent}>
                  <Text style={s.infoTitle}>{item.title}</Text>
                  <Text style={s.infoSub}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Important Notice ─────────────────────────────────────── */}
        <View style={s.noticeCard}>
          <View style={s.noticeContent}>
            <Text style={s.noticeTitle}>Important Information</Text>
            <Text style={s.noticeSub}>
              Minimum sell ₹100 · Price locked 5 mins · Instant verification
            </Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingBottom: 12,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.navy,
    letterSpacing: 0.1,
  },
  headerRightSpace: { width: 38 },

  scroll: { paddingBottom: 40, backgroundColor: C.bg },

  // Hero
  heroCard: {
    backgroundColor: "#1F2933",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 14,
    borderRadius: 18,
    padding: 22,
  },
  heroPriceRow: {
    marginBottom: 20,
  },
  livePriceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  livePriceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2ECC71",
  },
  livePriceText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.2,
  },
  heroPriceLine: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  heroPurity: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: 6,
  },
  heroPrice: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroPriceSub: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
  },
  heroPortfolio: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroPortLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroPortValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroPortGrams: { fontSize: 13, color: "rgba(255,255,255,0.38)" },
  errorText: {
    fontSize: 13,
    color: "#FCA5A5",
    marginTop: 8,
    marginBottom: 6,
  },
  retryBtn: {
    backgroundColor: "rgba(212,168,67,0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.3)",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C5A100",
  },
  heroBalanceTag: {
    backgroundColor: "rgba(200,149,42,0.18)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 80,
  },
  heroBalanceGrams: {
    fontSize: 15,
    fontWeight: "800",
    color: C.goldMid,
    marginBottom: 3,
  },
  heroBalanceUnit: {
    fontSize: 11,
    color: "rgba(232,201,122,0.7)",
    fontWeight: "500",
  },

  // Card
  card: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.navy,
    letterSpacing: -0.3,
  },
  buyGoldBtn: {
    backgroundColor: C.greenBg,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(14,159,110,0.3)",
  },
  buyGoldText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.green,
  },
  ratePill: {
    backgroundColor: C.goldLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.goldMid,
  },
  ratePillText: { fontSize: 12, fontWeight: "700", color: C.gold },

  // Toggle
  toggle: {
    flexDirection: "row",
    backgroundColor: "#F5F3F0",
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleTabActive: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleTabText: { fontSize: 14, fontWeight: "500", color: C.navyLight },
  toggleTabTextActive: { color: C.navy, fontWeight: "700" },

  // Input
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3F0",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  inputSymbol: {
    fontSize: 26,
    fontWeight: "700",
    color: C.gold,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 30,
    fontWeight: "700",
    color: C.navy,
    paddingVertical: 16,
  },
  equivRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.goldLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.goldMid,
  },
  equivText: { fontSize: 13, fontWeight: "600", color: C.gold },
  equivSub: { fontSize: 11, color: "#C5A100", fontWeight: "500" },
  inputHint: { fontSize: 12, color: C.navyLight, marginBottom: 16 },

  // Chips
  chips: { flexDirection: "row", gap: 8, marginBottom: 18 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#F5F3F0",
  },
  chipActive: { borderColor: C.gold, backgroundColor: C.goldLight },
  chipText: { fontSize: 13, fontWeight: "600", color: C.navyLight },
  chipTextActive: { color: C.gold },

  // Sell CTA
  sellBtnMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "rgba(0,0,0,0.30)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  sellBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.navy,
    marginHorizontal: 20,
    marginBottom: 12,
  },

  // Info card
  infoCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.goldLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: C.goldMid,
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 3,
  },
  infoSub: { fontSize: 12, color: C.navyLight },

  // Notice
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF6ED",
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D4A574",
  },
  noticeIcon: { fontSize: 22, marginRight: 12 },
  noticeContent: { flex: 1 },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 3,
  },
  noticeSub: { fontSize: 12, color: "#D4A574" },
});

export default SellGoldScreen;
