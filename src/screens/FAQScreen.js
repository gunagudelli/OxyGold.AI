import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const FAQS = [
  {
    category: "Getting Started",
    icon: "",
    items: [
      {
        q: "What is Digital Gold?",
        a: "Digital Gold allows you to buy gold online. Every gram you purchase is backed by physical gold stored securely with a trusted partner.",
      },
      {
        q: "Who is the gold partner?",
        a: "The physical gold is stored with an authorized and trusted gold partner in insured vaults, as per their terms and conditions.",
      },
      {
        q: "What is the minimum amount required to buy Digital Gold?",
        a: "You can start buying Digital Gold with a very small amount, making it accessible even for first-time investors.",
      },
      {
        q: "How can I buy Digital Gold?",
        a: "You can buy Digital Gold instantly using Indian Rupees (₹) or by selecting the quantity in grams. Just confirm the live price and complete the payment.",
      },
    ],
  },
  {
    category: "Pricing & Rates",
    icon: "",
    items: [
      {
        q: "At what price is Digital Gold bought?",
        a: "Digital Gold is bought at the live market price at the time of purchase, which may include partner charges.",
      },
      {
        q: "At what price is Digital Gold sold?",
        a: "Digital Gold is sold at the live market price at the time of selling.",
      },
      {
        q: "Are there any charges for buying or selling?",
        a: "Partner charges such as spread, GST, or minting charges (for physical conversion) may apply. These are shown during the transaction.",
      },
      {
        q: "Is Digital Gold regulated by RBI or SEBI?",
        a: "No. Digital Gold is not regulated by RBI or SEBI. It is backed by physical gold stored with a partner, but it is not a regulated investment product.",
      },
    ],
  },
  {
    category: "Storage & Safety",
    icon: "",
    items: [
      {
        q: "Where is my Digital Gold stored?",
        a: "Your gold is stored safely in insured vaults managed by the gold partner. You don't need to worry about storage or security.",
      },
      {
        q: "Is my Digital Gold insured?",
        a: "Yes. The physical gold stored with the partner is insured as per their storage policy.",
      },
      {
        q: "Can I track my Digital Gold value?",
        a: "Yes. The value of your Digital Gold updates in real time based on current gold market prices.",
      },
    ],
  },
  {
    category: "Buying & Selling",
    icon: "",
    items: [
      {
        q: "Can I sell Digital Gold anytime?",
        a: "Yes. You can sell your Digital Gold anytime through the app, subject to partner availability and terms.",
      },
      {
        q: "How will I receive money after selling Digital Gold?",
        a: "The sale amount is credited to your linked bank account or wallet as per the app's payout flow.",
      },
      {
        q: "Can I convert Digital Gold into physical gold?",
        a: "Depending on the partner's terms, you may be able to convert Digital Gold into physical gold coins or jewellery. Additional charges may apply.",
      },
    ],
  },
  {
    category: "Risks",
    icon: "",
    items: [
      {
        q: "What are the risks of Digital Gold?",
        a: "The value of Digital Gold depends on market prices and may fluctuate. Since it is not regulated by RBI or SEBI, users should understand the risks before investing.",
      },
    ],
  },
];

