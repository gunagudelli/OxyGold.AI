import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { selectUserId } from "../store/authSlice";
import { PHYSICAL_GOLD_BASE_URL } from "../constants/api";
import PgLayout from "../../components/physical/PgLayout";
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "./physicalGoldApi";

const C = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  border: "#E8E3D8",
  gold: "#B8891A",
  goldLight: "#D4A82A",
  goldDim: "rgba(184,137,26,0.10)",
  goldDimBorder: "rgba(184,137,26,0.22)",
  textPri: "#1A1508",
  textSec: "#6B6050",
  textTer: "#A89880",
  error: "#C0392B",
  success: "#1A7A4A",
};

const AddressCard = ({ address, onEdit, onDelete, deleting }) => (
  <View style={styles.addressCard}>
    <View style={styles.addressHeader}>
      <View style={styles.addressTypeBadge}>
        <Text style={styles.addressTypeText}>{address.type || "Home"}</Text>
      </View>
      <View style={styles.addressActions}>
        <TouchableOpacity
          onPress={() => onEdit(address)}
          style={styles.iconBtn}
        >
          <Ionicons name="pencil" size={18} color={C.gold} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(address.id)}
          style={styles.iconBtn}
          disabled={deleting === address.id}
        >
          {deleting === address.id ? (
            <ActivityIndicator size="small" color={C.error} />
          ) : (
            <Ionicons name="trash" size={18} color={C.error} />
          )}
        </TouchableOpacity>
      </View>
    </View>
    <Text style={styles.addressText}>{address.flatNo}</Text>
    <Text style={styles.addressText}>{address.address}</Text>
    <Text style={styles.addressText}>{address.landMark}</Text>
    <View style={styles.addressFooter}>
      <Text style={styles.addressMeta}>
        {address.state} - {address.pinCode}
      </Text>
    </View>
  </View>
);

const PgAddressScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const returnTo = route?.params?.returnTo;

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    flatNo: "",
    landMark: "",
    address: "",
    state: "",
    pinCode: "",
    type: "Home",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAddresses();
  }, []);

  const STORAGE_KEY = `addresses_${userId}`;

  const fetchAddresses = async () => {
    if (!userId) {
      console.log("[Addresses] No userId available");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log("[Addresses] Fetching addresses for userId:", userId);

      const addressList = await getUserAddresses(userId);
      console.log("[Addresses] Loaded:", addressList.length, "addresses");

      // Transform API response to match form structure
      const transformedAddresses = addressList.map((addr) => ({
        id: addr.id,
        flatNo: addr.flatNo || "",
        landMark: addr.landMark || "",
        address: addr.address || "",
        state: addr.state || "",
        pinCode: addr.pincode || addr.pinCode || "",
        type: addr.type || "Home",
      }));

      setAddresses(transformedAddresses);
    } catch (e) {
      console.log("[Addresses Error]", e.message);
      console.log("[Addresses Error] Status:", e?.status);
      Alert.alert("Error", "Failed to load addresses");
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!addressForm.flatNo.trim())
      newErrors.flatNo = "Flat / house number is required";
    if (!addressForm.landMark.trim())
      newErrors.landMark = "Landmark is required";
    if (!addressForm.address.trim())
      newErrors.address = "Complete address is required";
    if (!addressForm.state.trim()) newErrors.state = "State is required";
    if (!addressForm.pinCode.trim()) {
      newErrors.pinCode = "PIN code is required";
    } else if (!/^\d{6}$/.test(addressForm.pinCode)) {
      newErrors.pinCode = "PIN code must be exactly 6 digits";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        userId: Number(userId),
        flatNo: addressForm.flatNo,
        landMark: addressForm.landMark,
        address: addressForm.address,
        state: addressForm.state,
        pincode: addressForm.pinCode,
        type: addressForm.type,
      };

      if (editingAddress?.id) {
        payload.id = Number(editingAddress.id);
        console.log("[SaveAddress] Updating address:", payload);
        await updateAddress(payload);
        Alert.alert("Success", "Address updated successfully");
      } else {
        console.log("[SaveAddress] Adding new address:", payload);
        await addAddress(payload);
        Alert.alert("Success", "Address added successfully");
      }

      setShowModal(false);
      setEditingAddress(null);
      setAddressForm({
        flatNo: "",
        landMark: "",
        address: "",
        state: "",
        pinCode: "",
        type: "Home",
      });
      setErrors({});
      await fetchAddresses();

      // Navigate back to checkout if returnTo is specified
      if (returnTo === "PgCheckout") {
        setTimeout(() => {
          navigation.navigate("PgCheckout");
        }, 500);
      }
    } catch (e) {
      console.error("[SaveAddress Error]", e.message);
      console.error("[SaveAddress Error] Status:", e?.status);
      Alert.alert("Error", e?.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingAddressId(addressId);
            try {
              await deleteAddress(userId, addressId);
              Alert.alert("Success", "Address deleted successfully");
              await fetchAddresses();
            } catch (error) {
              console.error("[DeleteAddress Error]", error.message);
              Alert.alert(
                "Error",
                error?.message || "Failed to delete address",
              );
            } finally {
              setDeletingAddressId(null);
            }
          },
        },
      ],
    );
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      flatNo: address.flatNo || "",
      landMark: address.landMark || "",
      address: address.address || "",
      state: address.state || "",
      pinCode: address.pinCode || "",
      type: address.type || "Home",
    });
    setErrors({});
    setShowModal(true);
  };

  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      flatNo: "",
      landMark: "",
      address: "",
      state: "",
      pinCode: "",
      type: "Home",
    });
    setErrors({});
    setShowModal(true);
  };

  if (loading) {
    return (
      <PgLayout
        title="My Addresses"
        showBack
        onBack={() => navigation.goBack()}
      >
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={{ marginTop: 12, color: C.textSec }}>
            Loading addresses...
          </Text>
        </View>
      </PgLayout>
    );
  }

  return (
    <PgLayout title="My Addresses" showBack onBack={() => navigation.goBack()}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color={C.textTer} />
            <Text style={styles.emptyText}>No addresses yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first address to get started
            </Text>
          </View>
        ) : (
          <View style={styles.addressesList}>
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                deleting={deletingAddressId}
              />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addBtn} onPress={handleAddNewAddress}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Address Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? "Update Address" : "Add New Address"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={28} color={C.textPri} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Flat / House Number *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., 4B"
                  value={addressForm.flatNo}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, flatNo: text })
                  }
                  placeholderTextColor={C.textTer}
                />
                {errors.flatNo && (
                  <Text style={styles.errorText}>{errors.flatNo}</Text>
                )}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Landmark *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Near park"
                  value={addressForm.landMark}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, landMark: text })
                  }
                  placeholderTextColor={C.textTer}
                />
                {errors.landMark && (
                  <Text style={styles.errorText}>{errors.landMark}</Text>
                )}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Complete Address *</Text>
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  placeholder="Street, area, city"
                  value={addressForm.address}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, address: text })
                  }
                  placeholderTextColor={C.textTer}
                  multiline
                  numberOfLines={3}
                />
                {errors.address && (
                  <Text style={styles.errorText}>{errors.address}</Text>
                )}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>State *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Telangana"
                  value={addressForm.state}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, state: text })
                  }
                  placeholderTextColor={C.textTer}
                />
                {errors.state && (
                  <Text style={styles.errorText}>{errors.state}</Text>
                )}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>PIN Code *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., 500001"
                  value={addressForm.pinCode}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, pinCode: text })
                  }
                  placeholderTextColor={C.textTer}
                  maxLength={6}
                  keyboardType="numeric"
                />
                {errors.pinCode && (
                  <Text style={styles.errorText}>{errors.pinCode}</Text>
                )}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Address Type</Text>
                <View style={styles.typeSelector}>
                  {["Home", "Work", "Other"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeBtn,
                        addressForm.type === type && styles.typeBtnActive,
                      ]}
                      onPress={() => setAddressForm({ ...addressForm, type })}
                    >
                      <Text
                        style={[
                          styles.typeBtnText,
                          addressForm.type === type && styles.typeBtnTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
                onPress={handleSaveAddress}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {editingAddress ? "Update Address" : "Add Address"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 100 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#B8891A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  addressesList: { gap: 14 },
  addressCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addressTypeBadge: {
    backgroundColor: C.goldDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.goldDimBorder,
  },
  addressTypeText: { fontSize: 11, fontWeight: "700", color: C.gold },
  addressActions: { flexDirection: "row", gap: 8 },
  iconBtn: { padding: 6 },
  addressText: {
    fontSize: 13,
    color: C.textPri,
    marginBottom: 4,
    fontWeight: "500",
  },
  addressFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  addressMeta: { fontSize: 12, color: C.textTer },

  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPri,
    marginTop: 12,
  },
  emptySubtext: { fontSize: 13, color: C.textTer, marginTop: 6 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 16,
    zIndex: 1001,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.textPri },
  closeBtn: { padding: 8, marginRight: -8 },
  modalScroll: { paddingHorizontal: 16, paddingVertical: 16, maxHeight: 600 },

  fieldContainer: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSec,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPri,
    minHeight: 48,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },

  errorText: { fontSize: 12, color: C.error, marginTop: 4 },

  typeSelector: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: C.goldDim, borderColor: C.gold },
  typeBtnText: { fontSize: 13, fontWeight: "600", color: C.textSec },
  typeBtnTextActive: { color: C.gold, fontWeight: "800" },

  confirmBtn: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#B8891A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

export default PgAddressScreen;
