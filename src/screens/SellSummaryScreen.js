import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectUserId, selectAccessToken } from "../store/authSlice";
import { BASE_URL, PHYSICAL_GOLD_BASE_URL } from "../constants/api";
import DigitalGoldTermsModal from "../components/DigitalGoldTermsModal";

const BANK_API = `${PHYSICAL_GOLD_BASE_URL}/auth/getBankDetailsByuserId`;
const SELL_API = `${PHYSICAL_GOLD_BASE_URL}/digital-gold/sell/initiate`;

const Row = ({ label, value, gold }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text
      style={[s.rowValue, gold && s.rowGold]}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {value}
    </Text>
  </View>
);

export default function SellSummaryScreen({ navigation, route }) {
  const { amount, grams, sellRate, availableGold } = route.params ?? {};
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);

  const [timeLeft, setTimeLeft] = useState(300);
  const [isAccepted, setIsAccepted] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankError, setBankError] = useState(null);
  const [sellLoading, setSellLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const processingRef = useRef(false);

  const isPriceLocked = timeLeft > 0;
  const isUrgent = timeLeft <= 60;
  const timerPct = (timeLeft / 300) * 100;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  // Block hardware back during sell
  useEffect(() => {
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      () => sellLoading,
    );
    return () => sub.remove();
  }, [sellLoading]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch bank details on mount and when returning from BankAccount screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBank();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchBank = async () => {
    try {
      setBankLoading(true);
      setBankError(null);
      
      const res = await fetch(`${BANK_API}?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      
      const data = await res.json();
      
      const list = data?.data;
      if (Array.isArray(list) && list.length > 0) {
        setBankDetails(list[0]);
      } else if (data?.accountNumber) {
        setBankDetails(data);
      } else {
        setBankDetails(null);
      }
    } catch (e) {
      setBankError("Failed to load bank details. Please try again.");
    } finally {
      setBankLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!isPriceLocked) {
      Alert.alert("Price Expired", "Please go back and get a fresh price.");
      return;
    }
    
    // Check if user has accepted the terms
    if (!isAccepted) {
      Alert.alert(
        "Accept Terms & Conditions",
        "Please accept the Terms & Conditions to continue.",
      );
      return;
    }
    
    if (!bankDetails) {
      Alert.alert(
        "Bank Required",
        "Please add a bank account before proceeding.",
      );
      return;
    }
    if (processingRef.current) return;
    processingRef.current = true;
    setSellLoading(true);

    try {
      const body = {
        userId: parseInt(userId),
        amount: parseFloat(amount),
        grams: parseFloat(grams),
        purchaseType: "AMOUNT",
        pergramPrice: parseFloat(sellRate),
        pergramSellingPrice: parseFloat(sellRate),
        paymentMode: "BANK",
        productId: 1,
      };

      console.log('[SellSummaryScreen] ========== SELL INITIATE START ==========');
      console.log('[SellSummaryScreen] URL:', SELL_API);
      console.log('[SellSummaryScreen] Payload:', JSON.stringify(body, null, 2));

      const res = await fetch(SELL_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      console.log('[SellSummaryScreen] Response Status:', res.status);
      console.log('[SellSummaryScreen] Response:', JSON.stringify(data, null, 2));

      if (data?.success && data?.data) {
        console.log('[SellSummaryScreen] ========== SELL INITIATE SUCCESS ==========');
        navigation.replace("SellProcess", {
          transactionId: data.data.transactionId,
          beneficiaryId: data.data.beneficiaryId,
          status: data.data.status,
          amount,
          grams,
          sellRate,
          bankDetails,
        });
      } else {
        console.log('[SellSummaryScreen] ========== SELL INITIATE FAILED ==========');
        throw new Error(data?.message || "Sell initiation failed");
      }
    } catch (e) {
      console.log('[SellSummaryScreen] ========== SELL INITIATE ERROR ==========');
      console.error('[SellSummaryScreen] Error:', e.message);
      Alert.alert(
        "Transaction Failed",
        e.message || "Could not process sell. Please try again.",
      );
    } finally {
      processingRef.current = false;
      setSellLoading(false);
    }
  };

  if (!route.params) {
    navigation.goBack();
    return null;
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]} backgroundColor="#1C2340">
      <StatusBar barStyle="light-content" backgroundColor="#1C2340" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          disabled={sellLoading}
        >
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Review Sell Order</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flex: 1, backgroundColor: "#f7f8fa" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
        {/* Timer Banner */}
        <View
          style={[
            s.timerBanner,
            isUrgent ? s.timerUrgent : s.timerOk,
            !isPriceLocked && s.timerExpired,
          ]}
        >
          <View style={s.timerRow}>
            <Ionicons
              name={isPriceLocked ? "lock-closed" : "alert-circle"}
              size={15}
              color={!isPriceLocked ? "#dc2626" : isUrgent ? "#d97706" : "#1a3060"}
            />
            <Text
              style={[
                s.timerText,
                isUrgent && !isPriceLocked
                  ? s.timerTextExpired
                  : isUrgent
                    ? s.timerTextUrgent
                    : s.timerTextOk,
              ]}
            >
              {isPriceLocked
                ? "Price locked — expires in"
                : "Price lock expired"}
            </Text>
            {isPriceLocked && (
              <View
                style={[
                  s.timerPill,
                  isUrgent ? s.timerPillUrgent : s.timerPillOk,
                ]}
              >
                <Text
                  style={[
                    s.timerPillText,
                    isUrgent ? s.timerPillTextUrgent : s.timerPillTextOk,
                  ]}
                >
                  {mins}:{secs}
                </Text>
              </View>
            )}
          </View>
          {isPriceLocked && (
            <View style={s.timerBarBg}>
              <View
                style={[
                  s.timerBarFill,
                  {
                    width: `${timerPct}%`,
                    backgroundColor: isUrgent ? "#d97706" : "#1a3060",
                  },
                ]}
              />
            </View>
          )}
        </View>

        {/* Sell Details Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sell Details</Text>
          <Row
            label="Sell Rate (Locked)"
            value={`₹${parseFloat(sellRate).toLocaleString("en-IN", { maximumFractionDigits: 2 })} / gram`}
            gold
          />
          <Row
            label="Quantity"
            value={`${parseFloat(grams).toFixed(4)} grams`}
          />
          <View style={s.divider} />
          <Row
            label="You Will Receive"
            value={`₹${parseFloat(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
            gold
          />
          <Text style={s.gstNote}>
            * Selling price is GST-adjusted as per regulations
          </Text>
        </View>

        {/* Bank Details Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Bank Details</Text>

          {bankLoading ? (
            <ActivityIndicator color="#464B8B" style={{ marginVertical: 16 }} />
          ) : bankError ? (
            <View style={s.bankError}>
              <Text style={s.bankErrorText}>{bankError}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={fetchBank}>
                <Text style={s.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : bankDetails ? (
            <>
              <Row label="Account Holder" value={bankDetails.nameAtBank} />
              <Row label="Account Number" value={bankDetails.accountNumber} />
              <Row label="Bank Name" value={bankDetails.bankName} />
              {bankDetails.ifsc && (
                <Row label="IFSC Code" value={bankDetails.ifsc} />
              )}
              {bankDetails.branch && (
                <Row
                  label="Branch"
                  value={`${bankDetails.branch}${bankDetails.city ? ", " + bankDetails.city : ""}`}
                />
              )}
              <TouchableOpacity
                style={s.changeBtn}
                onPress={() =>
                  navigation.navigate("BankAccount", {
                    returnTo: "SellSummary",
                    ...route.params,
                  })
                }
              >
                <Text style={s.changeBtnText}>Change Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.noBankWrap}>
              <Text style={s.noBankText}>No bank account added</Text>
              <TouchableOpacity
                style={s.addBankBtn}
                onPress={() =>
                  navigation.navigate("BankAccount", {
                    returnTo: "SellSummary",
                    ...route.params,
                  })
                }
              >
                <Ionicons name="add-circle-outline" size={16} color="#464B8B" />
                <Text style={s.addBankBtnText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Terms */}
        <View style={s.termsRow}>
          <TouchableOpacity
            onPress={() => setIsAccepted(!isAccepted)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[s.checkbox, isAccepted && s.checkboxActive]}>
              {isAccepted && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
          </TouchableOpacity>
          <Text style={s.termsText}>
            I accept the{" "}
            <Text style={s.termsLink} onPress={() => setShowTermsModal(true)}>
              Terms & Conditions
            </Text>
          </Text>
        </View>

        {/* Security note */}
        <View style={s.secRow}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={s.secText}>
            256-bit SSL encrypted · T+1 settlement · TDS applicable above
            ₹50,000
          </Text>
        </View>
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        {isPriceLocked ? (
          <TouchableOpacity
            style={[
              s.confirmBtn,
              (!isAccepted || !bankDetails || sellLoading) &&
                s.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={
              !isAccepted || !bankDetails || sellLoading || !isPriceLocked
            }
            activeOpacity={0.85}
          >
            {sellLoading ? (
              <ActivityIndicator color="#0d1f3c" size="small" />
            ) : (
              <Text style={s.confirmBtnText}>
                {bankDetails
                  ? "Confirm & Sell Gold →"
                  : "Add Bank Account First"}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.refreshBtn}
            onPress={() => navigation.navigate("SellGold")}
          >
            <Text style={s.refreshBtnText}>↺ Get Fresh Price & Try Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Terms Modal */}
      <DigitalGoldTermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setIsAccepted(true);
          setShowTermsModal(false);
        }}
        type="sell"
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1C2340" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#1C2340",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,168,67,0.22)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(212,168,67,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.28)",
  },
  backBtnText: { fontSize: 18, color: "#D4A843", fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#E8C97A" },

  timerBanner: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  timerOk: { backgroundColor: "#fff", borderColor: "#e8ecf0" },
  timerUrgent: {
    backgroundColor: "#fffbeb",
    borderColor: "rgba(217,119,6,0.25)",
  },
  timerExpired: {
    backgroundColor: "#fef2f2",
    borderColor: "rgba(220,38,38,0.2)",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  timerText: { fontSize: 13, fontWeight: "500" },
  timerTextOk: { color: "#1a3060" },
  timerTextUrgent: { color: "#d97706" },
  timerTextExpired: { color: "#dc2626" },
  timerPill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 },
  timerPillOk: { backgroundColor: "rgba(26,48,96,0.1)" },
  timerPillUrgent: { backgroundColor: "rgba(217,119,6,0.12)" },
  timerPillText: { fontSize: 12, fontWeight: "700" },
  timerPillTextOk: { color: "#1a3060" },
  timerPillTextUrgent: { color: "#d97706" },
  timerBarBg: {
    height: 3,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 99,
    overflow: "hidden",
  },
  timerBarFill: { height: "100%", borderRadius: 99 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f5f7",
  },
  rowLabel: { fontSize: 13, color: "#8a96a3", flexShrink: 0 },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1c2b3a",
    flexShrink: 1,
    marginLeft: 12,
    textAlign: "right",
  },
  rowGold: { color: "#b8720a" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 8 },
  gstNote: { fontSize: 11, color: "#999", fontStyle: "italic", marginTop: 8 },

  bankError: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  bankErrorText: { fontSize: 13, color: "#dc2626", textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f4f5f7",
    borderWidth: 1,
    borderColor: "#e4e7eb",
  },
  retryBtnText: { fontSize: 12, color: "#1a3060", fontWeight: "600" },

  changeBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#f4f5f7",
    borderWidth: 1,
    borderColor: "#e4e7eb",
  },
  changeBtnText: { fontSize: 12, color: "#1a3060", fontWeight: "600" },

  noBankWrap: { alignItems: "center", paddingVertical: 12, gap: 10 },
  noBankText: { fontSize: 13, color: "#999" },
  addBankBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#464B8B",
  },
  addBankBtnText: { fontSize: 13, color: "#464B8B", fontWeight: "600" },

  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  termsText: { fontSize: 13, color: "#666", flex: 1, fontWeight: "500" },
  termsLink: { color: "#1a3060", fontWeight: "700", textDecorationLine: "underline" },

  secRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  secText: { fontSize: 11, color: "#10B981", flex: 1 },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  confirmBtn: {
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: "#f0bb3a",
    alignItems: "center",
  },
  confirmBtnDisabled: { opacity: 0.55 },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#0d1f3c" },
  refreshBtn: {
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: "#1a3060",
    alignItems: "center",
  },
  refreshBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
