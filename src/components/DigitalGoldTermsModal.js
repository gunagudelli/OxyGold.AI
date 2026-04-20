import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  gold: "#C8952A",
  goldLight: "#F5ECD7",
  navy: "#1C2340",
  navyMid: "#3D4463",
  navyLight: "#8891AF",
  border: "#EAE8E2",
  overlay: "rgba(28, 35, 64, 0.85)",
};

const DigitalGoldTermsModal = ({ visible, onClose, onAccept, type = "buy" }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="shield-checkmark" size={22} color={C.gold} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Terms & Conditions</Text>
                <Text style={styles.headerSub}>Digital Gold Purchase</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={C.navyLight} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Section 1 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Purchase Terms</Text>
              <Text style={styles.sectionContent}>
Gold prices displayed on the platform are live and market-linked, and may change frequently based on real-time market conditions. Once you initiate a purchase, the price will be locked for 5 minutes to protect you from price fluctuations.

You must complete the payment within this 5-minute window to confirm the transaction at the locked price. If payment is not completed within 5 minutes, the price lock expires, and the updated live price will apply for any new purchase.

Minimum purchase value is ₹100 as defined by the platform policy. Once the payment is successful, the transaction cannot be cancelled or reversed under any circumstances.

Purchased gold will be credited instantly to your Digital Gold account/wallet upon successful payment confirmation. All gold purchased through this platform is 24K pure gold with 99.5% or higher purity certification.

Applicable GST (3%) and other charges will be applied as per government regulations and will be clearly shown before payment. The platform does not guarantee any returns or profits on gold purchases. Gold is subject to market risks.

Users may be required to complete KYC (Know Your Customer) verification for certain transactions as per regulatory requirements.
              </Text>
            </View>

            {/* Section 2 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Selling Gold (Sell Back)</Text>
              <Text style={styles.sectionContent}>
You can sell your digital gold at the live sell price available on the platform at any time. Sell prices are market-linked and may differ from buy prices due to market spread, taxes, and operational charges.

Selling is allowed only during market operating hours. The platform will display available hours. Once you confirm a sell request, the transaction is final and cannot be cancelled or modified.

The sale amount will be credited to your registered bank account within 1–2 working days after successful transaction. The platform reserves the right to limit or pause sell transactions based on market conditions or regulatory requirements.

Users are advised to check both buy and sell prices before confirming any transaction to understand the price difference.
              </Text>
            </View>

            {/* Section 3 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Storage & Security</Text>
              <Text style={styles.sectionContent}>
Your purchased gold is stored securely in insured vaults on your behalf by authorized custodians. Free storage is provided for a limited period of up to 5 years from the date of purchase.

After the free storage period, nominal storage charges may apply as per platform policy. Gold is insured against risks such as theft, fire, natural disasters, and other unforeseen events.

The platform maintains full transparency regarding storage location and insurance coverage details. You retain full ownership of your gold at all times, and storage is provided as a service.
              </Text>
            </View>

            {/* Section 4 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Physical Delivery of Gold</Text>
              <Text style={styles.sectionContent}>
Users may request physical delivery of gold in the form of coins or bars, subject to minimum quantity requirements. Additional charges such as minting charges, making charges, delivery charges, and GST will apply for physical delivery.

Delivery timelines may vary based on your location, product availability, and logistics partners. Physical gold delivered will be BIS hallmarked and certified for purity and authenticity.

Once physical delivery is initiated, the digital gold will be debited from your account and cannot be reversed. Delivery charges and timelines will be clearly communicated before you confirm the delivery request.
              </Text>
            </View>

            {/* Section 5 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Pricing & Charges</Text>
              <Text style={styles.sectionContent}>
The buy price and sell price are different due to market spread, taxes, and operational charges. GST at 3% is applicable on all gold purchases as per government regulations.

Platform fees, if any, will be clearly disclosed before transaction confirmation. No hidden charges - all applicable fees will be shown in the order summary before payment.

Prices are updated in real-time based on international gold market rates.
              </Text>
            </View>

            {/* Section 6 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. General Terms & Conditions</Text>
              <Text style={styles.sectionContent}>
The platform acts as a facilitator for buying and selling gold. We do not manufacture or mine gold. Gold prices are subject to market risks and fluctuations. Past performance is not indicative of future results.

The platform is not responsible for investment decisions made by users. Please invest based on your own research and risk appetite. Users must ensure all details (bank account, KYC documents, contact information) are accurate and updated.

Transactions may be restricted, delayed, or cancelled in case of suspicious activity, fraudulent behavior, or regulatory compliance requirements. The platform reserves the right to modify these terms and conditions at any time. Users will be notified of significant changes.

By accepting these terms, you confirm that you have read, understood, and agree to abide by all the conditions mentioned above. For any disputes, the jurisdiction will be as per the laws of India and courts of the registered office location.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.acceptBtnText}>Accept & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Section = ({ title, content }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionContent}>{content}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    height: SCREEN_HEIGHT * 0.87,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.goldLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.gold,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.navy,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500",
    color: C.navyLight,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    minHeight: 200,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  section: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  sectionContent: {
    fontSize: 13,
    lineHeight: 21,
    color: "#2C3E50",
    fontWeight: "400",
    textAlign: "left",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navyMid,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 11,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});

export default DigitalGoldTermsModal;
