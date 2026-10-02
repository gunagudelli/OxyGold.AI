import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
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

const PgReturnRefundPolicyScreen = ({ navigation }) => {
  return (
    <PgLayout
      title="Return & Refund Policy"
      showBack
      onBack={() => navigation.goBack()}
      hideLogo
      hideCart
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <FadeSlideIn>
        <View style={styles.card}>
          <Text style={styles.mainTitle}>Return & Refund Policy</Text>
          <Text style={styles.updated}>Last Updated: October 2026</Text>

          <Section title="1. No Returns">
            Gold and silver prices change with the market every day, so all
            purchases of physical gold and silver are final. Once an order is
            placed, it cannot be returned or exchanged.
          </Section>

          <Section title="2. No Refunds">
            We do not offer refunds on any gold or silver purchase once the
            order is placed.
          </Section>

          <Section title="3. Failed Payments">
            If your payment fails but money is debited from your account, it
            is automatically reversed to your original payment method by
            your bank or payment provider.
          </Section>

          <Section title="4. Before You Buy">
            Please check the product, weight, purity, price and delivery
            address carefully before placing your order.
          </Section>

          <View style={[styles.section, { marginBottom: 0 }]}>
            <Text style={styles.sectionTitle}>5. Contact Us</Text>
            <Text style={styles.sectionText}>
              For any questions about your order, contact us:
            </Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactName}>OXYIDEAS TECHNOLOGIES PVT LTD</Text>
              <Text style={styles.contactLine}>Email: support@askoxy.ai</Text>
              <Text style={styles.contactLine}>Phone: +91 81432 71103</Text>
            </View>
          </View>
        </View>
        </FadeSlideIn>
      </ScrollView>
    </PgLayout>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionText}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "rgba(34,30,28,0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  mainTitle: { fontSize: 18, fontWeight: "900", color: C.navy, letterSpacing: -0.3 },
  updated: { fontSize: 11.5, color: C.navyLight, marginTop: 4, marginBottom: 18 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: C.navy, marginBottom: 8, letterSpacing: 0.2 },
  sectionText: { fontSize: 13, lineHeight: 20, color: C.navyMid, fontWeight: "500" },
  contactBox: {
    marginTop: 10, padding: 12, backgroundColor: C.goldLight, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
  },
  contactName: { fontSize: 13, fontWeight: "800", color: C.navy, marginBottom: 4 },
  contactLine: { fontSize: 12.5, color: C.navyMid, lineHeight: 19 },
});

export default PgReturnRefundPolicyScreen;
