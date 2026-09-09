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

const PgPrivacyPolicyScreen = ({ navigation }) => {
  return (
    <PgLayout
      title="Privacy Policy"
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
          <Text style={styles.mainTitle}>Privacy Policy</Text>
          <Text style={styles.updated}>Last Updated: January 2024</Text>

          <Section title="1. Information We Collect">
            We collect information that you provide directly to us, including:
            {"\n"}• Personal identification information (Name, email address,
            phone number){"\n"}• Delivery address and billing information
            {"\n"}• Payment information (processed securely through our
            payment partners){"\n"}• Transaction history and purchase records
          </Section>

          <Section title="2. How We Use Your Information">
            We use the information we collect to:{"\n"}• Process and fulfill
            your orders{"\n"}• Communicate with you about your orders and
            account{"\n"}• Send you promotional materials (with your consent)
            {"\n"}• Improve our services and customer experience{"\n"}• Comply
            with legal obligations
          </Section>

          <Section title="3. Information Sharing">
            We do not sell, trade, or rent your personal information to third
            parties. We may share your information with:{"\n"}• Service
            providers who assist in our operations (payment processors,
            delivery partners){"\n"}• Legal authorities when required by law
            {"\n"}• Business partners with your explicit consent
          </Section>

          <Section title="4. Data Security">
            We implement industry-standard security measures to protect your
            personal information. All payment transactions are encrypted
            using SSL technology. However, no method of transmission over the
            internet is 100% secure.
          </Section>

          <Section title="5. Your Rights">
            You have the right to:{"\n"}• Access your personal information
            {"\n"}• Correct inaccurate information{"\n"}• Request deletion of
            your information{"\n"}• Opt-out of marketing communications
            {"\n"}• Withdraw consent at any time
          </Section>

          <Section title="6. Cookies">
            We use cookies to enhance your browsing experience, analyze site
            traffic, and personalize content. You can control cookie
            preferences through your browser settings.
          </Section>

          <View style={[styles.section, { marginBottom: 0 }]}>
            <Text style={styles.sectionTitle}>7. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have any questions about this Privacy Policy, please
              contact us at:
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

export default PgPrivacyPolicyScreen;
