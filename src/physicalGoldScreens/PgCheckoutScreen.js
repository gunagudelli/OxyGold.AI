/**
 * Physical Gold Checkout Screen
 * Single screen with: Profile check + Address selection + Payment mode + Order creation
 * Production-ready with Redux tokens and physicalGoldApi
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { selectUserId, selectAccessToken } from '../store/authSlice';
import PgLayout from '../../components/physical/PgLayout';
import {
  getUserProfile,
  getUserAddresses,
  getWalletBalance,
  createOrder,
  confirmOrder,
} from './physicalGoldApi';


const C = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EDE6',
  border: '#E8E3D8',
  gold: '#B8891A',
  goldLight: '#D4A82A',
  goldBright: '#F0CC5A',
  goldDim: 'rgba(184,137,26,0.10)',
  goldDimBorder: 'rgba(184,137,26,0.22)',
  heroBase: '#1A1200',
  heroBorder: 'rgba(212,175,55,0.30)',
  heroText: '#F5EDD0',
  purple: '#2b0a59',
  textPri: '#1A1508',
  textSec: '#6B6050',
  textTer: '#A89880',
  error: '#C0392B',
  success: '#1A7A4A',
};

const PgCheckoutScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);
  const accessToken = useSelector(selectAccessToken);
  const { cartTotal, cartItems } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMode, setPaymentMode] = useState('CASHFREE');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletExists, setWalletExists] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  // Reload data every time screen is focused (e.g. after returning from profile)
  useFocusEffect(
    useCallback(() => {
      loadCheckoutData();
    }, [userId])
  );

  const loadCheckoutData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Run all 3 in parallel
      const [profileRes, addrRes, walletRes] = await Promise.allSettled([
        getUserProfile(userId),
        getUserAddresses(userId),
        getWalletBalance(userId),
      ]);

      // Profile check
      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value?.body ||
                  profileRes.value?.data?.body ||
                  profileRes.value?.data ||
                  profileRes.value;
        setProfileComplete(!!p?.firstName);
      }

      // Addresses
      if (addrRes.status === 'fulfilled') {
        const list = (addrRes.value || []).map(a => ({
          id: String(a.id),
          type: a.type || 'Home',
          flatNo: a.flatNo || '',
          landMark: a.landMark || '',
          address: a.address || '',
          pinCode: a.pinCode || '',
          state: a.state || '',
        }));
        setAddresses(list);
        if (list.length > 0) setSelectedAddressId(list[0].id);
      }

      // Wallet
      if (walletRes.status === 'fulfilled') {
        setWalletBalance(walletRes.value?.balance || 0);
        setWalletExists(true);
      }

    } catch (err) {
      console.error('[Checkout] loadCheckoutData error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    // 1. Check token
    if (!accessToken) {
      Alert.alert('Session Expired', 'Please login again', [
        { text: 'OK', onPress: () => navigation.replace('Login') }
      ]);
      return;
    }

    // 2. Check profile
    if (!profileComplete) {
      Alert.alert(
        'Complete Your Profile',
        'Please add your name before placing an order.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Profile',
            onPress: () => navigation.navigate('PgProfile'),
          },
        ]
      );
      return;
    }

    // 3. Check address
    if (!selectedAddressId) {
      Alert.alert('Select Address', 'Please select a delivery address');
      return;
    }

    // 4. Check cart items
    if (!cartItems || cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items to cart first.', [
        { text: 'OK', onPress: () => navigation.navigate('PgCart') }
      ]);
      return;
    }

    // 5. Check wallet if selected
    if (paymentMode === 'WALLET' && walletBalance < cartTotal) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet balance ₹${walletBalance} is less than ₹${cartTotal}. Please use Online Payment.`,
        [
          { text: 'Use Online Payment', onPress: () => setPaymentMode('CASHFREE') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    // 6. Show confirmation popup
    Alert.alert(
      'Confirm Order',
      `Are you sure you want to place this order?\n\nTotal Amount: ₹${Number(cartTotal || 0).toLocaleString('en-IN')}\nPayment: ${paymentMode}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm Order',
          onPress: () => processOrder(),
        },
      ]
    );
  };

  const processOrder = async () => {
    setCheckoutLoading(true);
    try {
      // 1. Create order
      console.log('[Checkout] Creating order...');
      const orderPayload = {
        userId: Number(userId),
        addressId: Number(selectedAddressId),
        notes: 'Physical Gold Order',
        paymentMode,
        returnUrl: `https://app.oxygold.com/physical-gold/payment-status`,
      };
      console.log('[CreateOrder Payload]', orderPayload);

      const orderRes = await createOrder(orderPayload);
      console.log('[CreateOrder Response]', orderRes);

      if (!orderRes) throw new Error('Failed to create order');

      const orderId = orderRes?.orderId || orderRes?.id;
      const orderNumber = orderRes?.orderNumber;
      const txnId = orderRes?.txnId;
      const paymentSessionId = orderRes?.paymentSessionId;
      const totalAmount = orderRes?.totalAmount;

      // 2. Confirm order
      console.log('[Checkout] Confirming order:', orderId);
      const confirmRes = await confirmOrder(orderId);
      console.log('[ConfirmOrder Response]', confirmRes);
      
      // 3. Navigate to payment handler
      if (paymentMode === 'CASHFREE') {
        // For Cashfree, use payment handler to open Cashfree SDK
        navigation.navigate('PgPaymentHandler', {
          orderId,
          orderNumber,
          txnId,
          paymentSessionId,
          totalAmount,
          paymentMode,
        });
      } else {
        // For Wallet, go directly to status screen
        navigation.navigate('PgPaymentStatus', {
          orderId,
          orderNumber,
          txnId,
          paymentMode,
          totalAmount,
        });
      }

    } catch (err) {
      console.error('[Checkout Error]', err.message);
      
      let errorMessage = err.message || 'Please try again';
      
      // Specific error messages
      if (err.message === 'Resource not found.') {
        errorMessage = 'Unable to create order. Your cart may be empty. Please add items to cart and try again.';
      } else if (err.message === 'SESSION_EXPIRED') {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
        return;
      }
      
      Alert.alert('Checkout Failed', errorMessage);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <PgLayout title="Checkout" showBack onBack={() => navigation.goBack()}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </PgLayout>
    );
  }

  return (
    <PgLayout title="Checkout" showBack onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Profile Warning */}
        {!profileComplete && (
          <TouchableOpacity
            style={styles.warningBox}
            onPress={() => navigation.navigate('PgProfile')}
          >
            <Ionicons name="warning" size={16} color="#D97706" />
            <Text style={styles.warningText}>
              Profile incomplete. Tap to complete your profile.
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PgProfile', { tab: 'address' })}
            >
              <Text style={styles.manageText}>+ Manage</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyBox}
              onPress={() => navigation.navigate('PgProfile', { tab: 'address' })}
            >
              <Ionicons name="location-outline" size={20} color={C.textTer} />
              <Text style={styles.emptyBoxText}>No addresses found. Add one →</Text>
            </TouchableOpacity>
          ) : (
            addresses.map(addr => (
              <TouchableOpacity
                key={addr.id}
                style={[
                  styles.addressCard,
                  selectedAddressId === addr.id && styles.addressCardSelected,
                ]}
                onPress={() => setSelectedAddressId(addr.id)}
              >
                <View style={styles.addressRow}>
                  <View style={[
                    styles.addrIcon,
                    selectedAddressId === addr.id && styles.addrIconSelected,
                  ]}>
                    <Ionicons
                      name="location"
                      size={14}
                      color={selectedAddressId === addr.id ? '#fff' : C.textTer}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <Text style={[
                        styles.addrType,
                        selectedAddressId === addr.id && { color: C.gold },
                      ]}>
                        {addr.type}
                      </Text>
                      {selectedAddressId === addr.id && (
                        <Ionicons name="checkmark-circle" size={13} color={C.success} />
                      )}
                    </View>
                    <Text style={styles.addrText} numberOfLines={2}>{addr.address}</Text>
                    <Text style={styles.addrSub}>
                      {[addr.landMark, addr.flatNo].filter(Boolean).join(', ')}
                    </Text>
                    <Text style={styles.addrPin}>{addr.state} — {addr.pinCode}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Payment Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentRow}>

            {/* WALLET — only if wallet exists */}
            {walletExists && (
              <TouchableOpacity
                style={[
                  styles.payCard,
                  paymentMode === 'WALLET' && styles.payCardSelected,
                ]}
                onPress={() => setPaymentMode('WALLET')}
              >
                <Ionicons
                  name="wallet"
                  size={20}
                  color={paymentMode === 'WALLET' ? C.gold : C.textTer}
                />
                <Text style={[
                  styles.payLabel,
                  paymentMode === 'WALLET' && styles.payLabelSelected,
                ]}>Wallet</Text>
                <Text style={[
                  styles.paySub,
                  walletBalance >= cartTotal ? { color: C.success } : { color: C.error },
                ]}>
                  ₹{Number(walletBalance).toLocaleString('en-IN')}
                </Text>
                <View style={[styles.radio, paymentMode === 'WALLET' && styles.radioSelected]}>
                  {paymentMode === 'WALLET' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            )}

            {/* CASHFREE */}
            <TouchableOpacity
              style={[
                styles.payCard,
                paymentMode === 'CASHFREE' && styles.payCardSelected,
                !walletExists && { flex: 1 },
              ]}
              onPress={() => setPaymentMode('CASHFREE')}
            >
              <Ionicons
                name="card"
                size={20}
                color={paymentMode === 'CASHFREE' ? C.gold : C.textTer}
              />
              <Text style={[
                styles.payLabel,
                paymentMode === 'CASHFREE' && styles.payLabelSelected,
              ]}>Online Payment</Text>
              <Text style={styles.paySub}>UPI / Cards / Net Banking</Text>
              <View style={[styles.radio, paymentMode === 'CASHFREE' && styles.radioSelected]}>
                {paymentMode === 'CASHFREE' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Insufficient wallet warning */}
          {paymentMode === 'WALLET' && walletBalance < cartTotal && (
            <View style={styles.insufficientBox}>
              <Ionicons name="warning" size={14} color="#D97706" />
              <Text style={styles.insufficientText}>
                Insufficient balance. Switch to Online Payment.
              </Text>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>{cartItems?.length || 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment</Text>
              <Text style={styles.summaryValue}>{paymentMode}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>
                ₹{Number(cartTotal || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payBtn,
            (checkoutLoading || !selectedAddressId || !profileComplete) && styles.payBtnDisabled,
          ]}
          onPress={handlePay}
          disabled={checkoutLoading || !selectedAddressId || !profileComplete}
        >
          {checkoutLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.payBtnText}>
                Pay ₹{Number(cartTotal || 0).toLocaleString('en-IN')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.textSec, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 100 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: { flex: 1, fontSize: 12, color: '#D97706', fontWeight: '700', lineHeight: 18 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: C.textPri,
    letterSpacing: -0.3,
  },
  manageText: { fontSize: 13, fontWeight: '800', color: C.gold },

  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
  },
  emptyBoxText: { fontSize: 13, color: C.textTer, fontWeight: '600' },

  addressCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: 16,
    marginBottom: 10,
  },
  addressCardSelected: {
    borderColor: C.gold,
    borderWidth: 1.5,
    backgroundColor: '#FFFBF0',
  },
  addressRow: { flexDirection: 'row', gap: 12 },
  addrIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  addrIconSelected: { backgroundColor: C.gold, borderColor: C.gold },
  addrType: {
    fontSize: 11,
    fontWeight: '900',
    color: C.textTer,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  addrText: { fontSize: 13, fontWeight: '700', color: C.textPri, marginBottom: 4, lineHeight: 18 },
  addrSub: { fontSize: 11, color: C.textSec, marginBottom: 3 },
  addrPin: { fontSize: 10, fontWeight: '700', color: C.textTer, textTransform: 'uppercase', letterSpacing: 0.5 },

  paymentRow: { flexDirection: 'row', gap: 10 },
  payCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: 14,
    alignItems: 'center',
    gap: 5,
  },
  payCardSelected: {
    borderColor: C.gold,
    borderWidth: 1.5,
    backgroundColor: '#FFFBF0',
  },
  payLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textPri,
  },
  payLabelSelected: { color: C.gold },
  paySub: { fontSize: 10, color: C.textTer, fontWeight: '500' },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  radioSelected: { borderColor: C.gold },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  insufficientBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  insufficientText: { fontSize: 11, color: '#D97706', fontWeight: '700', flex: 1, lineHeight: 16 },

  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    overflow: 'hidden',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: C.textSec, fontWeight: '600' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: C.textPri },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 14,
    marginTop: 6,
    marginBottom: 0,
  },
  totalLabel: { fontSize: 15, fontWeight: '900', color: C.textPri },
  totalValue: { fontSize: 20, fontWeight: '900', color: C.gold, letterSpacing: -0.5 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 16,
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: -0.2 },
});

export default PgCheckoutScreen;
