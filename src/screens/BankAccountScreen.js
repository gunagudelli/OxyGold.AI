import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectUserId, selectAccessToken } from "../store/authSlice";
import { apiPost } from "../services/apiClient";
import { BASE_URL } from "../constants/api";

const BankAccountScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    console.log("[BankAccountScreen] Button clicked!");
    console.log("[BankAccountScreen] accountNumber:", accountNumber);
    console.log("[BankAccountScreen] ifscCode:", ifscCode);

    // Validate
    if (!accountNumber || !ifscCode) {
      console.log("[BankAccountScreen] Validation failed: empty fields");
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    if (accountNumber.length < 9 || accountNumber.length > 18) {
      console.log(
        "[BankAccountScreen] Validation failed: account number length",
      );
      Alert.alert("Error", "Account number must be 9–18 digits");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: Number(userId),
        accountNumber: accountNumber.trim(),
        ifsc: ifscCode.trim().toUpperCase(),
        beneActive: false,
      };
      console.log(
        "[BankAccountScreen] ========== SAVE BANK DETAILS START ==========",
      );
      console.log(
        "[BankAccountScreen] Payload:",
        JSON.stringify(payload, null, 2),
      );
      console.log(
        "[BankAccountScreen] Calling: POST ${BASE_URL}/auth/saveBankDetails",
      );

      const response = await apiPost(
        `${BASE_URL}/auth/saveBankDetails`,
        payload,
      );

      console.log("[BankAccountScreen] ========== API RESPONSE ==========");
      console.log(
        "[BankAccountScreen] Response:",
        JSON.stringify(response, null, 2),
      );
      console.log("[BankAccountScreen] Response Status:", response?.success);
      console.log("[BankAccountScreen] Response Message:", response?.message);
      console.log(
        "[BankAccountScreen] ========== SAVE BANK DETAILS SUCCESS ==========",
      );

      Alert.alert("Success", "Bank details saved successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.log("[BankAccountScreen] ========== ERROR ==========");
      console.log("[BankAccountScreen] Error Message:", error.message);
      console.log("[BankAccountScreen] Error Status:", error.status);
      console.log(
        "[BankAccountScreen] Error Data:",
        JSON.stringify(error.data, null, 2),
      );
      console.log("[BankAccountScreen] ========== ERROR END ==========");
      Alert.alert("Error", error.message || "Failed to save bank details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#464B8B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Info strip */}
        <View style={styles.infoStrip}>
          <Ionicons name="information-circle" size={16} color="#16a34a" />
          <Text style={styles.infoText}>
            Funds credited within T+1 working day
          </Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          {/* Account Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Account Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="card-outline"
                size={18}
                color="#464B8B"
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="9–18 digit number"
                placeholderTextColor="#bbb"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
                maxLength={18}
              />
            </View>
          </View>

          {/* IFSC Code */}
          <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
            <Text style={styles.label}>IFSC Code</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="code-slash-outline"
                size={18}
                color="#464B8B"
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor="#bbb"
                value={ifscCode}
                onChangeText={(t) => setIfscCode(t.toUpperCase())}
                maxLength={11}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Save Bank Details</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#464B8B" },
  scroll: { padding: 16, paddingBottom: 40 },
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.2)",
  },
  infoText: { fontSize: 12, color: "#16a34a", fontWeight: "600", flex: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E3D8",
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#464B8B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#333" },
  btn: {
    backgroundColor: "#464B8B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

export default BankAccountScreen;
