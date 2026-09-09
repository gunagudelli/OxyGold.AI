import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import { getAllGoldRates } from "./physicalGoldApi";

const C = {
  bg:           "#FFFFFF",
  bgCard:       "#FFFFFF",
  navy:         "#15151A",
  gold:         "#0E6B57",
  goldBright:   "#14876D",
  goldMuted:    "rgba(14,107,87,0.08)",
  textPrimary:  "#1C1C1E",
  textSecondary:"#7A7A80",
  textMuted:    "#A79C93",
  green:        "#1F8A4C",
  red:          "#C0392B",
  border:       "#E7E0DA",
  divider:      "#EEEBE8",
  shadowDark:   "rgba(34,30,28,0.08)",
};

const OUR_COMPANY = "OXYGOLD.AI";

// Broad substring match (not an exact-name match) — catches companyUrl,
// siteLink, redirectUrl, webLink, etc., not just a field literally named "url".
const URL_KEYS = /url|website|weblink|sitelink|redirect/i;

const findWebsiteUrl = (row) => {
  for (const [key, value] of Object.entries(row || {})) {
    if (URL_KEYS.test(key) && typeof value === "string" && value.startsWith("http")) return value;
  }
  return null;
};

// A small, tasteful palette for competitor brand names — deterministic per
// company name (hashed), so the same brand always gets the same color across
// refreshes instead of shifting with list order.
const BRAND_COLORS = ["#2C6E7F", "#8E44AD", "#B5495B", "#3B6E4F", "#946200", "#5A5FCC"];
const brandColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BRAND_COLORS[hash % BRAND_COLORS.length];
};

const fmt = (n, decimals = 0) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// they - us: positive means the other provider is pricier.
const getDiff = (ourPrice, theirPrice) => {
  if (!ourPrice || !theirPrice) return null;
  const diff = theirPrice - ourPrice;
  if (diff === 0) return { text: "Same price", tone: "neutral" };
  if (diff > 0) return { text: `+₹${fmt(diff)} vs you`, tone: "higher" };
  return { text: `-₹${fmt(Math.abs(diff))} vs you`, tone: "lower" };
};

const minutesAgoLabel = (date) => {
  if (!date) return "";
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return "Prices updated just now";
  if (mins === 1) return "Prices updated 1 minute ago";
  return `Prices updated ${mins} minutes ago`;
};

// ─── Live pulse dot ─────────────────────────────────────────────────────────
const LivePulse = () => {
  const anim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[styles.liveDot, { opacity: anim }]} />;
};

// ─── Decorative trend line on the hero card ─────────────────────────────────
const TrendLine = () => (
  <Svg width="100%" height={90} viewBox="0 0 390 90" style={styles.trendSvg}>
    <Defs>
      <LinearGradient id="trendGrad" x1="0" y1="0" x2="390" y2="0">
        <Stop offset="0" stopColor={C.goldBright} stopOpacity={0} />
        <Stop offset="0.5" stopColor={C.goldBright} stopOpacity={0.6} />
        <Stop offset="1" stopColor={C.goldBright} stopOpacity={0} />
      </LinearGradient>
    </Defs>
    <Path
      d="M0 68 C 60 64, 90 40, 140 44 C 190 48, 210 18, 260 14 C 310 10, 330 30, 390 6"
      stroke="url(#trendGrad)"
      strokeWidth={2}
      fill="none"
    />
  </Svg>
);

// ─── Hero — our own live rate, big and scannable at a glance ───────────────
const HeroRate = ({ row, updatedLabel }) => {
  const gold24 = Number(row?.rate24kt) || 0;
  const gold22 = Number(row?.rate22kt) || 0;
  const silver = Number(row?.silverprice1g) || 0;

  return (
    <View style={styles.hero}>
      <TrendLine />

      <View style={styles.heroTopRow}>
        <Text style={styles.heroBrand}>OXYGOLD.AI</Text>
        <View style={styles.liveBadge}>
          <LivePulse />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      </View>

      <Text style={styles.heroLabel}>Gold 24K, per gram</Text>
      <Text style={styles.heroPrice}>
        ₹{fmt(gold24)}<Text style={styles.heroPriceUnit}> /gram</Text>
      </Text>

      <View style={styles.heroStatRow}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatLabel}>22K Gold</Text>
          <Text style={styles.heroStatValue}>₹{fmt(gold22)}<Text style={styles.heroStatUnit}> /gm</Text></Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatLabel}>Silver</Text>
          <Text style={styles.heroStatValue}>₹{fmt(silver, 2)}<Text style={styles.heroStatUnit}> /gm</Text></Text>
        </View>
      </View>

      {updatedLabel && <Text style={styles.heroUpdated}>{updatedLabel}</Text>}
    </View>
  );
};

