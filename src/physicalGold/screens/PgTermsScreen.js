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

const PgTermsScreen = ({ navigation }) => {
  return (
    <PgLayout
      title="Terms & Conditions"
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
          <Text style={styles.mainTitle}>
            Terms & Conditions
          </Text>

          <Section title="1. Introduction">
            Welcome to our platform. By purchasing physical gold from our
            application, you agree to the following terms and conditions.
          </Section>

          <Section title="2. Product Information">
            • All gold products sold are 24K / 22K certified and sourced from
            trusted vendors.{"\n"}• Product weight, purity, and price details
            are clearly mentioned before purchase.{"\n"}• Prices are subject to
            change based on live market rates.
          </Section>

          <Section title="3. Pricing & Payment">
            • Gold prices are dynamic and may change at any time.{"\n"}• Final
            price will be confirmed at the time of order placement.{"\n"}•
            Payments can be made via supported payment methods (UPI, Card, Net
            Banking, etc.).{"\n"}• Applicable taxes (GST) will be included in
            the final amount.
          </Section>

          <Section title="4. Order Confirmation">
            • Once the payment is successful, your order will be confirmed.
            {"\n"}• You will receive an order confirmation via app notification
            or email.
          </Section>

          <Section title="5. Delivery">
            • Physical gold will be delivered to the registered address.{"\n"}•
            Delivery timelines may vary based on location and availability.
            {"\n"}• The platform is not responsible for delays caused by
            external logistics partners.
          </Section>

          <Section title="6. Cancellation & Refund">
            • Orders once placed cannot be cancelled after processing.{"\n"}•
            Refunds (if applicable) will be processed as per company policy.
            {"\n"}• In case of failed transactions, the amount will be refunded
            within 5–7 business days.
          </Section>

          <Section title="7. Return Policy">
            • Due to the nature of gold products, returns are generally not
            accepted.{"\n"}• Returns may be considered only in case of damaged
            or incorrect products.
          </Section>

          <Section title="8. KYC & Compliance">
            • PAN verification may be required for purchases above ₹50,000.
            {"\n"}• Users must provide accurate personal details as per
            government regulations.
          </Section>

          <Section title="9. Risk Disclaimer">
            • Gold prices fluctuate based on market conditions.{"\n"}• The
            platform is not responsible for any loss due to price changes.
          </Section>

          <Section title="10. User Responsibilities">
            • Ensure correct delivery address and contact details.{"\n"}•
            Maintain confidentiality of account credentials.
          </Section>

          <Section title="11. Limitation of Liability">
            • The platform shall not be liable for any indirect or consequential
            losses.
          </Section>

          <Section title="12. Changes to Terms">
            • We reserve the right to update these terms at any time.{"\n"}•
            Continued use of the platform means acceptance of updated terms.
          </Section>

          <Section title="13. Contact">
            For any queries or support, please contact our support team.
          </Section>
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
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
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
  mainTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: C.navy,
    marginBottom: 20,
    letterSpacing: -0.3,
    textAlign: "left",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.navy,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 20,
    color: C.navyMid,
    fontWeight: "500",
  },
});

export default PgTermsScreen;
