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
import { BASE_URL } from "../constants/api";

const BANK_API = `${BASE_URL}/auth/getBankDetailsByuserId`;
const SELL_API = `${BASE_URL}/digital-gold/sell/initiate`;

const Row = ({ label, value, gold }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, gold && s.rowGold]}>{value}</Text>
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

  // Fetch bank details
  useEffect(() => {
    fetchBank();
  }, []);

  const fetchBank = async () => {
    try {
      setBankLoading(true);
      setBankError(null);
      console.log('[SellSummaryScreen] ========== FETCH BANK DETAILS START ==========');
      console.log('[SellSummaryScreen] userId:', userId);
      console.log('[SellSummaryScreen] API URL:', `${BANK_API}?userId=${userId}`);
      
      const res = await fetch(`${BANK_API}?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      
      console.log('[SellSummaryScreen] Response Status:', res.status);
      const data = await res.json();
      
      console.log('[SellSummaryScreen] ========== FULL RESPONSE ==========');
      console.log('[SellSummaryScreen] Response:', JSON.stringify(data, null, 2));
      console.log('[SellSummaryScreen] Response Keys:', Object.keys(data));
      console.log('[SellSummaryScreen] data.data:', JSON.stringify(data?.data, null, 2));
      console.log('[SellSummaryScreen] data.data type:', Array.isArray(data?.data) ? 'ARRAY' : typeof data?.data);
      
      const list = data?.data;
      if (Array.isArray(list) && list.length > 0) {
        console.log('[SellSummaryScreen] Bank details found (array), first item:', JSON.stringify(list[0], null, 2));
        console.log('[SellSummaryScreen] First item keys:', Object.keys(list[0]));
        setBankDetails(list[0]);
      } else if (data?.accountNumber) {
        console.log('[SellSummaryScreen] Bank details found (object):', JSON.stringify(data, null, 2));
        console.log('[SellSummaryScreen] Object keys:', Object.keys(data));
        setBankDetails(data);
      } else {
        console.log('[SellSummaryScreen] No bank details found in response');
        console.log('[SellSummaryScreen] Checking for alternative structures...');
        console.log('[SellSummaryScreen] data.success:', data?.success);
        console.log('[SellSummaryScreen] data.message:', data?.message);
      }
      console.log('[SellSummaryScreen] ========== FETCH BANK DETAILS END ==========');
    } catch (e) {
      console.log('[SellSummaryScreen] ========== ERROR ==========');
      console.log('[SellSummaryScreen] Error message:', e.message);
      console.log('[SellSummaryScreen] Error:', e);
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
    if (!isAccepted) {
      Alert.alert(
        "Terms Required",
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
        productId: 4,
      };

      const res = await fetch(SELL_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data?.success && data?.data) {
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
        throw new Error(data?.message || "Sell initiation failed");
      }
    } catch (e) {
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
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
            <Text style={s.timerIcon}>{isPriceLocked ? "🔒" : "⚠️"}</Text>
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
        <TouchableOpacity
          style={s.termsRow}
          onPress={() => setIsAccepted((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, isAccepted && s.checkboxActive]}>
            {isAccepted && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={s.termsText}>
            I agree to the <Text style={s.termsLink}>Terms & Conditions</Text>
          </Text>
        </TouchableOpacity>

        {/* Security note */}
        <View style={s.secRow}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={s.secText}>
            256-bit SSL encrypted · T+1 settlement · TDS applicable above
            ₹50,000
          </Text>
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f7f8fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#464B8B",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: { fontSize: 18, color: "#464B8B", fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#464B8B" },

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
  timerIcon: { fontSize: 14 },
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
  rowLabel: { fontSize: 13, color: "#8a96a3" },
  rowValue: { fontSize: 13, fontWeight: "600", color: "#1c2b3a" },
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
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: "#d9a020", borderColor: "#d9a020" },
  termsText: { fontSize: 13, color: "#8a96a3", flex: 1 },
  termsLink: { color: "#1a3060", fontWeight: "600" },

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
