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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useGold } from "../context/GoldContext";

// ─── Design Tokens (mirrors DigitalGoldScreen) ────────────────────────────────
const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  gold: "#C8952A",
  goldLight: "#F5ECD7",
  goldMid: "#E8C97A",
  navy: "#1C2340",
  navyMid: "#3D4463",
  navyLight: "#8891AF",
  green: "#0E9F6E",
  greenBg: "#ECFDF5",
  red: "#E02424",
  redBg: "#FEF2F2",
  border: "#EAE8E2",
  divider: "#F0EEE9",
};

// ─── Component ────────────────────────────────────────────────────────────────
const SellGoldScreen = ({ navigation }) => {
  const { state } = useGold();
  const sellRate = state.goldPrice?.sellPrice || 16236;
  const lastUpdated = state.goldPrice?.lastUpdated || null;
  const availableGold = state.portfolio?.totalGrams || 0;

  const [sellMode, setSellMode] = useState("rupees");
  const [amount, setAmount] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

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

  const currentValue = availableGold * sellRate;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ─── Header ───────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sell Gold</Text>
        <View style={s.liveChip}>
          <View style={s.liveDot} />
          <Text style={s.liveLabel}>LIVE</Text>
        </View>
      </View>

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
        <LinearGradient
          colors={["#1C2340", "#2A3260", "#1C2340"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroRing1} />
          <View style={s.heroRing2} />

          {/* Sell price row */}
          <View style={s.heroPriceRow}>
            <View>
              <Text style={s.heroPurity}>24K Gold · 999.9 Pure</Text>
              <Text style={s.heroPrice}>
                ₹
                {sellRate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </Text>
              <Text style={s.heroPriceSub}>
                sell price / gram{lastUpdated ? `   ·   ${lastUpdated}` : ""}
              </Text>
            </View>
            <View style={s.heroCoin}>
              <View style={s.coinInner}>
                <Text style={s.coinKarat}>24K</Text>
                <View style={s.coinLine} />
                <Text style={s.coinPurity}>999.9</Text>
                <Text style={s.coinPure}>PURE</Text>
              </View>
            </View>
          </View>

          <View style={s.heroDivider} />

          {/* Available balance */}
          <View style={s.heroPortfolio}>
            <View>
              <Text style={s.heroPortLabel}>AVAILABLE TO SELL</Text>
              <Text style={s.heroPortValue}>
                ₹
                {currentValue.toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                })}
              </Text>
              <Text style={s.heroPortGrams}>
                {availableGold.toFixed(4)} grams owned
              </Text>
            </View>
            <View style={s.heroBalanceTag}>
              <Text style={s.heroBalanceGrams}>{availableGold.toFixed(4)}</Text>
              <Text style={s.heroBalanceUnit}>grams</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Sell Gold Card ───────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardTop}>
            <Text style={s.cardTitle}>Sell Gold</Text>
            <View style={s.ratePill}>
              <Text style={s.ratePillText}>
                ₹
                {sellRate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                /g
              </Text>
            </View>
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
                  {mode === "rupees" ? "₹  Rupees" : "⚖  Grams"}
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
              placeholderTextColor="#CCCAC3"
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
            activeOpacity={0.88}
            style={s.sellBtnMain}
          >
            <LinearGradient
              colors={["#D4A535", "#C8952A", "#B8841E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.sellBtnGrad}
            >
              <Text style={s.sellBtnText}>Proceed to Sell →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ─── Settlement Details ───────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Settlement Details</Text>
          <View style={s.infoCard}>
            {[
              {
                emoji: "🏦",
                title: "T+1 Settlement",
                sub: "Amount credited to your bank next business day",
              },
              {
                emoji: "📋",
                title: "TDS Deduction",
                sub: "Tax deducted at source as per regulations",
              },
              {
                emoji: "🔒",
                title: "Price Lock",
                sub: "Sell price locked for 30 minutes after confirm",
              },
            ].map((item, i, arr) => (
              <View
                key={item.title}
                style={[s.infoRow, i < arr.length - 1 && s.infoRowBorder]}
              >
                <View style={s.infoIconBox}>
                  <Text style={s.infoEmoji}>{item.emoji}</Text>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 14,
    paddingBottom: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  backBtnText: {
    fontSize: 28,
    lineHeight: 32,
    color: C.navy,
    fontWeight: "300",
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.navy,
    letterSpacing: 0.2,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.greenBg,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  liveLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.green,
    letterSpacing: 0.8,
  },

  scroll: { paddingBottom: 40 },

  // Hero
  heroCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 14,
    borderRadius: 22,
    padding: 22,
    overflow: "hidden",
  },
  heroRing1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    right: -60,
    top: -70,
  },
  heroRing2: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    right: -10,
    top: -10,
  },
  heroPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  heroPurity: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroPrice: {
    fontSize: 34,
    fontWeight: "800",
    color: C.goldMid,
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroPriceSub: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
  heroCoin: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#2A3158",
    borderWidth: 2,
    borderColor: "#D4A843",
    padding: 5,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  coinInner: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: "#D4A843",
    justifyContent: "center",
    alignItems: "center",
  },
  coinKarat: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1C2340",
    lineHeight: 24,
  },
  coinLine: {
    width: 32,
    height: 1.5,
    backgroundColor: "rgba(28,35,64,0.35)",
    marginVertical: 3,
  },
  coinPurity: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1C2340",
    lineHeight: 13,
  },
  coinPure: {
    fontSize: 7.5,
    fontWeight: "700",
    color: "rgba(28,35,64,0.55)",
    letterSpacing: 1.8,
    marginTop: 2,
  },
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
    backgroundColor: "#F7F6F3",
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
    backgroundColor: "#F7F6F3",
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
  equivSub: { fontSize: 11, color: "#A07830", fontWeight: "500" },
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
    backgroundColor: "#F7F6F3",
  },
  chipActive: { borderColor: C.gold, backgroundColor: C.goldLight },
  chipText: { fontSize: 13, fontWeight: "600", color: C.navyLight },
  chipTextActive: { color: C.gold },

  // Sell CTA
  sellBtnMain: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "rgba(200,149,42,0.35)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  sellBtnGrad: { paddingVertical: 17, alignItems: "center", borderRadius: 14 },
  sellBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
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
  infoEmoji: { fontSize: 18 },
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
    backgroundColor: "#FFFBEB",
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noticeIcon: { fontSize: 22, marginRight: 12 },
  noticeContent: { flex: 1 },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 3,
  },
  noticeSub: { fontSize: 12, color: "#B45309" },
});

export default SellGoldScreen;
