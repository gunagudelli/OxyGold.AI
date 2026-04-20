import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const C = {
  bg:         "#F5F3EE",
  card:       "#FFFFFF",
  navy:       "#1C2340",
  navyMid:    "#3D4463",
  navyLight:  "#8891AF",
  gold:       "#C8952A",
  goldBright: "#D4A843",
  goldLight:  "#F5ECD7",
  goldBorder: "rgba(200,149,42,0.22)",
  goldMuted:  "rgba(200,149,42,0.10)",
  border:     "#EAE8E2",
  divider:    "#F4F3F0",
};

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon:  "trending-up-outline",
    color: "#3B55C8",
    bg:    "#EEF2FF",
    title: "Check Live Gold Price",
    desc:  "Prices update in real-time, linked to the live market rate",
  },
  {
    icon:  "calculator-outline",
    color: "#B45309",
    bg:    "#FEF9EC",
    title: "Enter Amount or Grams",
    desc:  "Buy in ₹ or by weight — as little as ₹100 to start",
  },
  {
    icon:  "shield-checkmark-outline",
    color: "#1D7A42",
    bg:    "#EAF5E9",
    title: "Make Payment Securely",
    desc:  "UPI, net banking or card — your transaction is encrypted",
  },
  {
    icon:  "lock-closed-outline",
    color: "#6D28D9",
    bg:    "#F5F3FF",
    title: "Gold Stored in Insured Vaults",
    desc:  "Your gold is kept safe with our trusted vault partner",
  },
  {
    icon:  "bar-chart-outline",
    color: "#C8952A",
    bg:    "#F5ECD7",
    title: "Track Your Gold Balance",
    desc:  "Monitor your holdings and live value anytime in the app",
  },
];

// ─── All 15 original FAQs — nothing removed ───────────────────────────────────
const FAQ_DATA = [
  {
    q: "What is Digital Gold?",
    a: "Digital Gold allows you to buy gold online. Every gram you purchase is backed by physical gold stored securely with a trusted partner.",
  },
  {
    q: "Who is the gold partner?",
    a: "The physical gold is stored with an authorized and trusted gold partner in insured vaults, as per their terms and conditions.",
  },
  {
    q: "Is Digital Gold regulated by RBI or SEBI?",
    a: "No. Digital Gold is not regulated by RBI or SEBI. It is backed by physical gold stored with a partner, but it is not a regulated investment product.",
  },
  {
    q: "How can I buy Digital Gold?",
    a: "You can buy Digital Gold instantly using Indian Rupees (₹) or by selecting the quantity in grams. Just confirm the live price and complete the payment.",
  },
  {
    q: "What is the minimum amount required to buy Digital Gold?",
    a: "You can start buying Digital Gold with a very small amount, making it accessible even for first-time investors.",
  },
  {
    q: "At what price is Digital Gold bought?",
    a: "Digital Gold is bought at the live market price at the time of purchase, which may include partner charges.",
  },
  {
    q: "Where is my Digital Gold stored?",
    a: "Your gold is stored safely in insured vaults managed by the gold partner. You don't need to worry about storage or security.",
  },
  {
    q: "Can I track my Digital Gold value?",
    a: "Yes. The value of your Digital Gold updates in real time based on current gold market prices.",
  },
  {
    q: "Can I sell Digital Gold anytime?",
    a: "Yes. You can sell your Digital Gold anytime through the app, subject to partner availability and terms.",
  },
  {
    q: "At what price is Digital Gold sold?",
    a: "Digital Gold is sold at the live market price at the time of selling.",
  },
  {
    q: "How will I receive money after selling Digital Gold?",
    a: "The sale amount is credited to your linked bank account or wallet as per the app's payout flow.",
  },
  {
    q: "Are there any charges for buying or selling?",
    a: "Partner charges such as spread, GST, or minting charges (for physical conversion) may apply. These are shown during the transaction.",
  },
  {
    q: "Is my Digital Gold insured?",
    a: "Yes. The physical gold stored with the partner is insured as per their storage policy.",
  },
  {
    q: "Can I convert Digital Gold into physical gold?",
    a: "Depending on the partner's terms, you may be able to convert Digital Gold into physical gold coins or jewellery. Additional charges may apply.",
  },
  {
    q: "What are the risks of Digital Gold?",
    a: "The value of Digital Gold depends on market prices and may fluctuate. Since it is not regulated by RBI or SEBI, users should understand the risks before investing.",
  },
];

