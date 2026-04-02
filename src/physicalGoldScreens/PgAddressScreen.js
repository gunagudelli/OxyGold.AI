import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PgLayout from '../../components/physical/PgLayout';

const C = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  border: '#E8E3D8',
  gold: '#B8891A',
  goldLight: '#D4A82A',
  goldDim: 'rgba(184,137,26,0.10)',
  goldDimBorder: 'rgba(184,137,26,0.22)',
  textPri: '#1A1508',
  textSec: '#6B6050',
  textTer: '#A89880',
  error: '#C0392B',
  success: '#1A7A4A',
};

const API_BASE = 'http://65.0.147.157:9900';

const AddressCard = ({ address, onEdit, onDelete }) => (
  <View style={styles.addressCard}>
    <View style={styles.addressHeader}>
      <View style={styles.addressTypeBadge}>
        <Text style={styles.addressTypeText}>{address.type || 'Home'}</Text>
      </View>
      <View style={styles.addressActions}>
        <TouchableOpacity onPress={() => onEdit(address)} style={styles.iconBtn}>
          <Ionicons name="pencil" size={18} color={C.gold} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(address.id)} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={18} color={C.error} />
        </TouchableOpacity>
      </View>
    </View>
    <Text style={styles.addressText}>{address.flatNo}</Text>
    <Text style={styles.addressText}>{address.address}</Text>
    <Text style={styles.addressText}>{address.landMark}</Text>
    <View style={styles.addressFooter}>
      <Text style={styles.addressMeta}>{address.state} - {address.pinCode}</Text>
    </View>
  </View>
);

