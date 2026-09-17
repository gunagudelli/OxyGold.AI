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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { selectUserId } from "../../store/authSlice";
import { PHYSICAL_GOLD_BASE_URL } from "../../constants/api";
import PgLayout from "../components/PgLayout";
import PgLoader from "../components/PgLoader";
import FadeSlideIn from "../components/FadeSlideIn";
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../api/physicalGoldApi";
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
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#E7E0DA",
  gold: "#0E6B57",
  goldLight: "#14876D",
  goldDim: "rgba(14,107,87,0.10)",
  goldDimBorder: "rgba(14,107,87,0.20)",
  textPri: "#1C1C1E",
  textSec: "#7A7A80",
  textTer: "#A79C93",
  error: "#C0392B",
  success: "#1F8A4C",
};

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

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
    <View style={styles.addressBody}>
      <Ionicons name="location-outline" size={16} color={C.gold} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.addressLine1}>
          {[address.flatNo, address.address].filter(Boolean).join(", ")}
        </Text>
        {address.landMark ? (
          <Text style={styles.addressLine2}>Near {address.landMark}</Text>
        ) : null}
        {(address.area || address.city) ? (
          <Text style={styles.addressLine2}>
            {[address.area, address.city].filter(Boolean).join(", ")}
          </Text>
        ) : null}
      </View>
    </View>
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
    latitude: "",
    longitude: "",
  });
  const [errors, setErrors] = useState({});
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

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
        latitude: addr.latitude || "",
        longitude: addr.longitude || "",
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
        geocodeAddress({ ...addressForm, state: fetchedState, city: fetchedCity, area: fetchedArea, pinCode: pincode });
      } else {
        setErrors(prev => ({ ...prev, pinCode: "Invalid pincode" }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, pinCode: "Failed to validate pincode" }));
    } finally {
      setPincodeLoading(false);
    }
  };

  // ── Geocoding — converts the typed address into lat/lng so delivery/routing
  // has real coordinates, without requiring the user to grant GPS permission.
  // Same Google Geocoding API + key already used by the web app for this. ──
  const GOOGLE_API_KEY = "AIzaSyAM29otTWBIAefQe6mb7f617BbnXTHtN0M";

  const geocodeAddress = async (fields) => {
    const { flatNo, landMark, address, pinCode, state } = fields;
    if (!flatNo?.trim() || !address?.trim() || !pinCode?.trim() || !state?.trim()) return;

    const query = [flatNo, landMark, address, pinCode, state].filter(Boolean).join(", ");
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        setAddressForm((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
      }
    } catch (error) {
      console.log("[Geocoding] Failed:", error?.message);
    } finally {
      setGeocoding(false);
    }
  };

  // ── Reverse geocoding — converts GPS coordinates back into address fields
  // (pinCode, state, city, area, address) so "Use my current location" fills
  // the form the same way the web app's does. ──
  const reverseGeocodeLocation = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
      );
      const data = await res.json();
      if (data.status !== "OK" || !data.results?.length) return null;

      const result = data.results[0];
      const component = (type) =>
        result.address_components.find((c) => c.types.includes(type))?.long_name || "";

      // Building up the "Complete Address" from every fine-grained component
      // (building → street → colony → neighborhood), skipping city/state/
      // pincode/country since those are captured separately below.
      const addressParts = [
        "subpremise", "premise", "route",
        "sublocality_level_2", "sublocality_level_1", "sublocality", "neighborhood",
      ]
        .map(component)
        .filter(Boolean);
      const uniqueAddressParts = [...new Set(addressParts)];

      return {
        pinCode: component("postal_code"),
        state: component("administrative_area_level_1"),
        city: component("locality") || component("administrative_area_level_2"),
        area: component("sublocality_level_1") || component("sublocality") || component("neighborhood"),
        address: uniqueAddressParts.join(", ") || result.formatted_address,
      };
    } catch (error) {
      console.log("[ReverseGeocoding] Failed:", error?.message);
      return null;
    }
  };

  // ── Manual "use my current location" — matches web's fetchCurrentLocation ──
  const handleFetchCurrentLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Needed",
          "Allow location access in your device settings to use this feature."
        );
        return;
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Location request timed out")), 16000)
      );
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        timeoutPromise,
      ]);

      const { latitude, longitude } = position.coords;
      setAddressForm((prev) => ({
        ...prev,
        latitude: String(latitude),
        longitude: String(longitude),
      }));

      const reverseGeocoded = await reverseGeocodeLocation(latitude, longitude);
      if (reverseGeocoded) {
        setAddressForm((prev) => ({
          ...prev,
          pinCode: reverseGeocoded.pinCode || prev.pinCode,
          state: reverseGeocoded.state || prev.state,
          city: reverseGeocoded.city || prev.city,
          area: reverseGeocoded.area || prev.area,
          address: reverseGeocoded.address || prev.address,
        }));
      }
    } catch (error) {
      Alert.alert(
        "Couldn't Get Location",
        error?.message === "Location request timed out"
          ? "Location request timed out. Check your device location settings and try again."
          : "Your current location is unavailable. Check your device location settings."
      );
    } finally {
      setFetchingLocation(false);
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
      // Geocode as a last resort if the field-level triggers never got coordinates
      // (e.g. user typed everything before the pincode lookup finished).
      let { latitude, longitude } = addressForm;
      if (!latitude || !longitude) {
        try {
          const query = [addressForm.flatNo, addressForm.landMark, addressForm.address, addressForm.pinCode, addressForm.state]
            .filter(Boolean).join(", ");
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`
          );
          const data = await res.json();
          if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
            latitude = String(data.results[0].geometry.location.lat);
            longitude = String(data.results[0].geometry.location.lng);
          }
        } catch (err) {
          console.log("[Geocoding] Failed on save:", err?.message);
        }
      }

      const payload = {
        userId: Number(userId),
        flatNo: addressForm.flatNo,
        landMark: addressForm.landMark,
        address: addressForm.address,
        state: addressForm.state,
        city: addressForm.city,
        area: addressForm.area,
        // camelCase, matching the web app's payload to this same endpoint —
        // sending lowercase "pincode" here was the bug: the backend doesn't
        // recognize it, so the pincode silently failed to save on update.
        pinCode: addressForm.pinCode,
        type: addressForm.type,
        latitude: latitude || "",
        longitude: longitude || "",
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
        latitude: "",
        longitude: "",
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
      latitude: address.latitude || "",
      longitude: address.longitude || "",
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
      latitude: "",
      longitude: "",
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
        <PgLoader label="Loading addresses..." />
      </PgLayout>
    );
  }

  return (
    <PgLayout title="My Addresses" showBack onBack={() => navigation.goBack()}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <FadeSlideIn>
          {addresses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color={C.textTer} />
              <Text style={styles.emptyText}>No addresses yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first address to get started
              </Text>
            </View>
          ) : (
            <>
              <SectionHeader title={`${addresses.length} SAVED ADDRESS${addresses.length > 1 ? "ES" : ""}`} />
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
            </>
          )}

          <TouchableOpacity style={styles.addBtn} onPress={handleAddNewAddress} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add New Address</Text>
          </TouchableOpacity>
        </FadeSlideIn>
      </ScrollView>

      {/* Address Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
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
              keyboardShouldPersistTaps="handled"
            >
              {/* Use current location — shown first so it can auto-fill the
                  fields below instead of being buried after them. */}
              <Text style={styles.gpsIntroText}>
                Use your current location to auto-fill your address
              </Text>
              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={handleFetchCurrentLocation}
                disabled={fetchingLocation}
                activeOpacity={0.75}
              >
                {fetchingLocation ? (
                  <ActivityIndicator size="small" color={C.textPri} />
                ) : (
                  <Ionicons name="navigate-outline" size={15} color={C.textPri} />
                )}
                <Text style={styles.gpsBtnText}>
                  {fetchingLocation ? "Fetching..." : "Use my current GPS location instead"}
                </Text>
              </TouchableOpacity>

              <View style={styles.orDivider}>
                <View style={styles.orDividerLine} />
                <Text style={styles.orDividerText}>OR ENTER MANUALLY</Text>
                <View style={styles.orDividerLine} />
              </View>

              {/* 1–2. State + PIN Code, side by side */}
              <View style={styles.fieldRow}>
                <View style={[styles.fieldContainer, styles.fieldHalf]}>
                  <Text style={styles.fieldLabel}>State *</Text>
                  <TouchableOpacity
                    style={[styles.dropdownBtn, errors.state && styles.fieldError]}
                    onPress={() => setShowStateDropdown(true)}
                  >
                    <Text style={[styles.dropdownBtnText, !addressForm.state && styles.dropdownPlaceholder]} numberOfLines={1}>
                      {addressForm.state || "Select"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={C.textTer} />
                  </TouchableOpacity>
                  {errors.state && (
                    <Text style={styles.errorText}>{errors.state}</Text>
                  )}
                </View>

                <View style={[styles.fieldContainer, styles.fieldHalf]}>
                  <Text style={styles.fieldLabel}>PIN Code *</Text>
                  <View style={styles.pincodeRow}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1 }, errors.pinCode && styles.fieldError]}
                      placeholder="500001"
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
                      <ActivityIndicator size="small" color={C.gold} style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  {errors.pinCode && (
                    <Text style={styles.errorText}>{errors.pinCode}</Text>
                  )}
                </View>
              </View>
              {pincodeLoading && (
                <Text style={[styles.infoText, { marginTop: -10, marginBottom: 12 }]}>Fetching city and area...</Text>
              )}

              {/* 3–4. City + Area, side by side (both auto-filled from pincode) */}
              <View style={styles.fieldRow}>
                <View style={[styles.fieldContainer, styles.fieldHalf]}>
                  <Text style={styles.fieldLabel}>City *</Text>
                  <TextInput
                    style={[styles.fieldInput, addressForm.city && styles.fieldInputAutoFilled, errors.city && styles.fieldError]}
                    placeholder="Auto-filled"
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

                <View style={[styles.fieldContainer, styles.fieldHalf]}>
                  <Text style={styles.fieldLabel}>Area *</Text>
                  <TextInput
                    style={[styles.fieldInput, addressForm.area && styles.fieldInputAutoFilled, errors.area && styles.fieldError]}
                    placeholder="Auto-filled"
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
              </View>

              {/* 5–6. Flat/House Number + Landmark, side by side */}
              <View style={styles.fieldRow}>
                <View style={[styles.fieldContainer, styles.fieldHalf]}>
                  <Text style={styles.fieldLabel}>Flat / House No. *</Text>
                  <TextInput
                    style={[styles.fieldInput, errors.flatNo && styles.fieldError]}
                    placeholder="e.g., 4B"
                    value={addressForm.flatNo}
                    onChangeText={(text) =>
                      setAddressForm({ ...addressForm, flatNo: text })
                    }
                    onBlur={() => geocodeAddress(addressForm)}
                    placeholderTextColor={C.textTer}
                  />
                  {errors.flatNo && (
                    <Text style={styles.errorText}>{errors.flatNo}</Text>
                  )}
                </View>

                <View style={[styles.fieldContainer, styles.fieldHalf]}>
                  <Text style={styles.fieldLabel}>Landmark *</Text>
                  <TextInput
                    style={[styles.fieldInput, errors.landMark && styles.fieldError]}
                    placeholder="e.g., Near City Mall"
                    value={addressForm.landMark}
                    onChangeText={(text) =>
                      setAddressForm({ ...addressForm, landMark: text })
                    }
                    onBlur={() => geocodeAddress(addressForm)}
                    placeholderTextColor={C.textTer}
                  />
                  {errors.landMark && (
                    <Text style={styles.errorText}>{errors.landMark}</Text>
                  )}
                </View>
              </View>

              {/* 7. Building Name / Street */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Building Name / Street *</Text>
                <TextInput
                  style={[styles.fieldInput, errors.address && styles.fieldError]}
                  placeholder="e.g., Sunshine Apartments, MG Road"
                  value={addressForm.address}
                  onChangeText={(text) =>
                    setAddressForm({ ...addressForm, address: text })
                  }
                  onBlur={() => geocodeAddress(addressForm)}
                  placeholderTextColor={C.textTer}
                />
                {errors.address && (
                  <Text style={styles.errorText}>{errors.address}</Text>
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

              {/* Location status — coordinates are geocoded from the typed address */}
              <View style={styles.locationStatusRow}>
                {geocoding ? (
                  <>
                    <ActivityIndicator size="small" color={C.gold} />
                    <Text style={styles.locationStatusText}>Locating address...</Text>
                  </>
                ) : addressForm.latitude && addressForm.longitude ? (
                  <>
                    <Ionicons name="checkmark-circle" size={14} color={C.success} />
                    <Text style={[styles.locationStatusText, { color: C.success }]}>
                      Location set: {Number(addressForm.latitude).toFixed(6)}, {Number(addressForm.longitude).toFixed(6)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="location-outline" size={14} color={C.textTer} />
                    <Text style={styles.locationStatusText}>
                      Location will be set automatically from your address
                    </Text>
                  </>
                )}
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
        </KeyboardAvoidingView>
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

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: C.textPri },

  addBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: C.gold,
    borderRadius: 22,
    height: 42,
    paddingHorizontal: 22,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  addBtnText: { fontSize: 13.5, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },

  addressesList: { gap: 12 },
  addressCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
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
  addressTypeText: { fontSize: 11, fontWeight: "700", color: C.textPri },
  addressActions: { flexDirection: "row", gap: 8 },
  iconBtn: { padding: 6 },
  addressBody: { flexDirection: "row", gap: 8 },
  addressLine1: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPri,
    lineHeight: 19,
    marginBottom: 2,
  },
  addressLine2: { fontSize: 12.5, color: C.textSec, lineHeight: 18 },
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
  modalTitle: { fontSize: 18, fontWeight: "700", color: C.textPri },
  closeBtn: { padding: 8, marginRight: -8 },
  modalScroll: { paddingHorizontal: 16, paddingVertical: 16, flexShrink: 1 },

  fieldContainer: { marginBottom: 16 },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldHalf: { flex: 1 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSec,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPri,
    minHeight: 48,
  },
  fieldError: { borderColor: C.error },
  textArea: { minHeight: 80, textAlignVertical: "top" },

  errorText: { fontSize: 12, color: C.error, marginTop: 4 },
  infoText: { fontSize: 12, color: C.textSec, marginTop: 4, fontWeight: "600" },

  typeSelector: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: C.goldDim, borderColor: C.gold },
  typeBtnText: { fontSize: 13, fontWeight: "600", color: C.textSec },
  typeBtnTextActive: { color: C.textPri, fontWeight: "700" },

  locationStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: -4 },
  locationStatusText: { fontSize: 11.5, color: C.textTer, fontWeight: "500" },

  gpsIntroText: {
    fontSize: 12.5, color: C.textSec, fontWeight: "500",
    textAlign: "center", marginBottom: 10,
  },
  gpsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: C.goldDimBorder, backgroundColor: C.goldDim,
    borderRadius: 12, paddingVertical: 13, marginBottom: 4,
  },
  gpsBtnText: { fontSize: 13, fontWeight: "700", color: C.gold },

  orDivider: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 18, marginBottom: 18,
  },
  orDividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  orDividerText: { fontSize: 10.5, fontWeight: "700", color: C.textTer, letterSpacing: 0.5 },

  confirmBtn: {
    backgroundColor: C.gold,
    borderRadius: 12,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  confirmBtnDisabled: { backgroundColor: C.border },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },

  dropdownBtn: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
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
    borderColor: C.goldDimBorder,
  },
});

export default PgAddressScreen;
