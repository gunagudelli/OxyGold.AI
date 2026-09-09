import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#0E6B57",
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
          <Text style={styles.updated}>Last Updated: January 2024</Text>

          <Section title="1. Return Period">
            We offer a 15-day return period from the date of delivery.
            Products must be returned in their original condition with all
            tags, certificates, and packaging intact.
          </Section>

          <Section title="2. Eligible Returns">
            You can return products if:{"\n"}• The product is damaged or
            defective{"\n"}• Wrong product was delivered{"\n"}• Product does
            not match the description{"\n"}• You are not satisfied with the
            purchase (within 15 days)
          </Section>

          <Section title="3. Non-Returnable Items">
            The following items cannot be returned:{"\n"}• Customized or
            engraved jewellery{"\n"}• Products without original tags and
            certificates{"\n"}• Items showing signs of wear or damage{"\n"}•
            Products returned after 15 days
          </Section>

          <Section title="4. Return Process">
            To initiate a return:{"\n"}1. Contact our customer support within
            15 days of delivery{"\n"}2. Provide order number and reason for
            return{"\n"}3. Our team will arrange a pickup from your address
            {"\n"}4. Product will be inspected upon receipt{"\n"}5. Refund
            will be processed within 7-10 business days
          </Section>

          <Section title="5. Refund Method">
            Refunds will be processed to:{"\n"}• Original payment method (for
            online payments){"\n"}• Bank account (for cash on delivery
            orders){"\n"}• OxyGold Wallet (instant credit option)
          </Section>

          <Section title="6. Exchange Policy">
            We offer lifetime exchange on all products:{"\n"}• 100% exchange
            value guaranteed{"\n"}• Exchange for any product of equal or
            higher value{"\n"}• Only making charges apply on new purchase
            {"\n"}• Product must be in good condition with certificates
          </Section>

          <Section title="7. Damaged or Defective Products">
            If you receive a damaged or defective product, please contact us
            immediately with photos. We will arrange for immediate
            replacement or full refund at no additional cost.
          </Section>

          <Section title="8. Cancellation Policy">
            Orders can be cancelled:{"\n"}• Before shipment: Full refund
            {"\n"}• After shipment: Subject to return policy{"\n"}•
            Customized orders: Cannot be cancelled
          </Section>

          <View style={[styles.section, { marginBottom: 0 }]}>
            <Text style={styles.sectionTitle}>9. Contact Us</Text>
            <Text style={styles.sectionText}>
              For returns, refunds, or exchanges, contact us:
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
