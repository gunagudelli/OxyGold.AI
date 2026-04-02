import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, Animated, Dimensions, FlatList, Image,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGold } from '../context/GoldContext';
import Header from '../components/Header';

const { width } = Dimensions.get('window');

// ── Assets ────────────────────────────────────────────────────────────────────
const HERO_IMAGE  = 'https://assets.gadgets360cdn.com/img/gold/digital-gold-og-image.png';
const ABOUT_IMAGE = 'https://d1fow5xdcuw86u.cloudfront.net/assets/blog/Digital_Gold_A_071020251243279663034.webp';

const MARQUEE_ITEMS = [
  '999.9 Pure Gold', 'Instant Buy & Sell', 'Insured Vaults',
  'Start from ₹100', 'BIS Certified', 'Live Market Prices',
  '24/7 Access', 'Zero Storage Fees',
];

const HOW_STEPS = [
  { n: 1, ic: '📈', t: 'Check Price',   d: 'Live 24K rate, updated every minute' },
  { n: 2, ic: '💰', t: 'Enter Amount',  d: 'Rupees or grams, from ₹100' },
  { n: 3, ic: '🔒', t: 'Pay Securely',  d: 'UPI, card or net banking' },
  { n: 4, ic: '🏦', t: 'Gold in Vault', d: 'Stored in certified insured vaults' },
  { n: 5, ic: '📊', t: 'Sell Anytime',  d: 'Live rates, same-day bank credit' },
];

const FEATURES = [
  { n: '01', ic: '🔐', t: 'Insured Vaults',    d: 'Bank-grade vaults, 24/7 monitored. 100% insured.',      tag: 'Zero Fees' },
  { n: '02', ic: '✦',  t: '999.9 Pure Gold',   d: 'BIS-certified 24K. Purity guaranteed, no making charges.', tag: 'BIS Certified' },
  { n: '03', ic: '⚡', t: 'Instant Liquidity', d: 'Sell at live rates anytime. Money in your bank same day.',  tag: 'Same-Day' },
  { n: '04', ic: '📊', t: 'Start from ₹100',   d: 'No large commitment. Build wealth at your own pace.',    tag: 'Inflation Hedge' },
];

const STATS = [
  { v: '₹100',  l: 'Minimum Purchase' },
  { v: '999.9', l: 'Gold Purity' },
  { v: '100%',  l: 'Insured Assets' },
  { v: '24/7',  l: 'Market Access' },
];

const TESTIMONIALS = [
  { q: 'Started with ₹500 and now have a solid gold portfolio. Purity guarantee and instant sell are unmatched.', nm: 'Hari Babu',     ct: 'Mumbai',    av: 'H' },
  { q: 'KYC took 90 seconds and I bought my first gram the same evening. Seamless experience.',                   nm: 'Rahul Verma',  ct: 'Bangalore', av: 'R' },
  { q: 'Feels premium. Live price tracker and same-day withdrawal make it a no-brainer.',                         nm: 'Ananya Patel', ct: 'Hyderabad', av: 'A' },
];

const ABOUT_POINTS = [
  { ic: '🪙', t: 'Real Physical Gold',  d: 'Every rupee you invest is backed by actual 24K gold held in a vault.' },
  { ic: '🏛️', t: 'Certified & Insured', d: 'BIS-certified purity. Fully insured vaults. Zero risk of theft or loss.' },
  { ic: '📱', t: 'Digital Convenience', d: 'Buy from ₹100. Track live rates. Sell in one tap, cash same day.' },
];

// ── Marquee ───────────────────────────────────────────────────────────────────
const Marquee = () => {
  const anim   = useRef(new Animated.Value(0)).current;
  const ITEM_W = 160;
  const TOTAL  = MARQUEE_ITEMS.length * ITEM_W;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: -TOTAL, duration: 18000,
        easing: Easing.linear, useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <LinearGradient colors={['#d9a020', '#f0bb3a', '#d9a020']} style={s.mq}>
      <Animated.View style={[s.mqRow, { transform: [{ translateX: anim }] }]}>
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((t, i) => (
          <View key={i} style={s.mqItem}>
            <Text style={s.mqText}>★ {t}</Text>
          </View>
        ))}
      </Animated.View>
    </LinearGradient>
  );
};