// ─── FAQ Accordion item ───────────────────────────────────────────────────────
const FaqItem = ({ item, index, expandedIndex, onToggle }) => {
  const expanded = expandedIndex === index;
  const anim     = useRef(new Animated.Value(0)).current;
  const rotate   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(anim,   { toValue: expanded ? 1 : 0, useNativeDriver: false, speed: 18, bounciness: 0 }),
      Animated.spring(rotate, { toValue: expanded ? 1 : 0, useNativeDriver: true,  speed: 18, bounciness: 0 }),
    ]).start();
  }, [expanded]);

  const maxHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });
  const rotateZ   = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

  return (
    <View style={fs.item}>
      <TouchableOpacity
        style={fs.qRow}
        onPress={() => onToggle(expanded ? null : index)}
        activeOpacity={0.75}
      >
        <Text style={fs.qText}>{item.q}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateZ }] }}>
          <Ionicons name="add" size={18} color={C.gold} />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[fs.aWrap, { maxHeight, overflow: "hidden" }]}>
        <Text style={fs.aText}>{item.a}</Text>
      </Animated.View>
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const DigitalGoldFlowScreen = ({ navigation }) => {
  const [faqOpen,  setFaqOpen]  = useState(false);
  const [expanded, setExpanded] = useState(null);

  const heroAnim  = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(18)).current;
  const stepAnims = useRef(
    STEPS.map(() => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(24),
    }))
  ).current;
  const faqAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(heroSlide, { toValue: 0, speed: 14, bounciness: 4, useNativeDriver: true }),
    ]).start();

    STEPS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(stepAnims[i].opacity,    { toValue: 1, duration: 400, delay: 200 + i * 120, useNativeDriver: true }),
        Animated.spring(stepAnims[i].translateY, { toValue: 0, speed: 14, bounciness: 4, delay: 200 + i * 120, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const openFaq = () => {
    setFaqOpen(true);
    Animated.spring(faqAnim, { toValue: 1, speed: 16, bounciness: 0, useNativeDriver: true }).start();
  };

  const closeFaq = () => {
    Animated.timing(faqAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
      setFaqOpen(false);
      setExpanded(null);
    });
  };

  const faqTranslate = faqAnim.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>

      {/* ── Main scroll ───────────────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={20} color={C.gold} />
          </TouchableOpacity>
          <TouchableOpacity style={s.faqBtn} onPress={openFaq} activeOpacity={0.75}>
            <Ionicons name="help-circle-outline" size={15} color={C.gold} />
            <Text style={s.faqBtnText}>FAQ</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <Animated.View style={[s.hero, {
          opacity:   heroAnim,
          transform: [{ translateY: heroSlide }],
        }]}>
          <View style={s.heroPill}>
            <View style={s.heroPillDot} />
            <Text style={s.heroPillText}>DIGITAL GOLD</Text>
          </View>
          <Text style={s.heroTitle}>How It Works</Text>
          <Text style={s.heroSub}>5 simple steps to start your gold investment journey</Text>
        </Animated.View>

        {/* Steps */}
        <View style={s.steps}>
          {STEPS.map((step, i) => (
            <View key={i}>
              <Animated.View style={[s.stepCard, {
                opacity:   stepAnims[i].opacity,
                transform: [{ translateY: stepAnims[i].translateY }],
              }]}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{i + 1}</Text>
                </View>
                <View style={[s.stepIcon, { backgroundColor: step.bg }]}>
                  <Ionicons name={step.icon} size={20} color={step.color} />
                </View>
                <View style={s.stepBody}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepDesc}>{step.desc}</Text>
                </View>
              </Animated.View>

              {i < STEPS.length - 1 && (
                <View style={s.connector}>
                  <View style={s.connectorLine} />
                  <View style={s.connectorDot} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Trust strip */}
        <View style={s.trustStrip}>
          {[
            { icon: "shield-checkmark-outline", label: "BIS Hallmarked" },
            { icon: "lock-closed-outline",      label: "Insured Vaults" },
            { icon: "flash-outline",            label: "Instant Credit"  },
            { icon: "trending-up-outline",      label: "Live Prices"     },
          ].map((t, i) => (
            <View key={i} style={s.trustItem}>
              <Ionicons name={t.icon} size={16} color={C.gold} />
              <Text style={s.trustLabel}>{t.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={s.ctaWrap}>
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={() => navigation.navigate("Dashboard")}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnText}>Start Buying Gold</Text>
            <View style={s.ctaArrow}>
              <Ionicons name="arrow-forward" size={16} color={C.navy} />
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── FAQ slide-in panel ────────────────────────────────────────── */}
      {faqOpen && (
        <Animated.View style={[s.faqOverlay, { transform: [{ translateX: faqTranslate }] }]}>
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>

            <View style={s.faqHead}>
              <TouchableOpacity style={s.faqBack} onPress={closeFaq} activeOpacity={0.75}>
                <Ionicons name="chevron-back" size={20} color={C.gold} />
              </TouchableOpacity>
              <View>
                <Text style={s.faqHeadTitle}>Frequently Asked</Text>
                <Text style={s.faqHeadSub}>Questions about Digital Gold</Text>
              </View>
              {/* count badge */}
              <View style={s.faqCountBadge}>
                <Text style={s.faqCountText}>{FAQ_DATA.length}</Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.faqScroll}
            >
              {FAQ_DATA.map((item, i) => (
                <FaqItem
                  key={i}
                  item={item}
                  index={i}
                  expandedIndex={expanded}
                  onToggle={setExpanded}
                />
              ))}
            </ScrollView>

          </SafeAreaView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// ─── Main styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 4 : 12,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.goldBorder,
    justifyContent: "center", alignItems: "center",
  },
  faqBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.goldBorder,
  },
  faqBtnText: { fontSize: 11, fontWeight: "700", color: C.gold, letterSpacing: 0.6 },

  hero: { paddingHorizontal: 22, paddingBottom: 28 },
  heroPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.goldBorder,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    marginBottom: 14, alignSelf: "flex-start",
  },
  heroPillDot:  { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.goldBright },
  heroPillText: { fontSize: 9, fontWeight: "800", color: C.gold, letterSpacing: 1.4 },
  heroTitle:    { fontSize: 30, fontWeight: "900", color: C.navy, letterSpacing: -0.6, marginBottom: 8, lineHeight: 34 },
  heroSub:      { fontSize: 14, color: C.navyLight, lineHeight: 20, fontWeight: "500" },

  steps: { paddingHorizontal: 18, marginBottom: 24 },
  stepCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 16,
    shadowColor: "rgba(26,28,46,0.07)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6,
    elevation: 2,
  },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.navy, justifyContent: "center", alignItems: "center",
    marginRight: 12, flexShrink: 0,
  },
  stepNumText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  stepIcon: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    marginRight: 13, flexShrink: 0,
  },
  stepBody:  { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "700", color: C.navy, marginBottom: 3, lineHeight: 19 },
  stepDesc:  { fontSize: 12, color: C.navyLight, lineHeight: 17, fontWeight: "500" },

  connector:     { alignItems: "center", marginVertical: 6 },
  connectorLine: { width: 1.5, height: 14, backgroundColor: C.goldBorder },
  connectorDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginTop: 2 },

  trustStrip: {
    flexDirection: "row", marginHorizontal: 18, marginBottom: 24,
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingVertical: 14,
  },
  trustItem:  { flex: 1, alignItems: "center", gap: 5 },
  trustLabel: { fontSize: 9, fontWeight: "700", color: C.navyMid, textAlign: "center", letterSpacing: 0.2 },

  ctaWrap: { paddingHorizontal: 18, paddingBottom: 8 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.goldBright, borderRadius: 14, paddingVertical: 16,
  },
  ctaBtnText: { fontSize: 15, fontWeight: "800", color: C.navy, letterSpacing: 0.1 },
  ctaArrow: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: "rgba(28,35,64,0.12)", justifyContent: "center", alignItems: "center",
  },

  // FAQ panel
  faqOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.card, zIndex: 100,
  },
  faqHead: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card,
  },
  faqBack: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.goldBorder,
    justifyContent: "center", alignItems: "center",
  },
  faqHeadTitle: { fontSize: 16, fontWeight: "800", color: C.navy, letterSpacing: -0.2 },
  faqHeadSub:   { fontSize: 11, color: C.navyLight, fontWeight: "500", marginTop: 2 },
  faqCountBadge: {
    marginLeft: "auto",
    backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.goldBorder,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  faqCountText: { fontSize: 12, fontWeight: "700", color: C.gold },
  faqScroll:    { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
});

// ─── FAQ item styles ──────────────────────────────────────────────────────────
const fs = StyleSheet.create({
  item: { borderBottomWidth: 1, borderBottomColor: C.divider },
  qRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16, gap: 12,
  },
  qText: { flex: 1, fontSize: 14, fontWeight: "600", color: C.navy, lineHeight: 20 },
  aWrap: { paddingBottom: 14 },
  aText: { fontSize: 13, color: C.navyMid, lineHeight: 20, fontWeight: "500" },
});

export default DigitalGoldFlowScreen;