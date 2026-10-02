import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#6C4AB6",
  goldLight: "#F7F4ED",
  navy: "#1C1C1E",
  navyMid: "#48484C",
  navyLight: "#7A7A80",
  border: "#E7E0DA",
  divider: "#EEEBE8",
};

const FAQS = [
  {
    question: "Is your gold jewellery BIS hallmarked?",
    answer: "Yes, all our gold jewellery is BIS hallmarked and comes with proper certification. We guarantee 22K purity on all our products.",
  },
  {
    question: "What is your delivery time?",
    answer: "Orders are delivered within 2–3 business days by our trusted delivery partner.",
  },
  {
    question: "Is there a delivery fee?",
    answer: "The delivery fee, if any, is shown in your order summary at checkout before you pay.",
  },
  {
    question: "Can I return my order or get a refund?",
    answer: "No. Gold and silver are bought at the live market price, so all purchases are final — there are no returns or refunds once an order is placed.",
  },
  {
    question: "How do I track my order?",
    answer: "You can track your order from the \"My Orders\" section in the app. You will also receive updates via SMS and email.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major payment methods including credit/debit cards, UPI, net banking, and digital wallets. All transactions are secured with SSL encryption.",
  },
  {
    question: "Can I customize jewellery?",
    answer: "Yes, we offer customization services. Please contact our customer support team with your requirements, and we'll help you create your perfect piece.",
  },
  {
    question: "How is the gold price calculated?",
    answer: "Our prices are based on current gold rates plus making charges and GST. Prices are updated regularly to reflect market rates.",
  },
  {
    question: "Do you provide certificates with jewellery?",
    answer: "Yes, all our products come with BIS hallmark certificates and detailed invoices. For diamond jewellery, we also provide diamond certificates.",
  },
  {
    question: "Can I cancel my order?",
    answer: "No. Once an order is placed, it cannot be cancelled. Please check your order details carefully before paying.",
  },
];

const FAQItem = ({ item, open, onToggle }) => (
  <View style={styles.faqCard}>
    <TouchableOpacity style={styles.faqHead} onPress={onToggle} activeOpacity={0.75}>
      <Text style={styles.faqQuestion}>{item.question}</Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.gold} />
    </TouchableOpacity>
    {open && (
      <View style={styles.faqBody}>
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      </View>
    )}
  </View>
);

const PgFAQScreen = ({ navigation }) => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <PgLayout title="FAQs" showBack onBack={() => navigation.goBack()} hideLogo hideCart>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <FadeSlideIn>
        <Text style={styles.mainTitle}>Frequently Asked Questions</Text>
        <Text style={styles.subtitle}>
          Find answers to common questions about our products and services
        </Text>

        {FAQS.map((item, i) => (
          <FAQItem
            key={item.question}
            item={item}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>Still have questions?</Text>
          <Text style={styles.helpText}>
            Our customer support team is here to help you with any queries.
          </Text>
          <Text style={styles.helpLine}><Text style={styles.helpLabel}>Email: </Text>support@askoxy.ai</Text>
          <Text style={styles.helpLine}><Text style={styles.helpLabel}>Phone: </Text>+91 81432 71103</Text>
          <Text style={styles.helpLine}><Text style={styles.helpLabel}>Hours: </Text>Monday - Saturday, 9:00 AM - 6:00 PM IST</Text>
        </View>
        </FadeSlideIn>
      </ScrollView>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  mainTitle: { fontSize: 18, fontWeight: "900", color: C.navy, letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.navyLight, marginBottom: 18, lineHeight: 19 },

  faqCard: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    marginBottom: 10, overflow: "hidden",
  },
  faqHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, gap: 12 },
  faqQuestion: { flex: 1, fontSize: 13.5, fontWeight: "700", color: C.navy, lineHeight: 19 },
  faqBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2, borderTopWidth: 1, borderTopColor: C.divider },
  faqAnswer: { fontSize: 13, color: C.navyMid, lineHeight: 20, fontWeight: "500" },

  helpBox: {
    marginTop: 10, padding: 18, backgroundColor: C.goldLight, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
  },
  helpTitle: { fontSize: 15, fontWeight: "800", color: C.navy, marginBottom: 6 },
  helpText: { fontSize: 13, color: C.navyMid, lineHeight: 19, marginBottom: 10 },
  helpLine: { fontSize: 13, color: C.navyMid, lineHeight: 21 },
  helpLabel: { fontWeight: "800", color: C.navy },
});

export default PgFAQScreen;