const PgAddressScreen = ({ navigation, route }) => {
  const userId = route?.params?.userId;
  const accessToken = route?.params?.accessToken;

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addressForm, setAddressForm] = useState({
    flatNo: '',
    landMark: '',
    address: '',
    state: '',
    pinCode: '',
    type: 'Home',
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    if (!userId) return;
    const startTime = Date.now();
    try {
      setLoading(true);
      console.log('[Addresses Fetch] userId:', userId);

      const response = await fetch(`${API_BASE}/api/auth/addresses/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
        },
      });

      const data = await response.json();
      console.log('[Addresses Response]', data);

      const addressList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setAddresses(addressList);
    } catch (e) {
      console.log('[Addresses Error]', e.message);
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!addressForm.flatNo.trim()) newErrors.flatNo = 'Flat / house number is required';
    if (!addressForm.landMark.trim()) newErrors.landMark = 'Landmark is required';
    if (!addressForm.address.trim()) newErrors.address = 'Complete address is required';
    if (!addressForm.state.trim()) newErrors.state = 'State is required';
    if (!addressForm.pinCode.trim()) newErrors.pinCode = 'PIN code is required';
    if (addressForm.pinCode.length > 6) newErrors.pinCode = 'PIN code must be 6 digits or less';
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
        pinCode: addressForm.pinCode,
        type: addressForm.type,
      };

      if (addressForm.latitude) payload.latitude = addressForm.latitude;
      if (addressForm.longitude) payload.longitude = addressForm.longitude;

      if (editingAddress?.id) {
        payload.id = editingAddress.id;
      }

      const method = editingAddress?.id ? 'PUT' : 'PATCH';
      console.log(`[${method} Address Payload]`, JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/auth/addAddress`, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log(`[${method} Address Status]`, response.status);
      const responseData = await response.json();
      console.log(`[${method} Address Response]`, responseData);

      if (response.ok) {
        Alert.alert('Success', editingAddress?.id ? 'Address updated' : 'Address added');
        setShowModal(false);
        setEditingAddress(null);
        setAddressForm({
          flatNo: '',
          landMark: '',
          address: '',
          state: '',
          pinCode: '',
          type: 'Home',
          latitude: '',
          longitude: '',
        });
        setErrors({});
        fetchAddresses();
      } else {
        Alert.alert('Error', responseData?.message || 'Failed to save address');
      }
    } catch (e) {
      console.log('[SaveAddress Error]', e);
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = (addressId) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            console.log('[DeleteAddress] addressId:', addressId);

            const response = await fetch(`${API_BASE}/api/auth/addresses/${addressId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken || ''}`,
              },
            });

            console.log('[DeleteAddress Status]', response.status);

            if (response.ok) {
              Alert.alert('Success', 'Address deleted');
              fetchAddresses();
            } else {
              Alert.alert('Error', 'Failed to delete address');
            }
          } catch (e) {
            console.log('[DeleteAddress Error]', e);
            Alert.alert('Error', e.message);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      flatNo: address.flatNo || '',
      landMark: address.landMark || '',
      address: address.address || '',
      state: address.state || '',
      pinCode: address.pinCode || '',
      type: address.type || 'Home',
      latitude: address.latitude || '',
      longitude: address.longitude || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      flatNo: '',
      landMark: '',
      address: '',
      state: '',
      pinCode: '',
      type: 'Home',
      latitude: '',
      longitude: '',
    });
    setErrors({});
    setShowModal(true);
  };

  if (loading) {
    return (
      <PgLayout title="My Addresses" showBack onBack={() => navigation.goBack()}>
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </PgLayout>
    );
  }

  return (
    <PgLayout title="My Addresses" showBack onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddNewAddress}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>

        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color={C.textTer} />
            <Text style={styles.emptyText}>No addresses yet</Text>
            <Text style={styles.emptySubtext}>Add your first address to get started</Text>
          </View>
        ) : (
          <View style={styles.addressesList}>
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Address Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Update Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={C.textPri} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Flat / House Number *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., 4B"
                  value={addressForm.flatNo}
                  onChangeText={(text) => setAddressForm({ ...addressForm, flatNo: text })}
                  placeholderTextColor={C.textTer}
                />
                {errors.flatNo && <Text style={styles.errorText}>{errors.flatNo}</Text>}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Landmark *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Near park"
                  value={addressForm.landMark}
                  onChangeText={(text) => setAddressForm({ ...addressForm, landMark: text })}
                  placeholderTextColor={C.textTer}
                />
                {errors.landMark && <Text style={styles.errorText}>{errors.landMark}</Text>}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Complete Address *</Text>
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  placeholder="Street, area, city"
                  value={addressForm.address}
                  onChangeText={(text) => setAddressForm({ ...addressForm, address: text })}
                  placeholderTextColor={C.textTer}
                  multiline
                  numberOfLines={3}
                />
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>State *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Telangana"
                  value={addressForm.state}
                  onChangeText={(text) => setAddressForm({ ...addressForm, state: text })}
                  placeholderTextColor={C.textTer}
                />
                {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>PIN Code *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., 500001"
                  value={addressForm.pinCode}
                  onChangeText={(text) => setAddressForm({ ...addressForm, pinCode: text })}
                  placeholderTextColor={C.textTer}
                  maxLength={6}
                />
                {errors.pinCode && <Text style={styles.errorText}>{errors.pinCode}</Text>}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Address Type</Text>
                <View style={styles.typeSelector}>
                  {['Home', 'Work', 'Other'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeBtn, addressForm.type === type && styles.typeBtnActive]}
                      onPress={() => setAddressForm({ ...addressForm, type })}
                    >
                      <Text style={[styles.typeBtnText, addressForm.type === type && styles.typeBtnTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Latitude (Optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., 17.3850"
                  value={addressForm.latitude}
                  onChangeText={(text) => setAddressForm({ ...addressForm, latitude: text })}
                  placeholderTextColor={C.textTer}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Longitude (Optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., 78.4867"
                  value={addressForm.longitude}
                  onChangeText={(text) => setAddressForm({ ...addressForm, longitude: text })}
                  placeholderTextColor={C.textTer}
                />
              </View>

              {addressForm.latitude && addressForm.longitude && (
                <View style={styles.gpsInfo}>
                  <Ionicons name="checkmark-circle" size={18} color={C.success} />
                  <Text style={styles.gpsLinked}>✓ GPS Coordinates Set</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
                onPress={handleSaveAddress}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {editingAddress ? 'Update Address' : 'Add Address'}
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
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 100 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, marginBottom: 20, shadowColor: '#B8891A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  addBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  addressesList: { gap: 14 },
  addressCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addressTypeBadge: { backgroundColor: C.goldDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.goldDimBorder },
  addressTypeText: { fontSize: 11, fontWeight: '700', color: C.gold },
  addressActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  addressText: { fontSize: 13, color: C.textPri, marginBottom: 4, fontWeight: '500' },
  addressFooter: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  addressMeta: { fontSize: 12, color: C.textTer },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: C.textPri, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: C.textTer, marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPri },
  modalScroll: { paddingHorizontal: 16, paddingVertical: 16 },

  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 8 },
  fieldInput: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textPri, minHeight: 48 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  errorText: { fontSize: 12, color: C.error, marginTop: 4 },

  typeSelector: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: C.goldDim, borderColor: C.gold },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: C.textSec },
  typeBtnTextActive: { color: C.gold, fontWeight: '800' },

  gpsInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDFBF3', borderRadius: 10, padding: 12, marginBottom: 16, gap: 10, borderWidth: 1, borderColor: '#A3E6C4' },
  gpsLinked: { fontSize: 13, fontWeight: '700', color: C.success },

  confirmBtn: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20, shadowColor: '#B8891A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

export default PgAddressScreen;
