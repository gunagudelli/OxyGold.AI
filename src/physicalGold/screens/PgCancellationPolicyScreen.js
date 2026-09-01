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

const PgCancellationPolicyScreen = ({ navigation }) => {
  return (
    <PgLayout
      title="Cancellation Policy"
      showBack
      onBack={() => navigation.goBack()}
      hideLogo
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.card}>
          <Text style={styles.mainTitle}>Cancellation Policy</Text>
          <Text style={styles.updated}>Last Updated: January 2024</Text>

          <Section title="1. Order Cancellation">
            You can cancel your order at any time before it is shipped. Once
            an order is shipped, it cannot be cancelled but can be returned
            as per our Return Policy.
          </Section>

          <Section title="2. How to Cancel">
            To cancel your order:{"\n"}1. Log in to your account{"\n"}2. Go
            to "My Orders" section{"\n"}3. Select the order you wish to
            cancel{"\n"}4. Click on "Cancel Order" button{"\n"}5. Provide
            reason for cancellation (optional){"\n"}6. Confirm cancellation
            {"\n\n"}Alternatively, you can contact our customer support team
            at support@askoxy.ai or call +91 81432 71103.
          </Section>

          <Section title="3. Cancellation Timeline">
            Before Order Processing (Within 2 hours){"\n"}Full refund with no
            cancellation charges. Refund processed within 24 hours.
            {"\n\n"}After Processing, Before Shipment{"\n"}Full refund with
            no cancellation charges. Refund processed within 3-5 business
            days.{"\n\n"}After Shipment{"\n"}Order cannot be cancelled.
            Please refer to our Return Policy for returns after delivery.
          </Section>

          <Section title="4. Non-Cancellable Orders">
            The following orders cannot be cancelled:{"\n"}• Customized or
            engraved jewellery{"\n"}• Made-to-order products{"\n"}• Orders
            that have already been shipped{"\n"}• Special occasion orders
            placed less than 48 hours before delivery date
          </Section>

          <Section title="5. Refund Process">
            Upon successful cancellation:{"\n"}• Online Payments: Refund to
            original payment method within 5-7 business days{"\n"}• Wallet
            Payments: Instant credit to OxyGold Wallet{"\n"}• Cash on
            Delivery: No refund applicable as payment not made
          </Section>

          <Section title="6. Seller-Initiated Cancellation">
            We reserve the right to cancel orders in the following
            situations:{"\n"}• Product is out of stock or unavailable{"\n"}•
            Pricing or product information error{"\n"}• Delivery address is
            not serviceable{"\n"}• Suspected fraudulent transaction{"\n"}•
            Force majeure events{"\n\n"}In such cases, you will be notified
            immediately and full refund will be processed within 3-5
            business days.
          </Section>

          <Section title="7. Partial Cancellation">
            For orders with multiple items, you can cancel individual items
            before the order is shipped. Refund will be processed for the
            cancelled items only.
          </Section>

          <Section title="8. Cancellation Confirmation">
            Once your cancellation is processed, you will receive a
            confirmation email and SMS with the cancellation details and
            expected refund timeline.
          </Section>

          <View style={[styles.section, { marginBottom: 0 }]}>
            <Text style={styles.sectionTitle}>9. Contact Us</Text>
            <Text style={styles.sectionText}>
              For any queries regarding order cancellation:
            </Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactName}>OXYKART TECHNOLOGIES PVT LTD</Text>
              <Text style={styles.contactLine}>Email: support@askoxy.ai</Text>
              <Text style={styles.contactLine}>Phone: +91 81432 71103</Text>
              <Text style={styles.contactLine}>Hours: Monday - Saturday, 9:00 AM - 6:00 PM IST</Text>
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

export default PgCancellationPolicyScreen;