// ── Floating Hero Image Card ──────────────────────────────────────────────────
const FloatingImage = () => {
  const floatY  = useRef(new Animated.Value(0)).current;
  const glowOp  = useRef(new Animated.Value(0.35)).current;
  const scaleIn = useRef(new Animated.Value(0.9)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleIn, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(fadeIn,  { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    // Infinite float loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -10, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOp, { toValue: 0.9, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowOp, { toValue: 0.35, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        s.heroImgOuter,
        { opacity: fadeIn, transform: [{ scale: scaleIn }, { translateY: floatY }] },
      ]}
    >
      {/* Pulsing outer glow ring */}
      <Animated.View style={[s.glowRing, { opacity: glowOp }]} />

      {/* Image card */}
      <View style={s.heroImgCard}>
        <Image source={{ uri: HERO_IMAGE }} style={s.heroImg} resizeMode="cover" />

        {/* Diagonal gold shimmer */}
        <LinearGradient
          colors={['transparent', 'rgba(240,187,58,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Live badge bottom-left */}
        <View style={s.heroBadge}>
          <View style={s.heroBadgeDot} />
          <Text style={s.heroBadgeText}>Live Gold Price Active</Text>
        </View>

        {/* Purity chip top-right */}
        <View style={s.heroChip}>
          <Text style={s.heroChipText}>999.9 PURE</Text>
        </View>
      </View>

      {/* Corner accent dots */}
      {[{ top: -5, left: -5 }, { top: -5, right: -5 }, { bottom: -5, left: -5 }, { bottom: -5, right: -5 }].map((pos, i) => (
        <View key={i} style={[s.cornerDot, pos]} />
      ))}
    </Animated.View>
  );
};

// ── About Section Image ───────────────────────────────────────────────────────
const AboutImage = () => {
  const slideX  = useRef(new Animated.Value(-30)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    const delay = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideX,  { toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeIn,  { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(scaleIn, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 120);
    return () => clearTimeout(delay);
  }, []);

  return (
    <Animated.View
      style={[
        s.aboutImgWrapper,
        { opacity: fadeIn, transform: [{ translateX: slideX }, { scale: scaleIn }] },
      ]}
    >
      {/* Gold left accent bar */}
      <View style={s.aboutAccentBar} />

      <Image source={{ uri: ABOUT_IMAGE }} style={s.aboutImg} resizeMode="cover" />

      {/* Gradient fade at bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(22,45,87,0.7)']}
        style={s.aboutImgFade}
        pointerEvents="none"
      />

      {/* Trust badge */}
      <View style={s.aboutBadge}>
        <Text style={s.aboutBadgeIcon}>✦</Text>
        <View>
          <Text style={s.aboutBadgeTitle}>BIS Certified</Text>
          <Text style={s.aboutBadgeSub}>999.9 Purity Guaranteed</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const { state } = useGold();
  const goldRate    = state.goldPrice?.pricePerGram || 0;
  const lastUpdated = state.goldPrice?.lastUpdated || null;
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const handleBuyGold = () => navigation.navigate('Dashboard');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1f3c" />

      <Header navigation={navigation} currentScreen="Home" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ══════════════════════════════════════
            § HERO — Floating Image + Price Ticker
        ══════════════════════════════════════ */}
        <LinearGradient colors={['#0d1f3c', '#112347', '#0f2954']} style={s.hero}>
          {/* Subtle horizontal grid lines */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {[0, 60, 120, 180, 240, 300].map((top) => (
              <View key={top} style={[s.gridLine, { top }]} />
            ))}
          </View>

          <Text style={s.heroEyebrow}>DIGITAL GOLD PLATFORM</Text>
          <Text style={s.heroTitle}>
            Buy <Text style={s.heroGold}>Digital Gold</Text>
            {'\n'}from <Text style={s.heroGold}>₹100</Text>
          </Text>
          <Text style={s.heroDesc}>
            Real 24K gold, stored in insured vaults. Buy, track and sell from your phone — no storage hassle, no making charges.
          </Text>

          {/* ── Floating Image Card ── */}
          <FloatingImage />

          {/* Price Ticker */}
          <View style={s.ticker}>
            <View style={s.tickerCell}>
              <Text style={s.tickerLabel}>24K Gold / gram</Text>
              <Text style={s.tickerValue}>₹{goldRate > 0 ? goldRate.toFixed(2) : '—'}</Text>
            </View>
            <View style={s.tickerDivider} />
            <View style={s.tickerCell}>
              <Text style={s.tickerLabel}>Purity</Text>
              <Text style={s.tickerSub}>999.9 Pure</Text>
            </View>
            <View style={s.tickerDivider} />
            <View style={s.tickerCell}>
              <Text style={s.tickerLabel}>Market</Text>
              <View style={s.liveRow}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>Live</Text>
              </View>
              {lastUpdated && <Text style={s.tickerUpdated}>{lastUpdated}</Text>}
            </View>
          </View>

          <View style={s.heroBtns}>
            <TouchableOpacity onPress={handleBuyGold} activeOpacity={0.85}>
              <LinearGradient colors={['#f0bb3a', '#d9a020']} style={s.btnGold}>
                <Text style={s.btnGoldText}>Buy Digital Gold  →</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnOutline} onPress={() => navigation.navigate('HowItWorks')} activeOpacity={0.8}>
              <Text style={s.btnOutlineText}>How It Works</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── MARQUEE ── */}
        <Marquee />

        {/* ══════════════════════════════════════
            § WHAT IS DIGITAL GOLD — with Image
        ══════════════════════════════════════ */}
        <LinearGradient colors={['#162d57', '#112347']} style={s.section}>
          <Text style={s.sLabel}>About</Text>
          <Text style={s.sTitle}>What is <Text style={s.sGold}>Digital Gold?</Text></Text>

          {/* ── About Image ── */}
          <AboutImage />

          <Text style={s.sDesc}>
            Buy real 24K gold online — no physical storage needed. Your gold is held in insured, BIS-certified vaults. Track your portfolio live and sell anytime with same-day bank credit.
          </Text>

          <View style={s.aboutPoints}>
            {ABOUT_POINTS.map((p) => (
              <View key={p.t} style={s.aboutRow}>
                <View style={s.aboutIconBox}>
                  <Text style={{ fontSize: 18 }}>{p.ic}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.aboutTitle}>{p.t}</Text>
                  <Text style={s.aboutDesc}>{p.d}</Text>
                </View>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════
            § HOW IT WORKS
        ══════════════════════════════════════ */}
        <LinearGradient colors={['#112347', '#162d57']} style={s.section}>
          <Text style={s.sLabel}>Process</Text>
          <Text style={s.sTitle}>Buy gold in <Text style={s.sGold}>5 simple steps</Text></Text>
          <Text style={s.sDesc}>From live price to vault — takes just minutes.</Text>

          <View style={s.stepsGrid}>
            {HOW_STEPS.map((step) => (
              <View key={step.n} style={s.stepCard}>
                <View style={s.stepCircle}>
                  <Text style={s.stepIcon}>{step.ic}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>{step.t}</Text>
                  <Text style={s.stepDesc}>{step.d}</Text>
                </View>
                <Text style={s.stepNumBg}>{step.n}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={handleBuyGold} activeOpacity={0.85} style={{ alignSelf: 'center', marginTop: 28 }}>
            <LinearGradient colors={['#f0bb3a', '#d9a020']} style={s.btnGold}>
              <Text style={s.btnGoldText}>Get Started  →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* ══════════════════════════════════════
            § FEATURES
        ══════════════════════════════════════ */}
        <LinearGradient colors={['#0d1f3c', '#112347']} style={s.section}>
          <Text style={s.sLabel}>Why Choose Us</Text>
          <Text style={s.sTitle}>Everything you need to <Text style={s.sGold}>own gold</Text></Text>
          <Text style={s.sDesc}>No locker. No worries. Buy, track and sell from your phone.</Text>
          <View style={s.featGrid}>
            {FEATURES.map((f) => (
              <View key={f.n} style={s.featCard}>
                <View style={s.featHeader}>
                  <Text style={s.featNum}>{f.n}</Text>
                  <View style={s.featTag}><Text style={s.featTagText}>{f.tag}</Text></View>
                </View>
                <View style={s.featIconBox}><Text style={s.featIcon}>{f.ic}</Text></View>
                <Text style={s.featTitle}>{f.t}</Text>
                <Text style={s.featDesc}>{f.d}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════
            § STATS
        ══════════════════════════════════════ */}
        <LinearGradient colors={['#112347', '#0d1f3c']} style={[s.section, { paddingVertical: 32 }]}>
          <View style={s.statsGrid}>
            {STATS.map((st) => (
              <View key={st.l} style={s.statItem}>
                <Text style={s.statValue}>{st.v}</Text>
                <Text style={s.statLabel}>{st.l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════
            § TESTIMONIALS
        ══════════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: '#f0f4ff' }]}>
          <Text style={[s.sLabel, { color: '#2a4e9e' }]}>Reviews</Text>
          <Text style={[s.sTitle, { color: '#0d1f3c' }]}>
            Trusted by thousands <Text style={{ color: '#2a4e9e' }}>across India</Text>
          </Text>
          <FlatList
            data={TESTIMONIALS}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) =>
              setActiveTestimonial(Math.round(e.nativeEvent.contentOffset.x / (width - 48)))
            }
            renderItem={({ item }) => (
              <View style={[s.testCard, { width: width - 48 }]}>
                <Text style={s.testQuote}>"</Text>
                <Text style={s.testText}>{item.q}</Text>
                <View style={s.testAuthor}>
                  <View style={s.testAvatar}><Text style={s.testAvatarText}>{item.av}</Text></View>
                  <View>
                    <Text style={s.testName}>{item.nm}</Text>
                    <Text style={s.testCity}>{item.ct}</Text>
                  </View>
                  <Text style={s.testStars}>★★★★★</Text>
                </View>
              </View>
            )}
          />
          <View style={s.dots}>
            {TESTIMONIALS.map((_, i) => (
              <View key={i} style={[s.dot, i === activeTestimonial && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════
            § CTA
        ══════════════════════════════════════ */}
        <LinearGradient colors={['#0d1f3c', '#112347']} style={[s.section, { alignItems: 'center' }]}>
          <View style={s.ctaDivider}>
            <View style={s.ctaLine} />
            <View style={s.ctaDiamond} />
            <View style={s.ctaLine} />
          </View>
          <Text style={s.ctaTitle}>Start buying <Text style={s.sGold}>Digital Gold</Text> today</Text>
          <Text style={s.ctaDesc}>From ₹100. No lock-in. No hidden fees. Sell anytime.</Text>
          <TouchableOpacity onPress={handleBuyGold} activeOpacity={0.85}>
            <LinearGradient colors={['#f0bb3a', '#d9a020']} style={s.btnGold}>
              <Text style={s.btnGoldText}>Buy Digital Gold  →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnOutline, { marginTop: 12 }]} onPress={() => navigation.navigate('HowItWorks')} activeOpacity={0.8}>
            <Text style={s.btnOutlineText}>Learn More</Text>
          </TouchableOpacity>
        </LinearGradient>

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_R = 16;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d1f3c' },

  // Hero
  hero: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 44, overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(42,78,158,0.07)' },
  heroEyebrow: { fontSize: 9, fontWeight: '700', color: 'rgba(240,187,58,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  heroTitle: { fontSize: 34, fontWeight: '900', color: '#fff', lineHeight: 44, marginBottom: 12 },
  heroGold:  { color: '#f0bb3a' },
  heroDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginBottom: 28, lineHeight: 20 },

  // Floating image
  heroImgOuter: { alignSelf: 'center', marginBottom: 28, position: 'relative' },
  glowRing: {
    position: 'absolute', top: -14, left: -14, right: -14, bottom: -14,
    borderRadius: CARD_R + 14, borderWidth: 1.5,
    borderColor: 'rgba(240,187,58,0.4)',
    shadowColor: '#f0bb3a', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 24,
  },
  heroImgCard: {
    width: width - 48, height: (width - 48) * 0.56,
    borderRadius: CARD_R, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(240,187,58,0.3)',
    backgroundColor: '#0d1f3c',
    shadowColor: '#000', shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5, shadowRadius: 22, elevation: 14,
  },
  heroImg:   { width: '100%', height: '100%' },
  heroBadge: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(13,31,60,0.85)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(240,187,58,0.25)',
  },
  heroBadgeDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  heroBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  heroChip: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(240,187,58,0.9)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
  },
  heroChipText: { fontSize: 9, fontWeight: '800', color: '#0d1f3c', letterSpacing: 0.8 },
  cornerDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#f0bb3a' },

  // Ticker
  ticker: {
    flexDirection: 'row', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(240,187,58,0.3)',
    backgroundColor: 'rgba(13,31,60,0.75)', marginBottom: 24, overflow: 'hidden',
  },
  tickerCell:    { flex: 1, padding: 12, gap: 4 },
  tickerDivider: { width: 1, backgroundColor: 'rgba(240,187,58,0.12)' },
  tickerLabel:   { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
  tickerValue:   { fontSize: 16, fontWeight: '700', color: '#f0bb3a' },
  tickerSub:     { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },
  liveRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  liveText: { fontSize: 11, fontWeight: '600', color: '#4ade80' },

  tickerUpdated: { fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  // Buttons
  heroBtns:       { gap: 10 },
  btnGold:        { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, alignItems: 'center' },
  btnGoldText:    { fontSize: 15, fontWeight: '700', color: '#0d1f3c' },
  btnOutline:     { paddingVertical: 13, paddingHorizontal: 28, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center' },
  btnOutlineText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },

  // Marquee
  mq:     { paddingVertical: 10, overflow: 'hidden' },
  mqRow:  { flexDirection: 'row' },
  mqItem: { width: 160, paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: 'rgba(13,31,60,0.2)' },
  mqText: { fontSize: 11, fontWeight: '700', color: '#0d1f3c' },

  // Section
  section: { paddingHorizontal: 24, paddingVertical: 48 },
  sLabel:  { fontSize: 10, fontWeight: '600', color: '#f0bb3a', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  sTitle:  { fontSize: 22, fontWeight: '700', color: '#fff', lineHeight: 30, marginBottom: 8 },
  sGold:   { color: '#f0bb3a' },
  sDesc:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 24 },

  // About image
  aboutImgWrapper: { marginBottom: 24, borderRadius: CARD_R, overflow: 'hidden', position: 'relative' },
  aboutAccentBar:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#f0bb3a', zIndex: 1 },
  aboutImg: { width: '100%', height: 210, borderRadius: CARD_R, borderWidth: 1.5, borderColor: 'rgba(240,187,58,0.2)' },
  aboutImgFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderBottomLeftRadius: CARD_R, borderBottomRightRadius: CARD_R },
  aboutBadge: {
    position: 'absolute', bottom: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(13,31,60,0.9)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(240,187,58,0.3)',
  },
  aboutBadgeIcon:  { fontSize: 15, color: '#f0bb3a' },
  aboutBadgeTitle: { fontSize: 11, fontWeight: '700', color: '#f0bb3a' },
  aboutBadgeSub:   { fontSize: 9, color: 'rgba(255,255,255,0.6)' },

  // About points
  aboutPoints: { gap: 12 },
  aboutRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: 'rgba(13,31,60,0.5)', padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(42,78,158,0.25)',
  },
  aboutIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(240,187,58,0.08)', borderWidth: 1,
    borderColor: 'rgba(240,187,58,0.2)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aboutTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 3 },
  aboutDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 17 },

  // How it works
  stepsGrid: { gap: 10 },
  stepCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(13,31,60,0.5)', borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: 'rgba(42,78,158,0.3)',
  },
  stepCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1a3060', borderWidth: 2, borderColor: '#d9a020',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepIcon:  { fontSize: 20 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  stepDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 17 },
  stepNumBg: { fontSize: 30, fontWeight: '900', color: 'rgba(42,78,158,0.18)', marginLeft: 'auto', flexShrink: 0 },

  // Features
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featCard: {
    width: (width - 58) / 2, backgroundColor: '#112347',
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(42,78,158,0.3)',
  },
  featHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  featNum:     { fontSize: 20, fontWeight: '700', color: 'rgba(42,78,158,0.25)' },
  featTag:     { backgroundColor: 'rgba(240,187,58,0.1)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(240,187,58,0.2)' },
  featTagText: { fontSize: 8, fontWeight: '700', color: '#f0bb3a', letterSpacing: 0.4 },
  featIconBox: {
    width: 34, height: 34, borderRadius: 7,
    backgroundColor: 'rgba(240,187,58,0.06)', borderWidth: 1,
    borderColor: 'rgba(240,187,58,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  featIcon:  { fontSize: 16 },
  featTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 5 },
  featDesc:  { fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 16 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(42,78,158,0.22)' },
  statItem:  { width: (width - 50) / 2, backgroundColor: '#112347', padding: 24, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '700', color: '#f0bb3a', marginBottom: 5 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  // Testimonials
  testCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, marginRight: 12,
    borderTopWidth: 3, borderTopColor: '#2a4e9e',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  testQuote:      { fontSize: 32, fontWeight: '700', color: 'rgba(42,78,158,0.15)', lineHeight: 28, marginBottom: 6 },
  testText:       { fontSize: 13, color: 'rgba(13,31,60,0.7)', lineHeight: 20, marginBottom: 16 },
  testAuthor:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testAvatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2a4e9e', alignItems: 'center', justifyContent: 'center' },
  testAvatarText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  testName:       { fontSize: 13, fontWeight: '600', color: '#0d1f3c' },
  testCity:       { fontSize: 11, color: 'rgba(13,31,60,0.5)' },
  testStars:      { marginLeft: 'auto', fontSize: 11, color: '#d9a020', letterSpacing: 2 },
  dots:           { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  dot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(42,78,158,0.25)' },
  dotActive:      { backgroundColor: '#2a4e9e', width: 18 },

  // CTA
  ctaDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  ctaLine:    { flex: 1, height: 1, backgroundColor: 'rgba(240,187,58,0.3)' },
  ctaDiamond: { width: 8, height: 8, backgroundColor: '#f0bb3a', transform: [{ rotate: '45deg' }] },
  ctaTitle:   { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 32, marginBottom: 10 },
  ctaDesc:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
});

export default HomeScreen;