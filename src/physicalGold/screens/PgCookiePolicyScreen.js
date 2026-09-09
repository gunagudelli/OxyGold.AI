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

const PgCookiePolicyScreen = ({ navigation }) => {
  return (
    <PgLayout
      title="Cookie Policy"
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
          <Text style={styles.mainTitle}>Cookie Policy</Text>
          <Text style={styles.updated}>Last Updated: January 2024</Text>

          <Section title="1. What Are Cookies?">
            Cookies are small text files that are placed on your device when
            you visit our website. They help us provide you with a better
            experience by remembering your preferences and understanding how
            you use our site.
          </Section>

          <Section title="2. Types of Cookies We Use">
            Essential Cookies{"\n"}These cookies are necessary for the website
            to function properly. They enable basic functions like page
            navigation, secure areas access, and shopping cart functionality.
            {"\n\n"}Performance Cookies{"\n"}These cookies help us understand
            how visitors interact with our website by collecting and
            reporting information anonymously. This helps us improve our
            website's performance.{"\n\n"}Functional Cookies{"\n"}These
            cookies enable enhanced functionality and personalization, such
            as remembering your preferences, language settings, and login
            details.{"\n\n"}Marketing Cookies{"\n"}These cookies track your
            browsing habits to deliver advertisements that are relevant to
            you and your interests. They also help measure the effectiveness
            of advertising campaigns.
          </Section>

          <Section title="3. How We Use Cookies">
            We use cookies to:{"\n"}• Keep you signed in to your account
            {"\n"}• Remember your shopping cart items{"\n"}• Understand and
            save your preferences for future visits{"\n"}• Analyze site
            traffic and usage patterns{"\n"}• Personalize content and
            advertisements{"\n"}• Improve website functionality and user
            experience
          </Section>

          <Section title="4. Third-Party Cookies">
            We may use third-party services like Google Analytics, payment
            gateways, and social media platforms that also set cookies. These
            third parties have their own privacy policies and cookie
            policies.
          </Section>

          <Section title="5. Managing Cookies">
            You can control and manage cookies in several ways:{"\n"}•
            Browser Settings: Most browsers allow you to refuse or accept
            cookies through their settings{"\n"}• Delete Cookies: You can
            delete cookies that have already been set{"\n"}• Opt-Out: You can
            opt-out of third-party cookies through their respective websites
            {"\n\n"}Note: Disabling cookies may affect the functionality of
            our website and limit your access to certain features.
          </Section>

          <Section title="6. Cookie Duration">
            Cookies may be:{"\n"}• Session Cookies: Temporary cookies that
            expire when you close your browser{"\n"}• Persistent Cookies:
            Remain on your device for a set period or until you delete them
          </Section>

          <Section title="7. Updates to This Policy">
            We may update this Cookie Policy from time to time. Any changes
            will be posted on this page with an updated revision date.
          </Section>

          <View style={[styles.section, { marginBottom: 0 }]}>
            <Text style={styles.sectionTitle}>8. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have questions about our use of cookies, please contact
              us:
            </Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactName}>OXYKART TECHNOLOGIES PVT LTD</Text>
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

export default PgCookiePolicyScreen;