// ── Accordion Item ────────────────────────────────────────────────────────────
const FaqItem = ({ item, isLast }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={[s.faqItem, isLast && s.faqItemLast]}>
      <TouchableOpacity style={s.faqQ} onPress={toggle} activeOpacity={0.75}>
        <Text style={s.faqQText}>{item.q}</Text>
        <Text style={[s.faqChevron, open && s.faqChevronOpen]}>›</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.faqA}>
          <Text style={s.faqAText}>{item.a}</Text>
        </View>
      )}
    </View>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const FAQScreen = ({ navigation }) => {
  const [activeCategory, setActiveCategory] = useState(null);

  const displayed = activeCategory
    ? FAQS.filter((c) => c.category === activeCategory)
    : FAQS;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1f3c" />

      {/* Nav bar with back button */}
      <View style={s.navBar}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>FAQ</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero */}
        <LinearGradient colors={["#0d1f3c", "#112347"]} style={s.hero}>
          <Text style={s.heroLabel}>Help Center</Text>
          <Text style={s.heroTitle}>
            Frequently Asked{"\n"}
            <Text style={s.heroGold}>Questions</Text>
          </Text>
          <Text style={s.heroSub}>
            Everything you need to know about Digital Gold
          </Text>
        </LinearGradient>

        {/* Category filter chips */}
        <View style={s.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            <TouchableOpacity
              style={[s.chip, !activeCategory && s.chipActive]}
              onPress={() => setActiveCategory(null)}
            >
              <Text style={[s.chipText, !activeCategory && s.chipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {FAQS.map((c) => (
              <TouchableOpacity
                key={c.category}
                style={[s.chip, activeCategory === c.category && s.chipActive]}
                onPress={() =>
                  setActiveCategory(
                    activeCategory === c.category ? null : c.category,
                  )
                }
              >
                <Text
                  style={[
                    s.chipText,
                    activeCategory === c.category && s.chipTextActive,
                  ]}
                >
                  {c.category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ sections */}
        <View style={s.content}>
          {displayed.map((cat) => (
            <View key={cat.category} style={s.section}>
              <View style={s.catHeader}>
                <Text style={s.catTitle}>{cat.category}</Text>
                <Text style={s.catCount}>{cat.items.length}</Text>
              </View>
              <View style={s.card}>
                {cat.items.map((item, i) => (
                  <FaqItem
                    key={i}
                    item={item}
                    isLast={i === cat.items.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Contact CTA */}
        <LinearGradient colors={["#112347", "#0d1f3c"]} style={s.cta}>
          <Text style={s.ctaTitle}>Still have questions?</Text>
          <Text style={s.ctaSub}>
            Our support team is available 24/7 to help you
          </Text>
          <TouchableOpacity style={s.ctaBtn} activeOpacity={0.85}>
            <Text style={s.ctaBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1f3c" },

  // Nav bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(26,48,120,0.97)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240,187,58,0.12)",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, width: 64 },
  backArrow: { fontSize: 28, color: "#f0bb3a", lineHeight: 30, marginTop: -2 },
  backText: { fontSize: 14, fontWeight: "600", color: "#f0bb3a" },
  navTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Hero
  hero: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 },
  heroLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f0bb3a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 34,
    marginBottom: 8,
  },
  heroGold: { color: "#f0bb3a" },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 20 },

  // Chips
  chipsWrap: { backgroundColor: "#0d1f3c", paddingVertical: 12 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipActive: {
    backgroundColor: "rgba(240,187,58,0.15)",
    borderColor: "rgba(240,187,58,0.5)",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.55)",
  },
  chipTextActive: { color: "#f0bb3a", fontWeight: "700" },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 8 },
  section: { marginBottom: 20 },

  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  catTitle: { fontSize: 15, fontWeight: "700", color: "#fff", flex: 1 },
  catCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f0bb3a",
    backgroundColor: "rgba(240,187,58,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  // Card
  card: {
    backgroundColor: "#112347",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(42,78,158,0.3)",
    overflow: "hidden",
  },

  // FAQ item
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  faqItemLast: { borderBottomWidth: 0 },
  faqQ: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  faqQText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
    lineHeight: 20,
  },
  faqChevron: {
    fontSize: 22,
    color: "rgba(255,255,255,0.35)",
    transform: [{ rotate: "0deg" }],
  },
  faqChevronOpen: { color: "#f0bb3a", transform: [{ rotate: "90deg" }] },
  faqA: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    backgroundColor: "rgba(13,31,60,0.4)",
  },
  faqAText: { fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 21 },

  // CTA
  cta: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
  },
  ctaTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 6 },
  ctaSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 20,
    textAlign: "center",
  },
  ctaBtn: {
    backgroundColor: "#f0bb3a",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaBtnText: { fontSize: 14, fontWeight: "700", color: "#0d1f3c" },
});

export default FAQScreen;
