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
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { selectUserId } from "../../store/authSlice";
import { PHYSICAL_GOLD_BASE_URL } from "../../constants/api";
import PgLayout from "../components/PgLayout";
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "./physicalGoldApi";
import { performanceMonitor } from "../../utils/performanceMonitor";
import { useApiCall } from "../../hooks/useApiCall";
import { FLATLIST_OPTIMIZATIONS, keyExtractor } from "../../utils/flatListOptimizations";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const C = {
  bg: "#F8F7F6",
  surface: "#FFFFFF",
  border: "#E7E0DA",
  gold: "#CF8B17",
  goldLight: "#E8A530",
  goldDim: "rgba(207,139,23,0.10)",
  goldDimBorder: "rgba(207,139,23,0.20)",
  textPri: "#1C1C1E",
  textSec: "#7A7A80",
  textTer: "#A79C93",
  error: "#C85A54",
  success: "#2ECC71",
};

const CTA = "#CF8B17";

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
    {address.area && <Text style={styles.addressText}>{address.area}</Text>}
    {address.city && <Text style={styles.addressText}>{address.city}</Text>}
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
    city: "",
    area: "",
    pinCode: "",
    type: "Home",
  });
  const [errors, setErrors] = useState({});
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  useEffect(() => {
    performanceMonitor.startMeasure('PgAddressScreen');
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

      const transformedAddresses = addressList.map((addr) => ({
        id: addr.id,
        flatNo: addr.flatNo || "",
        landMark: addr.landMark || "",
        address: addr.address || "",
        state: addr.state || "",
        city: addr.city || "",
        area: addr.area || "",
        pinCode: addr.pincode || addr.pinCode || "",
        type: addr.type || "Home",
      }));

      setAddresses(transformedAddresses);
      performanceMonitor.endMeasure('PgAddressScreen');
    } catch (e) {
      console.log("[Addresses Error]", e.message);
      console.log("[Addresses Error] Status:", e?.status);
      Alert.alert("Error", "Failed to load addresses");
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPincodeDetails = async (pincode) => {
    if (!/^\d{6}$/.test(pincode)) return;
    
    setPincodeLoading(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      
      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0];
        const fetchedState = postOffice.State;
        const fetchedCity = postOffice.District;
        const fetchedArea = postOffice.Name;
        
        if (addressForm.state && addressForm.state !== fetchedState) {
          setErrors(prev => ({ ...prev, pinCode: `This pincode belongs to ${fetchedState}, not ${addressForm.state}` }));
          setPincodeLoading(false);
          return;
        }
        
        setAddressForm(prev => ({
          ...prev,
          state: fetchedState,
          city: fetchedCity,
          area: fetchedArea,
        }));
        setErrors(prev => ({ ...prev, pinCode: "" }));
      } else {
        setErrors(prev => ({ ...prev, pinCode: "Invalid pincode" }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, pinCode: "Failed to validate pincode" }));
    } finally {
      setPincodeLoading(false);
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
    if (!addressForm.city.trim()) newErrors.city = "City is required";
    if (!addressForm.area.trim()) newErrors.area = "Area is required";
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
        city: addressForm.city,
        area: addressForm.area,
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
        city: "",
        area: "",
        pinCode: "",
        type: "Home",
      });
      setErrors({});
      await fetchAddresses();

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
      city: address.city || "",
      area: address.area || "",
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
      city: "",
      area: "",
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
          <FlatList
            data={addresses}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
            contentContainerStyle={styles.addressesList}
            renderItem={({ item }) => (
              <AddressCard
                address={item}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                deleting={deletingAddressId}
              />
            )}
            {...FLATLIST_OPTIMIZATIONS.addressList}
          />
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
              {/* 1. State */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>State *</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowStateDropdown(true)}
                >
                  <Text style={[styles.dropdownBtnText, !addressForm.state && styles.dropdownPlaceholder]}>
                    {addressForm.state || "Select State"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={C.textTer} />
                </TouchableOpacity>
                {errors.state && (
                  <Text style={styles.errorText}>{errors.state}</Text>
                )}
              </View>

              {/* 2. PIN Code */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>PIN Code *</Text>
                <View style={styles.pincodeRow}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    placeholder="e.g., 500001"
                    value={addressForm.pinCode}
                    onChangeText={(text) => {
                      setAddressForm({ ...addressForm, pinCode: text });
                      if (text.length === 6) {
                        fetchPincodeDetails(text);
                      }
                    }}
                    placeholderTextColor={C.textTer}
                    maxLength={6}
                    keyboardType="numeric"
                  />
                  {pincodeLoading && (
                    <ActivityIndicator size="small" color={C.gold} style={{ marginLeft: 8 }} />
                  )}
                </View>
                {errors.pinCode && (
                  <Text style={styles.errorText}>{errors.pinCode}</Text>
                )}
                {pincodeLoading && (
                  <Text style={styles.infoText}>Fetching city and area...</Text>
                )}
              </View>

              {/* 3. City (Auto-filled) */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput
                  style={[styles.fieldInput, addressForm.city && styles.fieldInputAutoFilled]}
                  placeholder="Auto-filled from pincode"
                  value={addressForm.city}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, city: text })
                  }
                  placeholderTextColor={C.textTer}
                  editable={!!addressForm.city || addressForm.pinCode.length !== 6}
                />
                {errors.city && (
                  <Text style={styles.errorText}>{errors.city}</Text>
                )}
              </View>

              {/* 4. Area (Auto-filled) */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Area *</Text>
                <TextInput
                  style={[styles.fieldInput, addressForm.area && styles.fieldInputAutoFilled]}
                  placeholder="Auto-filled from pincode"
                  value={addressForm.area}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, area: text })
                  }
                  placeholderTextColor={C.textTer}
                  editable={!!addressForm.area || addressForm.pinCode.length !== 6}
                />
                {errors.area && (
                  <Text style={styles.errorText}>{errors.area}</Text>
                )}
              </View>

              {/* 5. Flat / House Number */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Flat / House Number *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., 4B, Flat 201"
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

              {/* 6. Building Name / Street */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Building Name / Street *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Sunshine Apartments, MG Road"
                  value={addressForm.address}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, address: text })
                  }
                  placeholderTextColor={C.textTer}
                />
                {errors.address && (
                  <Text style={styles.errorText}>{errors.address}</Text>
                )}
              </View>

              {/* 7. Landmark */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Landmark *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Near City Mall, Opposite Park"
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

              {/* 8. Address Type */}
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

      {/* State Dropdown Modal */}
      <Modal
        visible={showStateDropdown}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStateDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity
                onPress={() => setShowStateDropdown(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={28} color={C.textPri} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={INDIAN_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stateItem}
                  onPress={() => {
                    setAddressForm({ ...addressForm, state: item });
                    setShowStateDropdown(false);
                  }}
                >
                  <Text style={styles.stateItemText}>{item}</Text>
                  {addressForm.state === item && (
                    <Ionicons name="checkmark" size={20} color={C.gold} />
                  )}
                </TouchableOpacity>
              )}
            />
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
    gap: 8,
    backgroundColor: CTA,
    borderRadius: 13,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 20,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.1 },

  addressesList: { gap: 12 },
  addressCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: "rgba(34,30,28,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
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
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPri,
    minHeight: 48,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },

  errorText: { fontSize: 12, color: C.error, marginTop: 4 },
  infoText: { fontSize: 12, color: C.gold, marginTop: 4, fontWeight: "600" },

  typeSelector: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: C.goldDim },
  typeBtnText: { fontSize: 13, fontWeight: "600", color: C.textSec },
  typeBtnTextActive: { color: C.gold, fontWeight: "700" },

  confirmBtn: {
    backgroundColor: CTA,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  confirmBtnDisabled: { backgroundColor: C.border },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.1 },

  dropdownBtn: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
  },
  dropdownBtnText: { fontSize: 14, color: C.textPri, fontWeight: "500" },
  dropdownPlaceholder: { color: C.textTer },
  
  dropdownModal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingTop: 16,
  },
  stateItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stateItemText: { fontSize: 14, color: C.textPri, fontWeight: "500" },
  
  pincodeRow: { flexDirection: "row", alignItems: "center" },
  fieldInputAutoFilled: {
    backgroundColor: C.goldDim,
  },
});

export default PgAddressScreen;
