import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  memo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  TextInput,
  Keyboard,
  Alert,
  Animated,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { useGold } from "../context/GoldContext";
import { COLORS } from "../constants/theme";
import {
  previewBuy,
  fetchPortfolio,
  fetchTransactions,
} from "../services/goldApi";

// ─── Design Tokens — sourced from the shared theme (src/constants/theme.js) ──
const C = {
  bg: COLORS.bg,
  card: COLORS.bgCard,
  gold: COLORS.goldMid,
  goldLight: COLORS.goldPale,
  goldMid: COLORS.goldBright,
  navy: COLORS.navy,
  navyMid: COLORS.navyMid,
  navyLight: COLORS.navySoft,
  green: COLORS.green,
  greenBg: COLORS.greenBg,
  red: COLORS.red,
  redBg: COLORS.redBg,
  border: COLORS.border,
  divider: COLORS.divider,
};

const CTA = "#1A1A1A";

// ─── Cache to prevent repeated API calls on focus ─────────────────────────────
let _portfolioCache = null;
let _transactionsCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

const fmtINR = (n, digits = 0) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: digits });

const relativeDate = (timestamp) => {
  const d = new Date(timestamp);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / oneDay);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

// ─── Skeleton shimmer ──────────────────────────────────────────────────────────
const Pulse = memo(({ style }) => {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[style, { opacity: anim }]} />;
});

const HeroSkeleton = memo(() => (
  <View style={s.heroCard}>
    <Pulse style={[s.skelBlock, { width: 90, height: 10, backgroundColor: "#F2F0EB", marginBottom: 12 }]} />
    <Pulse style={[s.skelBlock, { width: 160, height: 30, backgroundColor: "#F2F0EB" }]} />
    <View style={[s.heroDivider, { marginTop: 20 }]} />
    <Pulse style={[s.skelBlock, { width: 110, height: 22, backgroundColor: "#F2F0EB" }]} />
  </View>
));

