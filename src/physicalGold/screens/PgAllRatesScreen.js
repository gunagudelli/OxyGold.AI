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
import { getAllGoldRates } from "../api/physicalGoldApi";

const C = {
  bg:           "#FFFFFF",
  bgCard:       "#FFFFFF",
  navy:         "#15151A",
  gold:         "#6C4AB6",
  goldBright:   "#8466C9",
  goldMuted:    "rgba(108,74,182,0.08)",
  textPrimary:  "#1C1C1E",
  textSecondary:"#7A7A80",
  textMuted:    "#A79C93",
  green:        "#146C3B",
  red:          "#C0392B",
  border:       "#E7E0DA",
  divider:      "#EEEBE8",
  shadowDark:   "rgba(34,30,28,0.08)",
};

const OUR_COMPANY = "OXYGOLD.AI";

// Only these reference/competitor brands are shown — we have the right to
// display these specifically. IBJA and anything else the rates API returns
// is hidden from this page entirely. Matched as a substring, case-insensitive,
// so "Kalyan Jewellers" / "Kalyan" / "KALYAN JEWELLERS LTD" all match.
const ALLOWED_COMPETITORS = ["joyalukkas", "bhima", "kalyan", "lalitha"];
const isAllowedCompetitor = (name) => {
  const n = (name || "").toLowerCase();
  return ALLOWED_COMPETITORS.some((brand) => n.includes(brand));
};

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

// ─── Per-gram rates only — 24K, 22K, Silver ────────────────────────────────
const readRates = (row) => ({
  gold22g: Number(row?.rate22kt) || 0,
  gold24g: Number(row?.rate24kt) || 0,
  silverG: Number(row?.silverprice1g) || 0,
});

// ─── One comparison row — reference price on the left, OxyGold.ai on the
// right, with a clear +/- difference badge in between. ─────────────────────
const CompareRow = ({ label, theirValue, ourValue, decimals = 0, last }) => {
  const diff = getDiff(ourValue, theirValue);
  return (
    <View style={[styles.compareRow, !last && styles.compareRowDivider]}>
      <Text style={styles.compareLabel}>{label}</Text>
      <View style={styles.compareValuesRow}>
        <View style={styles.compareValueCol}>
          {theirValue > 0 ? (
            <Text style={styles.compareTheirValue}>₹{fmt(theirValue, decimals)}</Text>
          ) : (
            <Text style={styles.rowDash}>—</Text>
          )}
        </View>

        {diff ? (
          <View style={[
            styles.diffBadge,
            diff.tone === "lower" ? styles.diffBadgeLower : diff.tone === "higher" ? styles.diffBadgeHigher : styles.diffBadgeNeutral,
          ]}>
            {diff.tone !== "neutral" && (
              <Ionicons
                name={diff.tone === "higher" ? "arrow-up" : "arrow-down"}
                size={10}
                color={diff.tone === "higher" ? C.red : C.green}
                style={styles.diffBadgeArrow}
              />
            )}
            <Text style={[
              styles.diffBadgeText,
              diff.tone === "lower" ? { color: C.green } : diff.tone === "higher" ? { color: C.red } : { color: C.textMuted },
            ]}>
              {diff.tone === "neutral" ? "0" : `₹${fmt(Math.abs(theirValue - ourValue), decimals)}`}
            </Text>
          </View>
        ) : (
          <View style={styles.diffBadge} />
        )}

        <View style={styles.compareValueCol}>
          {ourValue > 0 ? (
            <Text style={styles.compareOurValue}>₹{fmt(ourValue, decimals)}</Text>
          ) : (
            <Text style={styles.rowDash}>—</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── One competitor card — 24K/22K/Silver per gram, side by side with our
// OxyGold.ai rate, plus a clear +/- difference per row. ─────────────────────
const ProviderCard = ({ row, ourRates, isLast }) => {
  const companyName = row?.companyName || row?.company || row?.name || "Unknown";
  const rates = readRates(row);
  const websiteUrl = findWebsiteUrl(row);
  const nameColor = brandColor(companyName);

  return (
    <View style={[styles.card, !isLast && styles.cardDivider]}>
      <View style={styles.cardTopRow}>
        <Text style={[styles.rowName, { color: nameColor }]} numberOfLines={1}>{companyName}</Text>
      </View>

      <View style={styles.compareHeaderRow}>
        <Text style={styles.compareHeaderLabel} />
        <View style={styles.compareValuesRow}>
          <Text style={[styles.compareHeaderCol, { color: nameColor }]}>{companyName}</Text>
          <View style={styles.diffBadge} />
          <Text style={[styles.compareHeaderCol, { color: C.gold }]}>OXYGOLD.AI</Text>
        </View>
      </View>

      <CompareRow label="24K Gold /gm" theirValue={rates.gold24g} ourValue={ourRates.gold24g} />
      <CompareRow label="22K Gold /gm" theirValue={rates.gold22g} ourValue={ourRates.gold22g} />
      <CompareRow label="Silver /gm" theirValue={rates.silverG} ourValue={ourRates.silverG} decimals={2} last />

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
  // Only the competitor brands we have the right to display — this also
  // quietly hides IBJA (and anything else the API returns) since it's not
  // in the allow-list.
  const others    = rows.filter((r) => r?.companyName !== OUR_COMPANY && isAllowedCompetitor(r?.companyName));
  const ourRates  = readRates(ourRow || {});

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
          {!others.length ? (
            <View style={styles.centerState}>
              <Ionicons name="business-outline" size={26} color={C.textMuted} />
              <Text style={styles.emptyTitle}>No rate data to show right now</Text>
            </View>
          ) : (
            <>
              {others.map((row, i) => (
                <ProviderCard
                  key={row?.companyName || i}
                  row={row}
                  ourRates={ourRates}
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
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },

  rowName: { fontSize: 13, fontWeight: "700", color: C.textPrimary },
  rowDash: { fontSize: 13, color: C.textMuted },

  // ── Comparison header — brand name left, "OXYGOLD.AI" right ──
  compareHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  compareHeaderLabel: { flex: 1 },
  compareHeaderCol: { flex: 1, fontSize: 9.5, fontWeight: "800", letterSpacing: 0.4, textAlign: "center" },

  // ── One row per metal — label left, [their price | diff | our price] right ──
  compareRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  compareRowDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  compareLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: C.textSecondary },
  compareValuesRow: { flex: 2, flexDirection: "row", alignItems: "center" },
  compareValueCol: { flex: 1, alignItems: "center" },
  compareTheirValue: { fontSize: 13.5, fontWeight: "700", color: C.textPrimary },
  compareOurValue: { fontSize: 13.5, fontWeight: "800", color: C.gold },

  diffBadge: {
    minWidth: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
  },
  diffBadgeLower: { backgroundColor: "rgba(20,108,59,0.10)" },
  diffBadgeHigher: { backgroundColor: "rgba(192,57,43,0.10)" },
  diffBadgeNeutral: { backgroundColor: C.divider },
  diffBadgeArrow: { marginTop: -1 },
  diffBadgeText: { fontSize: 10.5, fontWeight: "800" },

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
