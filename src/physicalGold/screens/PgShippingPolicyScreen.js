import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import PgLayout from "../components/PgLayout";

const C = {
  bg: "#F8F7F6",
  card: "#FFFFFF",
  gold: "#CF8B17",
  goldLight: "#F7F4ED",
  navy: "#1C1C1E",
  navyMid: "#48484C",
  navyLight: "#7A7A80",
  border: "#E7E0DA",
  divider: "#EEEBE8",
};

const PgShippingPolicyScreen = ({ navigation }) => {
  return (
    <PgLayout
      title="Shipping Policy"
      showBack
      onBack={() => navigation.goBack()}
      hideLogo
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.card}>
          <Text style={styles.mainTitle}>Shipping Policy</Text>
          <Text style={styles.updated}>Last Updated: January 2024</Text>

          <Section title="1. Shipping Coverage">
            We currently ship across India. All orders are processed and
            shipped from our secure facility in Hyderabad, Telangana.
          </Section>

          <Section title="2. Shipping Charges">
            • Free Shipping: On all orders above ₹50,000{"\n"}• Standard
            Shipping: ₹200 for orders below ₹50,000{"\n"}• All shipments are
            fully insured at no additional cost
          </Section>

          <Section title="3. Delivery Timeline">
            Standard delivery times:{"\n"}• Metro Cities: 2-3 business days
            {"\n"}• Other Cities: 3-5 business days{"\n"}• Remote Areas: 5-7
            business days{"\n\n"}Note: Delivery times are estimates and may
            vary due to unforeseen circumstances.
          </Section>

          <Section title="4. Order Processing">
            Orders are processed within 24 hours of payment confirmation. You
            will receive a tracking number via email and SMS once your order
            is shipped.
          </Section>

          <Section title="5. Shipping Partners">
            We work with trusted courier partners including Blue Dart, FedEx,
            and DHL to ensure safe and timely delivery of your precious
            jewellery.
          </Section>

          <Section title="6. Insurance">
            All shipments are fully insured for the declared value. In the
            rare event of loss or damage during transit, we will process a
            full refund or replacement.
          </Section>

          <Section title="7. Delivery Requirements">
            • Signature required upon delivery{"\n"}• Valid ID proof must be
            presented{"\n"}• Recipient must match the order details{"\n"}•
            Undelivered packages will be returned to our facility
          </Section>

          <Section title="8. Tracking Your Order">
            You can track your order using the tracking number provided via
            email/SMS. For any shipping queries, contact our customer support
            team.
          </Section>

          <View style={[styles.section, { marginBottom: 0 }]}>
            <Text style={styles.sectionTitle}>9. Contact Us</Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactName}>OXYIDEAS TECHNOLOGIES PVT LTD</Text>
              <Text style={styles.contactLine}>Email: support@askoxy.ai</Text>
              <Text style={styles.contactLine}>Phone: +91 81432 71103</Text>
            </View>
          </View>
        </View>
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
  sectionTitle: { fontSize: 14, fontWeight: "800", color: C.gold, marginBottom: 8, letterSpacing: 0.2 },
  sectionText: { fontSize: 13, lineHeight: 20, color: C.navyMid, fontWeight: "500" },
  contactBox: {
    marginTop: 10, padding: 12, backgroundColor: C.goldLight, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
  },
  contactName: { fontSize: 13, fontWeight: "800", color: C.navy, marginBottom: 4 },
  contactLine: { fontSize: 12.5, color: C.navyMid, lineHeight: 19 },
});

export default PgShippingPolicyScreen;