const TxnSkeleton = memo(() => (
  <View style={s.txnCard}>
    {[0, 1, 2].map((i) => (
      <View key={i} style={[s.txnRow, i < 2 && s.txnBorder]}>
        <Pulse style={[s.skelBlock, { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F2F0EB" }]} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Pulse style={[s.skelBlock, { width: 90, height: 11, backgroundColor: "#F2F0EB" }]} />
        </View>
      </View>
    ))}
  </View>
));

// ─── Sub-components (memoized) ────────────────────────────────────────────────

/**
 * HeroCard — live price + your gold, on one light card (no separate holdings block,
 * no dark fill — the previous solid-navy card was the single heaviest element on screen).
 */
const HeroCard = memo(
  ({ goldRate, currentValue, goldBalance, totalInvested, gainPercent, totalGain, isProfit, onSell }) => (
    <View style={s.heroCard}>
      <View style={s.livePriceTag}>
        <View style={s.livePriceDot} />
        <Text style={s.livePriceText}>LIVE GOLD PRICE</Text>
      </View>
      <View style={s.heroPriceLine}>
        <Text style={s.heroPrice}>₹{fmtINR(goldRate, 2)}</Text>
        <Text style={s.heroPriceSub}>/ gram</Text>
      </View>
      <Text style={s.heroPurity}>24K · 999.9 purity</Text>

      {goldBalance > 0 && (
        <>
          <View style={s.heroDivider} />

          <View style={s.heroPortfolioTop}>
            <Text style={s.heroPortLabel}>YOUR GOLD</Text>
            <TouchableOpacity onPress={onSell} activeOpacity={0.7}>
              <Text style={s.heroSellLink}>Sell Gold ›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.heroPortfolio}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroPortValue}>{goldBalance.toFixed(4)} g</Text>
              <Text style={s.heroPortSub}>
                Invested ₹{fmtINR(totalInvested)} · Now ₹{fmtINR(currentValue)}
              </Text>
            </View>
            <View style={[s.heroGainTag, !isProfit && s.heroGainTagRed]}>
              <Text style={[s.heroGainPct, !isProfit && s.heroGainRed]}>
                {isProfit ? "▲" : "▼"} {Math.abs(gainPercent).toFixed(2)}%
              </Text>
              <Text style={[s.heroGainAmt, !isProfit && s.heroGainAmtRed]}>
                {isProfit ? "Profit" : "Loss"} ₹{fmtINR(Math.abs(totalGain))}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  )
);

/**
 * TradeCard — segmented Buy / Sell control with a single shared form shell.
 * Only one of the two flows is ever visible, so the two actions never compete.
 */
const TradeCard = memo(
  ({
    tradeMode,
    onTradeModeChange,
    hasHoldings,

    // Buy
    buyMode,
    amount,
    gramsPreview,
    rupeesPreview,
    onBuyModeChange,
    onAmountChange,
    onBuy,
    buyLoading,

    // Sell
    sellMode,
    sellAmount,
    sellGramsPreview,
    sellRupeesPreview,
    onSellModeChange,
    onSellAmountChange,
    onSellSubmit,
    availableGold,
    sellPrice,

    inputRef,
  }) => {
    const isBuy = tradeMode === "buy";
    const numAmount = parseFloat(isBuy ? amount : sellAmount);
    const isAmountValid = !!numAmount && numAmount > 0 && !isNaN(numAmount);
    const belowMinimum =
      isAmountValid &&
      ((isBuy && buyMode === "rupees" && numAmount < 100) ||
        (!isBuy && sellMode === "rupees" && numAmount < 100));

    const mode = isBuy ? buyMode : sellMode;
    const value = isBuy ? amount : sellAmount;
    const onModeChange = isBuy ? onBuyModeChange : onSellModeChange;
    const onValueChange = isBuy ? onAmountChange : onSellAmountChange;

    // Label direction depends on which value is entered vs. computed —
    // "You receive" only applies when the computed side is what the user gets.
    let receiveInfo = null;
    if (isBuy) {
      if (gramsPreview) receiveInfo = { label: "You receive", value: `≈ ${gramsPreview} g` };
      else if (rupeesPreview) receiveInfo = { label: "Total cost", value: `≈ ₹${rupeesPreview}` };
    } else {
      if (sellRupeesPreview) receiveInfo = { label: "You receive", value: `≈ ₹${sellRupeesPreview}` };
      else if (sellGramsPreview) receiveInfo = { label: "Gold you'll sell", value: `≈ ${sellGramsPreview} g` };
    }

    const sellChips = useMemo(
      () =>
        [0.25, 0.5, 0.75, 1].map((pct) => ({
          label: pct === 1 ? "All" : `${pct * 100}%`,
          rupVal: String(Math.round(availableGold * sellPrice * pct)),
          gramVal: (availableGold * pct).toFixed(4),
        })),
      [availableGold, sellPrice]
    );

    return (
      <View style={s.card}>
        {/* Buy / Sell segmented control */}
        <View style={s.segmented}>
          <TouchableOpacity
            style={[s.segTab, isBuy && s.segTabActiveBuy]}
            onPress={() => onTradeModeChange("buy")}
            activeOpacity={0.8}
          >
            <Text style={[s.segTabText, isBuy && s.segTabTextActive]}>Buy Gold</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segTab, !isBuy && s.segTabActiveSell]}
            onPress={() => hasHoldings && onTradeModeChange("sell")}
            activeOpacity={0.8}
            disabled={!hasHoldings}
          >
            <Text
              style={[
                s.segTabText,
                !isBuy && s.segTabTextActive,
                !hasHoldings && s.segTabTextDisabled,
              ]}
            >
              Sell Gold
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rupees / Grams toggle */}
        <View style={s.toggle}>
          {["rupees", "grams"].map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => onModeChange(m)}
              style={[s.toggleTab, mode === m && s.toggleTabActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleTabText, mode === m && s.toggleTabTextActive]}>
                {m === "rupees" ? "₹ Rupees" : "Grams"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.inputLabel}>Enter amount</Text>
        <View style={s.inputBox}>
          <Text style={s.inputSymbol}>{mode === "rupees" ? "₹" : "g"}</Text>
          <TextInput
            ref={isBuy ? inputRef : undefined}
            style={s.input}
            placeholder="0"
            placeholderTextColor="#D1D5DB"
            value={value}
            onChangeText={onValueChange}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        {receiveInfo ? (
          <View style={s.equivRow}>
            <Text style={s.equivLabel}>{receiveInfo.label}</Text>
            <Text style={s.equivText}>{receiveInfo.value}</Text>
          </View>
        ) : belowMinimum ? (
          <Text style={s.inputHintError}>Minimum amount is ₹100</Text>
        ) : (
          <View style={s.inputHintRow}>
            <Text style={s.inputHint}>
              {isBuy
                ? "Minimum ₹100  ·  3% GST included"
                : `Available ${availableGold.toFixed(4)} g  ·  Min ₹100`}
            </Text>
            <Ionicons name="information-circle-outline" size={13} color={C.navyLight} />
          </View>
        )}

        {/* Quick amounts */}
        {isBuy && mode === "rupees" && (
          <View style={s.chips}>
            {[
              ["100", "₹100"],
              ["500", "₹500"],
              ["1000", "₹1K"],
              ["10000", "₹10K"],
            ].map(([val, label]) => (
              <TouchableOpacity
                key={val}
                onPress={() => onValueChange(val)}
                style={[s.chip, amount === val && s.chipActive]}
                activeOpacity={0.75}
              >
                <Text style={[s.chipText, amount === val && s.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!isBuy && availableGold > 0 && (
          <View style={s.chips}>
            {sellChips.map(({ label, rupVal, gramVal }) => {
              const val = sellMode === "rupees" ? rupVal : gramVal;
              const isActive = sellAmount === val;
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => onSellAmountChange(val)}
                  style={[s.chip, isActive && s.chipActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.chipText, isActive && s.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          onPress={isBuy ? onBuy : onSellSubmit}
          disabled={!isAmountValid || (isBuy && buyLoading)}
          activeOpacity={0.85}
          style={[
            s.ctaBtn,
            (!isAmountValid || (isBuy && buyLoading)) && s.ctaBtnDisabled,
          ]}
        >
          {isBuy && buyLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={s.ctaBtnText}>
                {!isAmountValid
                  ? "Enter Amount"
                  : isBuy
                  ? "Proceed to Buy"
                  : "Proceed to Sell"}
              </Text>
              {isAmountValid && <Ionicons name="arrow-forward" size={17} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }
);

/**
 * TransactionRow — single compact row in the recent-activity list
 */
const TransactionRow = memo(({ txn, isLast }) => {
  const isBuy = txn.type === "BUY";
  return (
    <View style={[s.txnRow, !isLast && s.txnBorder]}>
      <View style={[s.txnDot, isBuy ? s.txnDotBuy : s.txnDotSell]}>
        <Ionicons
          name={isBuy ? "arrow-down" : "arrow-up"}
          size={15}
          color={isBuy ? C.green : C.red}
        />
      </View>
      <View style={s.txnMid}>
        <Text style={s.txnType}>{isBuy ? "Buy Gold" : "Sell Gold"}</Text>
        <Text style={s.txnDate}>{relativeDate(txn.timestamp)}</Text>
      </View>
      <View style={s.txnRight}>
        <Text style={[s.txnGrams, isBuy ? s.txnGramsBuy : s.txnGramsSell]}>
          {isBuy ? "+" : "-"}
          {txn.grams.toFixed(4)} g
        </Text>
        <Text style={s.txnAmt}>₹{fmtINR(txn.amount)}</Text>
      </View>
    </View>
  );
});

/**
 * PhysicalGoldBanner
 */
const PhysicalGoldBanner = memo(({ onPress }) => (
  <TouchableOpacity style={s.physicalGoldBanner} onPress={onPress} activeOpacity={0.7}>
    <View style={s.pgIconWrap}>
      <Ionicons name="storefront-outline" size={19} color={C.gold} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.pgTitle}>Try Physical Gold</Text>
      <Text style={s.pgSubtitle}>BIS Hallmarked · Delivered to your door</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#D4AF37" />
  </TouchableOpacity>
));

/**
 * PANAlert
 */
const PANAlert = memo(() => (
  <View style={s.panAlert}>
    <View style={s.panAlertIconWrap}>
      <Ionicons name="card-outline" size={18} color="#D4A574" />
    </View>
    <View style={s.panAlertContent}>
      <Text style={s.panAlertTitle}>Verify your PAN</Text>
      <Text style={s.panAlertSub}>Required for purchases above ₹50,000</Text>
    </View>
    <TouchableOpacity style={s.panBtn} activeOpacity={0.8}>
      <Text style={s.panBtnText}>Verify</Text>
    </TouchableOpacity>
  </View>
));

// ─── Main Screen ──────────────────────────────────────────────────────────────
const DigitalGoldScreen = ({ navigation, route }) => {
  const { state } = useGold();
  const goldRate = state.goldPrice?.pricePerGram || 16236;
  const sellPrice = state.goldPrice?.sellPrice || 16236;
  const userId = useSelector(selectUserId);
  const accessToken = route?.params?.accessToken;

  const [tradeMode, setTradeMode] = useState("buy");

  const [buyMode, setBuyMode] = useState("rupees");
  const [amount, setAmount] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [sellMode, setSellMode] = useState("rupees");
  const [sellAmount, setSellAmount] = useState("");

  const [portfolio, setPortfolio] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txnLoading, setTxnLoading] = useState(false);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // ── Cached data loader — skips API if data is fresh ───────────────────────
  const loadScreenData = useCallback(async () => {
    if (!userId) return;

    const now = Date.now();
    const cacheHit = _portfolioCache && now - _cacheTimestamp < CACHE_TTL_MS;

    if (cacheHit) {
      setPortfolio(_portfolioCache);
      setTransactions(_transactionsCache ?? []);
      return;
    }

    setPortfolioLoading(true);
    setTxnLoading(true);

    try {
      const [portfolioData, txnData] = await Promise.allSettled([
        fetchPortfolio(userId),
        fetchTransactions(userId),
      ]);

      const p =
        portfolioData.status === "fulfilled"
          ? portfolioData.value
          : {
              totalGoldGrams: 0,
              totalInvestedAmount: 0,
              currentValue: 0,
              totalGain: 0,
              gainPercentage: 0,
            };

      const t = txnData.status === "fulfilled" ? txnData.value.slice(0, 5) : [];

      // Update module-level cache
      _portfolioCache = p;
      _transactionsCache = t;
      _cacheTimestamp = Date.now();

      setPortfolio(p);
      setTransactions(t);
    } catch {
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
    }, [loadScreenData])
  );

  // Snap back to Buy if the user has nothing left to sell (e.g. just sold everything)
  useEffect(() => {
    if (tradeMode === "sell" && portfolio && (portfolio.totalGoldGrams ?? 0) <= 0) {
      setTradeMode("buy");
    }
  }, [portfolio, tradeMode]);

  // ── Derived values via useMemo — computed once, not on every render ────────
  const { goldBalance, currentValue, totalInvested, totalGain, gainPercent, isProfit } =
    useMemo(() => {
      const gb = portfolio?.totalGoldGrams ?? state.portfolio?.totalGrams ?? 0;
      const cv = portfolio?.currentValue ?? gb * goldRate;
      const ti = portfolio?.totalInvestedAmount ?? state.portfolio?.totalInvested ?? 0;
      const tg = portfolio?.totalGain ?? cv - ti;
      const gp = portfolio?.gainPercentage ?? 0;
      return {
        goldBalance: gb,
        currentValue: cv,
        totalInvested: ti,
        totalGain: tg,
        gainPercent: gp,
        isProfit: tg >= 0,
      };
    }, [portfolio, state.portfolio, goldRate]);

  // ── Buy preview (unchanged formulas) ────────────────────────────────────────
  const gramsPreview = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount)) || buyMode !== "rupees") return null;
    return (parseFloat(amount) / goldRate).toFixed(4);
  }, [amount, buyMode, goldRate]);

  const rupeesPreview = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount)) || buyMode !== "grams") return null;
    return (parseFloat(amount) * goldRate).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  }, [amount, buyMode, goldRate]);

  // ── Sell preview (same formula shape as SellGoldScreen) ─────────────────────
  const sellGramsPreview = useMemo(() => {
    if (!sellAmount || isNaN(parseFloat(sellAmount)) || sellMode !== "rupees") return null;
    return (parseFloat(sellAmount) / sellPrice).toFixed(4);
  }, [sellAmount, sellMode, sellPrice]);

  const sellRupeesPreview = useMemo(() => {
    if (!sellAmount || isNaN(parseFloat(sellAmount)) || sellMode !== "grams") return null;
    return (parseFloat(sellAmount) * sellPrice).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  }, [sellAmount, sellMode, sellPrice]);

  // ── Stable callbacks ───────────────────────────────────────────────────────
  const handleBuyModeChange = useCallback((mode) => {
    setBuyMode(mode);
    setAmount("");
  }, []);

  const handleAmountChange = useCallback((val) => setAmount(val), []);

  const handleSellModeChange = useCallback((mode) => {
    setSellMode(mode);
    setSellAmount("");
  }, []);

  const handleSellAmountChange = useCallback((val) => setSellAmount(val), []);

  const handleTradeModeChange = useCallback((mode) => setTradeMode(mode), []);

  const handleGoToSell = useCallback(() => setTradeMode("sell"), []);

  const handlePhysicalGold = useCallback(
    () => navigation.navigate("PgHome", { accessToken, userId }),
    [navigation, accessToken, userId]
  );

  const handleViewAllTxns = useCallback(
    () => navigation.navigate("Transactions"),
    [navigation]
  );

  const handleBuyGold = useCallback(async () => {
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
      if (!userId) {
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
        sendGrams = Math.round(numAmount * 1_000_000) / 1_000_000;
        const goldValue = Math.round(sendGrams * goldRate * 100) / 100;
        const gst = Math.round(goldValue * 0.03 * 100) / 100;
        sendAmount = Math.round((goldValue + gst) * 100) / 100;
      }

      const preview = await previewBuy({
        userId,
        purchaseType,
        amount: sendAmount,
        grams: sendGrams,
        pergramBuyingPrice: goldRate,
      });

      if (!preview) throw new Error("Failed to get order preview. Please try again.");
      navigation.navigate("PaymentReview", { preview, buyMode, goldRate });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to preview order. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  }, [amount, buyMode, userId, goldRate, navigation]);

  // ── Sell submit — same validation/navigation shape as SellGoldScreen ───────
  const handleSellSubmit = useCallback(() => {
    if (!sellAmount || parseFloat(sellAmount) <= 0 || isNaN(parseFloat(sellAmount))) {
      Alert.alert("Enter Amount", "Please enter a valid amount to proceed");
      return;
    }
    const numAmount = parseFloat(sellAmount);
    if (sellMode === "rupees" && numAmount < 100) {
      Alert.alert("Minimum Amount", "Minimum sell amount is ₹100");
      return;
    }
    const grams =
      sellMode === "rupees"
        ? (numAmount / sellPrice).toFixed(3)
        : numAmount.toFixed(3);
    if (parseFloat(grams) > goldBalance) {
      Alert.alert("Insufficient Balance", "You don't have enough gold to sell this amount");
      return;
    }
    navigation.navigate("SellSummary", {
      amount: sellMode === "rupees" ? numAmount : (numAmount * sellPrice).toFixed(2),
      grams,
      sellRate: sellPrice,
      availableGold: goldBalance,
      lockedAt: new Date().toISOString(),
    });
  }, [sellAmount, sellMode, sellPrice, goldBalance, navigation]);

  // ── FlatList data — sections rendered as list items ───────────────────────
  const listData = useMemo(
    () => [
      { key: "hero" },
      { key: "trade" },
      { key: "banner" },
      { key: "transactions" },
      { key: "pan" },
    ],
    []
  );

  const renderItem = useCallback(
    ({ item }) => {
      switch (item.key) {
        case "hero":
          return portfolioLoading && !portfolio ? (
            <HeroSkeleton />
          ) : (
            <HeroCard
              goldRate={goldRate}
              currentValue={currentValue}
              goldBalance={goldBalance}
              totalInvested={totalInvested}
              gainPercent={gainPercent}
              totalGain={totalGain}
              isProfit={isProfit}
              onSell={handleGoToSell}
            />
          );

        case "trade":
          return (
            <TradeCard
              tradeMode={tradeMode}
              onTradeModeChange={handleTradeModeChange}
              hasHoldings={goldBalance > 0}
              buyMode={buyMode}
              amount={amount}
              gramsPreview={gramsPreview}
              rupeesPreview={rupeesPreview}
              onBuyModeChange={handleBuyModeChange}
              onAmountChange={handleAmountChange}
              onBuy={handleBuyGold}
              buyLoading={previewLoading}
              sellMode={sellMode}
              sellAmount={sellAmount}
              sellGramsPreview={sellGramsPreview}
              sellRupeesPreview={sellRupeesPreview}
              onSellModeChange={handleSellModeChange}
              onSellAmountChange={handleSellAmountChange}
              onSellSubmit={handleSellSubmit}
              availableGold={goldBalance}
              sellPrice={sellPrice}
              inputRef={inputRef}
            />
          );

        case "banner":
          return <PhysicalGoldBanner onPress={handlePhysicalGold} />;

        case "transactions":
          return (
            <View style={s.section}>
              <View style={s.sectionRowHeader}>
                <Text style={s.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity onPress={handleViewAllTxns}>
                  <Text style={s.viewAll}>View All ›</Text>
                </TouchableOpacity>
              </View>
              {txnLoading && transactions.length === 0 ? (
                <TxnSkeleton />
              ) : transactions.length === 0 ? (
                <View style={s.txnCard}>
                  <View style={s.emptyState}>
                    <View style={s.emptyIconWrap}>
                      <Ionicons name="receipt-outline" size={26} color={C.navyLight} />
                    </View>
                    <Text style={s.emptyText}>No transactions yet</Text>
                  </View>
                </View>
              ) : (
                <View style={s.txnCard}>
                  {transactions.slice(0, 3).map((txn, i, arr) => (
                    <TransactionRow key={txn.id} txn={txn} isLast={i === arr.length - 1} />
                  ))}
                </View>
              )}
            </View>
          );

        case "pan":
          return <PANAlert />;

        default:
          return null;
      }
    },
    [
      goldRate,
      portfolio,
      portfolioLoading,
      txnLoading,
      currentValue,
      goldBalance,
      gainPercent,
      totalGain,
      isProfit,
      totalInvested,
      tradeMode,
      buyMode,
      amount,
      previewLoading,
      gramsPreview,
      rupeesPreview,
      sellMode,
      sellAmount,
      sellGramsPreview,
      sellRupeesPreview,
      sellPrice,
      transactions,
      handleTradeModeChange,
      handleBuyModeChange,
      handleAmountChange,
      handleBuyGold,
      handleSellModeChange,
      handleSellAmountChange,
      handleSellSubmit,
      handleGoToSell,
      handlePhysicalGold,
      handleViewAllTxns,
    ]
  );

  return (
    <SafeAreaView style={s.container} edges={["top"]} backgroundColor={C.bg}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Digital Gold</Text>
        <View style={s.headerRightSpace} />
      </View>

      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.scroll}
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={4}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 6 : 10,
    paddingBottom: 10,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.navy, letterSpacing: 0.1 },
  headerRightSpace: { width: 36 },

  scroll: { paddingBottom: 36, backgroundColor: C.bg },

  skelBlock: { borderRadius: 6 },

  // ── Hero — one light card: live price + your gold ─────────────────────────
  heroCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    shadowColor: "rgba(28,35,64,0.05)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  livePriceTag: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  livePriceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2ECC71" },
  livePriceText: {
    fontSize: 10,
    fontWeight: "600",
    color: C.navyLight,
    letterSpacing: 1.1,
  },
  heroPriceLine: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  heroPrice: { fontSize: 30, fontWeight: "700", color: C.navy, letterSpacing: -0.5 },
  heroPriceSub: { fontSize: 13, color: C.navyLight },
  heroPurity: { fontSize: 12, color: C.navyLight, marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: C.divider, marginVertical: 16 },
  heroPortfolioTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heroPortLabel: { fontSize: 10, fontWeight: "600", color: C.navyLight, letterSpacing: 1.2 },
  heroSellLink: { fontSize: 12.5, fontWeight: "700", color: C.red },
  heroPortfolio: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroPortValue: { fontSize: 21, fontWeight: "800", color: C.gold, letterSpacing: -0.3 },
  heroPortSub: { fontSize: 12, color: C.navyLight, marginTop: 3 },
  heroGainTag: {
    backgroundColor: C.greenBg,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  heroGainTagRed: { backgroundColor: C.redBg },
  heroGainPct: { fontSize: 12.5, fontWeight: "700", color: "#2ECC71", marginBottom: 2 },
  heroGainRed: { color: C.red },
  heroGainAmt: { fontSize: 10.5, color: "#2ECC71", fontWeight: "600" },
  heroGainAmtRed: { color: C.red },

  // ── Trade card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 18,
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#F5F3F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  segTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9 },
  segTabActiveBuy: { backgroundColor: CTA },
  segTabActiveSell: { backgroundColor: C.red },
  segTabText: { fontSize: 13.5, fontWeight: "600", color: C.navyLight },
  segTabTextActive: { color: "#FFFFFF", fontWeight: "700" },
  segTabTextDisabled: { opacity: 0.5 },

  toggle: {
    flexDirection: "row",
    backgroundColor: "#F5F3F0",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  toggleTab: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 9 },
  toggleTabActive: { backgroundColor: "#FFFFFF" },
  toggleTabText: { fontSize: 13, fontWeight: "500", color: "#9CA3AF" },
  toggleTabTextActive: { color: C.navy, fontWeight: "700" },

  inputLabel: { fontSize: 12, fontWeight: "500", color: C.navyLight, marginBottom: 8 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  inputSymbol: { fontSize: 24, fontWeight: "700", color: C.gold, marginRight: 6 },
  input: { flex: 1, fontSize: 28, fontWeight: "700", color: C.navy, paddingVertical: 14 },

  equivRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F6F2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  equivLabel: { fontSize: 12, fontWeight: "500", color: "#C5A100" },
  equivText: { fontSize: 14, fontWeight: "700", color: C.gold },
  inputHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  inputHint: { fontSize: 12, color: C.navyLight },
  inputHintError: { fontSize: 12, color: C.red, fontWeight: "600", marginBottom: 16 },

  chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F5F3F0",
  },
  chipActive: { backgroundColor: C.goldLight },
  chipText: { fontSize: 13, fontWeight: "500", color: "#9CA3AF" },
  chipTextActive: { color: C.gold, fontWeight: "700" },

  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CTA,
    paddingVertical: 15,
    borderRadius: 13,
  },
  ctaBtnDisabled: { backgroundColor: "#D1D5DB" },
  ctaBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 },

  // ── Transactions ─────────────────────────────────────────────────────────
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.navy, marginHorizontal: 16, marginBottom: 10 },
  sectionRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  viewAll: { fontSize: 13, fontWeight: "600", color: C.gold },

  txnCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "rgba(28,35,64,0.05)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyState: { alignItems: "center", paddingVertical: 28 },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F5F3F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyText: { fontSize: 13.5, color: "#9CA3AF" },
  txnRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13 },
  txnBorder: { borderBottomWidth: 1, borderBottomColor: "#F2F0EB" },
  txnDot: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center", marginRight: 12 },
  txnDotBuy: { backgroundColor: "#E8F5E9" },
  txnDotSell: { backgroundColor: "#FDECEA" },
  txnMid: { flex: 1 },
  txnType: { fontSize: 13.5, fontWeight: "600", color: C.navy, marginBottom: 2 },
  txnDate: { fontSize: 11.5, color: "#9CA3AF" },
  txnRight: { alignItems: "flex-end" },
  txnGrams: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  txnGramsBuy: { color: C.green },
  txnGramsSell: { color: C.red },
  txnAmt: { fontSize: 11.5, color: "#9CA3AF" },

  // ── Banner ────────────────────────────────────────────────────────────────
  physicalGoldBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 18,
    backgroundColor: "#F8F6F2",
    borderRadius: 14,
    padding: 13,
  },
  pgIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  pgTitle: { fontSize: 13.5, fontWeight: "700", color: C.navy, marginBottom: 2 },
  pgSubtitle: { fontSize: 11.5, color: "#C5A100" },

  // ── PAN alert ────────────────────────────────────────────────────────────
  panAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 13,
    borderLeftWidth: 3,
    borderLeftColor: "#D4A574",
  },
  panAlertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FDF6ED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },
  panAlertContent: { flex: 1 },
  panAlertTitle: { fontSize: 12.5, fontWeight: "700", color: C.navy, marginBottom: 2 },
  panAlertSub: { fontSize: 11, color: "#9CA3AF" },
  panBtn: { backgroundColor: C.navy, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
  panBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
});

export default DigitalGoldScreen;
