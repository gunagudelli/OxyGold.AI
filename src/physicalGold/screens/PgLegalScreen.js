import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PgLayout from "../components/PgLayout";
import FadeSlideIn from "../components/FadeSlideIn";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  gold: "#0E6B57",
  navy: "#1C1C1E",
  navyLight: "#7A7A80",
  border: "#E7E0DA",
  divider: "#EEEBE8",
};

const LINKS = [
  { icon: "shield-checkmark-outline", label: "Privacy Policy", route: "PgPrivacyPolicy" },
  { icon: "document-text-outline", label: "Terms & Conditions", route: "PgTerms" },
  { icon: "cube-outline", label: "Shipping Policy", route: "PgShippingPolicy" },
  { icon: "return-down-back-outline", label: "Return & Refund Policy", route: "PgReturnRefundPolicy" },
  { icon: "close-circle-outline", label: "Cancellation Policy", route: "PgCancellationPolicy" },
  { icon: "help-circle-outline", label: "FAQs", route: "PgFAQ" },
  { icon: "settings-outline", label: "Cookie Policy", route: "PgCookiePolicy" },
];

const PgLegalScreen = ({ navigation }) => {
  return (
    <PgLayout title="Legal & Policies" showBack onBack={() => navigation.goBack()} hideLogo hideCart>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <FadeSlideIn>
        <View style={styles.card}>
          {LINKS.map((item, idx) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.row, idx < LINKS.length - 1 && styles.rowDivider]}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={16} color={C.gold} style={styles.rowIcon} />
              <Text style={styles.rowText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={14} color={C.navyLight} />
            </TouchableOpacity>
          ))}
        </View>
        </FadeSlideIn>
      </ScrollView>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  rowIcon: { width: 18, textAlign: "center" },
  rowText: { flex: 1, fontSize: 13.5, fontWeight: "500", color: C.navy },
});

export default PgLegalScreen;
