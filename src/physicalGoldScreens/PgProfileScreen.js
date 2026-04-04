import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { selectUserId, selectUserEmail, clearAuth } from '../store/authSlice';
import PgLayout from '../../components/physical/PgLayout';

const C = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  border: '#E8E3D8',
  gold: '#B8891A',
  goldLight: '#D4A82A',
  textPri: '#1A1508',
  textSec: '#6B6050',
  textTer: '#A89880',
  error: '#C0392B',
};

const API_BASE = 'http://65.0.147.157:9900';



const PgProfileScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const userId = useSelector(selectUserId);
  const userEmail = useSelector(selectUserEmail);
  const accessToken = route?.params?.accessToken;

  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    if (!userId) return;
    const startTime = Date.now();
    try {
      setLoading(true);
      console.log('[Profile Fetch] userId:', userId);
      
      const response = await fetch(`${API_BASE}/api/auth/getUserBasedOnUserId?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
        },
      });
      
      const data = await response.json();
      console.log('[Profile Response]', data);
      
      const profileData = data?.data?.body || data?.data || data || {};
      setProfile(profileData);
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
        mobileNumber: profileData.mobileNumber || '',
        alterMobileNumber: profileData.alterMobileNumber || '',
        whatsappNumber: profileData.whatsappNumber || '',
      });

      // Fetch wallet separately
      try {
        const walletRes = await fetch(`${API_BASE}/api/wallet/balance?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
          },
        });
        const walletData = await walletRes.json();
        console.log('[Wallet Response]', walletData);
        setWallet(walletData?.data?.balance || walletData?.balance || 0);
      } catch (e) {
        console.log('[Wallet Error]', e.message);
      }
    } catch (e) {
      console.log('[Profile Error]', e.message);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        userId: Number(userId),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        alternativeNumber: formData.alterMobileNumber,
        whatsappNumber: formData.whatsappNumber,
      };

      console.log('[SaveProfile Payload]', JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/api/auth/saveUserProfile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[SaveProfile Status]', response.status);
      const responseData = await response.json();
      console.log('[SaveProfile Response]', responseData);

      if (response.ok) {
        // Update AsyncStorage
        const user = JSON.parse(await AsyncStorage.getItem('user') || '{}');
        user.data = user.data || {};
        user.data.body = { ...user.data.body, ...formData };
        await AsyncStorage.setItem('user', JSON.stringify(user));

        setProfile(formData);
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', responseData?.message || 'Failed to update profile');
      }
    } catch (e) {
      console.log('[SaveProfile Error]', e);
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            const user = JSON.parse(await AsyncStorage.getItem('user') || '{}');
            console.log('[Logout] refreshToken:', user.refreshToken ? 'present' : 'missing');
            
            await fetch(`${API_BASE}/api/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken || ''}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken: user.refreshToken || '' }),
            });
          } catch (e) {
            console.log('[Logout Error]', e.message);
          }
          await AsyncStorage.removeItem('user');
          dispatch(clearAuth());
          navigation.replace('Login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <PgLayout title="My Profile" showBack={true} onBack={() => navigation.goBack()} hideLogo={true}>
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </PgLayout>
    );
  }

  return (
    <PgLayout title="My Profile" showBack={true} onBack={() => navigation.goBack()} hideLogo={true}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={70} color="#fff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{profile?.firstName || 'User'}</Text>
            <Text style={styles.userEmail}>{userEmail || 'user@example.com'}</Text>
            <Text style={styles.userId}>ID: {userId}</Text>
          </View>
        </View>

        {/* Wallet Card */}
        <TouchableOpacity 
          style={styles.walletCard}
          onPress={() => navigation.navigate('PgWallet', { userId })}
          activeOpacity={0.8}
        >
          <View style={styles.walletIcon}>
            <Ionicons name="wallet" size={24} color="#fff" />
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmount}>₹{Number(wallet).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.walletBtn}>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {/* Row 1: First Name & Last Name */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <TextInput
                style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
                value={formData.firstName || ''}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                editable={editing}
                placeholderTextColor={C.textTer}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput
                style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
                value={formData.lastName || ''}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                editable={editing}
                placeholderTextColor={C.textTer}
              />
            </View>
          </View>

          {/* Row 2: Primary Mobile & Email */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Primary Mobile</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputDisabled]}
                value={formData.mobileNumber || ''}
                editable={false}
                placeholderTextColor={C.textTer}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
                value={formData.email || ''}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                editable={editing}
                placeholderTextColor={C.textTer}
              />
            </View>
          </View>

          {/* Row 3: WhatsApp Number */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>WhatsApp Number</Text>
            <TextInput
              style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
              value={formData.whatsappNumber || ''}
              onChangeText={(text) => setFormData({ ...formData, whatsappNumber: text })}
              editable={editing}
              placeholderTextColor={C.textTer}
            />
          </View>

          {editing && (
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => navigation.navigate('PgOrders', { userId })}
          >
            <Ionicons name="receipt-outline" size={20} color={C.gold} />
            <Text style={styles.linkText}>My Orders</Text>
            <Ionicons name="chevron-forward" size={20} color={C.textTer} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => navigation.navigate('PgAddress', { userId, accessToken })}
          >
            <Ionicons name="location-outline" size={20} color={C.gold} />
            <Text style={styles.linkText}>Addresses</Text>
            <Ionicons name="chevron-forward" size={20} color={C.textTer} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => navigation.navigate('PgWallet', { userId })}
          >
            <Ionicons name="wallet-outline" size={20} color={C.gold} />
            <Text style={styles.linkText}>Wallet & Transactions</Text>
            <Ionicons name="chevron-forward" size={20} color={C.textTer} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem}>
            <Ionicons name="help-circle-outline" size={20} color={C.gold} />
            <Text style={styles.linkText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={C.textTer} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem}>
            <Ionicons name="document-text-outline" size={20} color={C.gold} />
            <Text style={styles.linkText}>Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={20} color={C.textTer} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={C.error} />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 14, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#2a4e9e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a4e9e',
  },
  avatar: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 3 },
  userId: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.gold,
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    gap: 14,
  },
  walletIcon: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  walletInfo: { flex: 1 },
  walletLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4, fontWeight: '600' },
  walletAmount: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  walletBtn: { 
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  section: { marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.textPri, letterSpacing: -0.3 },
  editBtn: { fontSize: 12, fontWeight: '700', color: C.gold, paddingHorizontal: 8, paddingVertical: 4 },

  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  fieldHalf: { flex: 1 },
  fieldContainer: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.textSec, marginBottom: 6 },
  fieldInput: { 
    backgroundColor: C.surface, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: C.border, 
    paddingHorizontal: 12, 
    paddingVertical: 11, 
    fontSize: 13, 
    color: C.textPri, 
    minHeight: 44 
  },
  fieldInputDisabled: { backgroundColor: '#F0EEE9', color: C.textTer },

  saveBtn: { 
    backgroundColor: C.gold, 
    borderRadius: 10, 
    paddingVertical: 13, 
    alignItems: 'center', 
    marginTop: 14,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 0,
    paddingVertical: 13,
    marginBottom: 4,
  },
  linkText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textPri },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 22,
    marginBottom: 20,
  },
  logoutBtnText: { fontSize: 14, fontWeight: '700', color: C.error, letterSpacing: 0.2 },
});

export default PgProfileScreen;