// ─── All 6 rate cells for one provider — nothing hidden behind a toggle ─────
const readRates = (row) => {
  const gold22g = Number(row?.rate22kt) || 0;
  const gold24g = Number(row?.rate24kt) || 0;
  const silverG = Number(row?.silverprice1g) || 0;
  // Always computed as a straight ×1000 unit conversion of the real per-gram
  // rate, rather than trusting a raw /kg field — some providers' own /kg
  // figures are internally inconsistent with their /gm figures.
  return {
    gold22g, gold24g, silverG,
    gold22kg: gold22g * 1000,
    gold24kg: gold24g * 1000,
    silverKg: silverG * 1000,
  };
};

const RateCell = ({ label, value, decimals = 0, unit }) => (
  <View style={styles.rateCell}>
    <Text style={styles.rateCellLabel}>{label}</Text>
    {value > 0 ? (
      <Text style={styles.rateCellValue}>
        ₹{fmt(value, decimals)}<Text style={styles.rateCellUnit}> {unit}</Text>
      </Text>
    ) : (
      <Text style={styles.rowDash}>—</Text>
    )}
  </View>
);

// ─── One provider card — all 6 prices at once, plus the delta vs you ───────
const ProviderCard = ({ row, ourGold24, isUs, isLast }) => {
  const companyName = row?.companyName || row?.company || row?.name || "Unknown";
  const rates = readRates(row);
  const diff = !isUs ? getDiff(ourGold24, rates.gold24g) : null;
  const websiteUrl = findWebsiteUrl(row);
  const nameColor = isUs ? C.gold : brandColor(companyName);

  return (
    <View style={[styles.card, isUs && styles.cardUs, !isLast && styles.cardDivider]}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardNameWrap}>
          <View style={{ minWidth: 0 }}>
            <Text style={[styles.rowName, { color: nameColor }, isUs && styles.rowNameUs]} numberOfLines={1}>{companyName}</Text>
            {isUs && <Text style={styles.rowYours}>YOUR RATE</Text>}
          </View>
        </View>
        {diff && (
          <Text style={[styles.rowDiff, diff.tone === "lower" ? { color: C.green } : diff.tone === "higher" ? { color: C.red } : { color: C.textMuted }]}>
            {diff.text}
          </Text>
        )}
      </View>

      <View style={styles.rateGrid}>
        <RateCell label="24K Gold /g"  value={rates.gold24g}  unit="/gm" />
        <RateCell label="24K Gold /kg" value={rates.gold24kg} unit="/kg" />
        <RateCell label="22K Gold /g"  value={rates.gold22g}  unit="/gm" />
        <RateCell label="22K Gold /kg" value={rates.gold22kg} unit="/kg" />
        <RateCell label="Silver /g"    value={rates.silverG}  unit="/gm" decimals={2} />
        <RateCell label="Silver /kg"   value={rates.silverKg} unit="/kg" />
      </View>

      {websiteUrl && (
        <TouchableOpacity
          style={styles.visitBtn}
          onPress={() => Linking.openURL(websiteUrl)}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={14} color={C.gold} />
          <Text style={styles.visitBtnText}>Visit official website</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const PgAllRatesScreen = ({ navigation }) => {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(false);
  const [lastLoadAt, setLastLoadAt] = useState(null);
  const [, forceTick]               = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(false);
    try {
      const data = await getAllGoldRates();
      setRows(data);
      setLastLoadAt(new Date());
    } catch (_) {
      setError(true);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 60000);
    return () => clearInterval(t);
  }, [load]);

  // The "Updated Xm ago" text is computed from lastLoadAt at render time — with
  // no re-render between fetches it would look frozen for the whole 60s cycle,
  // so tick a lightweight re-render every 15s just to keep that label live.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const ourRow    = rows.find((r) => r?.companyName === OUR_COMPANY);
  const others    = rows.filter((r) => r?.companyName !== OUR_COMPANY);
  const ourGold24 = Number(ourRow?.rate24kt) || 0;

  if (error && !rows.length) {
    return (
      <PgLayout title="All Gold Rates" showBack onBack={() => navigation.goBack()}>
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={30} color={C.textMuted} />
          <Text style={styles.errorTitle}>Unable to load gold rates</Text>
          <Text style={styles.errorSubtitle}>Check your connection and try again</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  if (loading) {
    return (
      <PgLayout title="All Gold Rates" showBack onBack={() => navigation.goBack()}>
        <PgLoader label="Loading gold rates..." />
      </PgLayout>
    );
  }

  return (
    <PgLayout title="All Gold Rates" showBack onBack={() => navigation.goBack()}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.gold} colors={[C.gold]} />
        }
      >
        <FadeSlideIn>
        {ourRow ? <HeroRate row={ourRow} updatedLabel={minutesAgoLabel(lastLoadAt)} /> : null}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Compare with other providers</Text>
          <View style={styles.updatedPill}>
            <Ionicons name="time-outline" size={11} color={C.textSecondary} />
            <Text style={styles.sectionSubtitle}>{minutesAgoLabel(lastLoadAt)}</Text>
          </View>
        </View>

        <View style={styles.list}>
          {!rows.length ? (
            <View style={styles.centerState}>
              <Ionicons name="business-outline" size={26} color={C.textMuted} />
              <Text style={styles.emptyTitle}>No rate data to show right now</Text>
            </View>
          ) : (
            <>
              {ourRow && (
                <ProviderCard row={ourRow} ourGold24={ourGold24} isUs isLast={!others.length} />
              )}
              {others.map((row, i) => (
                <ProviderCard
                  key={row?.companyName || i}
                  row={row}
                  ourGold24={ourGold24}
                  isUs={false}
                  isLast={i === others.length - 1}
                />
              ))}
            </>
          )}
        </View>
        </FadeSlideIn>
      </ScrollView>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, backgroundColor: C.bg, flexGrow: 1 },

  // ── Hero ──
  hero: {
    position: "relative", overflow: "hidden",
    backgroundColor: C.navy, borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "rgba(0,0,0,0.2)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  trendSvg: { position: "absolute", left: 0, top: 4 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  heroBrand: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.7)", letterSpacing: 1 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#4ADE80" },
  liveBadgeText: { fontSize: 9, fontWeight: "800", color: "#4ADE80", letterSpacing: 0.5 },

  heroLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.5)", marginBottom: 4 },
  heroPrice: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.6, marginBottom: 12 },
  heroPriceUnit: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.45)" },

  heroStatRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 11 },
  heroStat: { flex: 1, gap: 2 },
  heroStatDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: 14 },
  heroStatLabel: { fontSize: 10.5, fontWeight: "600", color: "rgba(255,255,255,0.55)" },
  heroStatValue: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },
  heroStatUnit: { fontSize: 9.5, fontWeight: "700", color: "rgba(255,255,255,0.45)" },

  heroUpdated: { fontSize: 10, color: "rgba(255,255,255,0.38)", marginTop: 10, textAlign: "right" },

  // ── Section ──
  sectionHead: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.3 },
  updatedPill: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  sectionSubtitle: { fontSize: 11.5, fontWeight: "600", color: C.textSecondary },

  // ── Provider list — one flat surface, rows separated by a hairline, not
  // boxed cards ──
  list: {
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 18,
    overflow: "hidden",
  },
  card: { padding: 14 },
  cardDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  cardUs: { backgroundColor: C.goldMuted },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardNameWrap: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },

  rowName: { fontSize: 13, fontWeight: "700", color: C.textPrimary },
  rowNameUs: { color: C.textPrimary, fontWeight: "800" },
  rowYours: { fontSize: 9.5, fontWeight: "800", color: C.textPrimary, opacity: 0.8, marginTop: 1, letterSpacing: 0.3 },
  rowDiff: { fontSize: 10, fontWeight: "700", marginLeft: 8 },
  rowDash: { fontSize: 13, color: C.textMuted },

  // ── 2-column rate grid — all 6 prices, nothing hidden ──
  rateGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -8 },
  rateCell: { width: "50%", paddingHorizontal: 8, marginBottom: 10 },
  rateCellLabel: { fontSize: 10, fontWeight: "600", color: C.textSecondary, marginBottom: 2 },
  rateCellValue: { fontSize: 13, fontWeight: "800", color: C.textPrimary },
  rateCellUnit: { fontSize: 9, fontWeight: "700", color: C.textMuted },

  visitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderTopWidth: 1, borderTopColor: C.divider, marginTop: 2, paddingTop: 10,
  },
  visitBtnText: { fontSize: 12, fontWeight: "700", color: C.textPrimary },

  // ── States ──
  centerState: { alignItems: "center", paddingVertical: 60, gap: 8, paddingHorizontal: 24 },
  errorTitle: { fontSize: 15, fontWeight: "700", color: C.textPrimary, marginTop: 4 },
  errorSubtitle: { fontSize: 12.5, color: C.textMuted, textAlign: "center" },
  retryBtn: { marginTop: 14, backgroundColor: C.gold, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11 },
  retryBtnText: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },
  emptyTitle: { fontSize: 13.5, fontWeight: "600", color: C.textSecondary, textAlign: "center" },
});

export default PgAllRatesScreen;
