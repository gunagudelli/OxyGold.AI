import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectUserId } from '../store/authSlice';
import { executeBuy,checkWebhookStatus } from '../services/goldApi';
import { CFPaymentGatewayService } from "react-native-cashfree-pg-sdk";
import { CFEnvironment, CFSession } from "cashfree-pg-api-contract";

const Row = ({ label, value, bold, gold }) => (
  <View style={s.row}>
    <Text style={[s.rowLabel, bold && s.rowBold]}>{label}</Text>
    <Text style={[s.rowValue, bold && s.rowBold, gold && s.rowGold]}>{value}</Text>
  </View>
);

const METHODS = [
  { id: 'UPI',    label: 'UPI',    sub: 'GPay, PhonePe, Paytm', icon: 'phone-portrait-outline', color: '#4F46E5' },
  { id: 'WALLET', label: 'Wallet', sub: 'Digital Gold Wallet',   icon: 'wallet-outline',         color: '#059669' },
];

const PaymentReviewScreen = ({ navigation, route }) => {
  const { preview, buyMode, goldRate } = route.params ?? {};

  // Guard: if navigated without params, go back
  if (!preview) {
    navigation.goBack();
    return null;
  }
  const userId = useSelector(selectUserId);

  const totalPayable = Number(preview.finalAmount || preview.amount || 0);
  const grams        = Number(preview.grams || 0);
  const pergramPrice = Number(preview.pergramBuyingPrice || goldRate || 0);
  const gst          = Number(preview.fees?.gst || Math.round(totalPayable * 0.03 * 100) / 100);
  const goldValue    = Math.round((totalPayable - gst) * 100) / 100;
  const platformFee  = Number(preview.fees?.platformFee || 0);

  const [timeLeft,  setTimeLeft]  = useState(preview?.lockDuration || 300);
  const [method,    setMethod]    = useState('UPI');
  const [loading,   setLoading]   = useState(false);
  const timerRef = useRef(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          Alert.alert('Price Expired', 'The locked price has expired. Please start a new order.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const mins    = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs    = String(timeLeft % 60).padStart(2, '0');
  const lockPct = (timeLeft / (preview?.lockDuration || 300)) * 100;

  const handlePay = async () => {
    setLoading(true);
    try {
      const purchaseType = buyMode === 'rupees' ? 'AMOUNT' : 'GRAMS';
      const isUPI        = method === 'UPI';
      const paymentMode  = isUPI ? 'CASHFREE' : 'WALLET';

      const result = await executeBuy({
        userId, purchaseType,
        amount: totalPayable, 
        grams,
        pergramPrice, paymentMode,
        productId: 4,
      });

      console.log("Payment Result:", result);
      setResult(result);
      clearInterval(timerRef.current);
      
      if (paymentMode === 'WALLET') {
        // Wallet — immediate success
        navigation.replace('PaymentSuccess', {
          transactionId: result.orderId,
          amount:        totalPayable,
          grams:         result.grams || grams,
        });
      } else {
        // UPI — start payment flow
        if (!result.paymentSessionId) {
          throw new Error('No payment session received from server.');
        }
        startPayment(result.paymentSessionId, result.orderId || result.transactionId, result);
      }
    } catch (e) {
      Alert.alert('Payment Failed', e.message || 'Could not process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const callback = {
    onVerify:async (orderID) => {
      console.log("onVerify called with orderID:", orderID);
      // Payment verified by Cashfree — now go to processing to execute the transaction
     const data = await checkWebhookStatus(orderID);
     console.log("Webhook status response:", data);
     if(data.status == 'SUCCESS'){
        Alert.alert('Payment Successful', 'Your payment was successful and is being processed.');
          navigation.navigate('PaymentSuccess', {
          transactionId: data.transactionId,
          amount:        totalPayable,
          grams:          result.grams || grams,
        });
         return;
       }else{
        Alert.alert('Payment Failed', 'Payment could not be processed');
         setLoading(false);
       }
    
    },
    onError: (error, orderID) => {
      console.log("onError:", error?.getMessage?.(), "OrderID:", orderID);
      Alert.alert('Payment Failed', error?.getMessage?.() || 'Payment could not be processed');
      setLoading(false);
    },
  };

  const startPayment = (paymentSessionId, order_id, paymentResult) => {
    console.log("Starting payment with session ID:", paymentSessionId);
    try {
      let session = new CFSession(
        paymentSessionId,
        order_id,
        CFEnvironment.SANDBOX
      );
      console.log("Session", JSON.stringify(session));
      CFPaymentGatewayService.setCallback(callback);
      CFPaymentGatewayService.doWebPayment(session);
    } catch (e) {
      console.log("error in cashfree", e.message);
      Alert.alert('Payment Error', e.message);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Order Summary</Text>
        <View style={s.headerRight}>
          <Ionicons name="lock-closed" size={18} color="#10B981" />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Price Lock Banner */}
        <View style={s.lockBanner}>
          <View style={s.lockTop}>
            <View style={s.lockLeft}>
              <Text style={s.lockIcon}>🔒</Text>
              <View>
                <Text style={s.lockTitle}>Price Locked</Text>
                <Text style={s.lockSub}>Complete payment before expiry</Text>
              </View>
            </View>
            <Text style={s.lockTimer}>{mins}:{secs}</Text>
          </View>
          <View style={s.lockBarBg}>
            <View style={[s.lockBarFill, { width: `${lockPct}%`, backgroundColor: lockPct > 40 ? '#f0bb3a' : '#ef4444' }]} />
          </View>
        </View>

        {/* Order Details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🪙 Purchase Details</Text>
          <Row label="Gold Weight"   value={`${grams.toFixed(6)} grams`} gold />
          <Row label="Rate per gram" value={`₹${pergramPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
          <Row label="Gold Value"    value={`₹${goldValue.toFixed(2)}`} />
          <Row label="GST (3%)"      value={`₹${gst.toFixed(2)}`} />
          {platformFee > 0 && <Row label="Platform Fee" value={`₹${platformFee.toFixed(2)}`} />}
          <View style={s.divider} />
          <Row label="Total Payable" value={`₹${totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} bold gold />
        </View>

        {/* Gold Specs */}
        <View style={s.card}>
          <Text style={s.cardTitle}>✦ Gold Specifications</Text>
          <Row label="Purity"        value="999.9 Pure 24K" />
          <Row label="Certification" value="BIS Hallmarked" />
          <Row label="Storage"       value="Mumbai Secure Vault" />
          <Row label="Insurance"     value="100% Covered" />
        </View>

        {/* Payment Method */}
        <View style={s.card}>
          <Text style={s.cardTitle}>💳 Payment Method</Text>
          {METHODS.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[s.methodRow, method === m.id && s.methodRowActive]}
              onPress={() => setMethod(m.id)}
              activeOpacity={0.75}
            >
              <View style={[s.methodIcon, { backgroundColor: m.color + '18' }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <View style={s.methodText}>
                <Text style={s.methodLabel}>{m.label}</Text>
                <Text style={s.methodSub}>{m.sub}</Text>
              </View>
              {m.id === 'UPI' && (
                <View style={s.badge}><Text style={s.badgeText}>Recommended</Text></View>
              )}
              <View style={[s.radio, method === m.id && s.radioActive]}>
                {method === m.id && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security */}
        <View style={s.secRow}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={s.secText}>256-bit SSL encrypted · 100% secure · Instant confirmation</Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.payBtn, loading && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={loading || timeLeft === 0}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#0d1f3c" size="small" />
            : <Text style={s.payBtnText}>Pay ₹{totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f7f8fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#464B8B', justifyContent: 'center', alignItems: 'center' },
  backBtnText: { fontSize: 18, color: '#464B8B', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#464B8B' },
  headerRight: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  lockBanner: { backgroundColor: '#0d1f3c', borderRadius: 12, padding: 16, marginBottom: 16 },
  lockTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  lockLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockIcon:   { fontSize: 22 },
  lockTitle:  { fontSize: 14, fontWeight: '700', color: '#f0bb3a' },
  lockSub:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  lockTimer:  { fontSize: 24, fontWeight: '800', color: '#f0bb3a', fontVariant: ['tabular-nums'] },
  lockBarBg:  { height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' },
  lockBarFill:{ height: '100%', borderRadius: 2 },

  card:      { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#f0f0f0' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 14 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowLabel:  { fontSize: 14, color: '#666' },
  rowValue:  { fontSize: 14, fontWeight: '500', color: '#333' },
  rowBold:   { fontWeight: '700', fontSize: 16 },
  rowGold:   { color: '#D4AF37' },
  divider:   { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },

  methodRow:       { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef', marginBottom: 10, backgroundColor: '#fafafa' },
  methodRowActive: { borderColor: '#D4AF37', backgroundColor: '#fffef7' },
  methodIcon:      { width: 38, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  methodText:      { flex: 1 },
  methodLabel:     { fontSize: 14, fontWeight: '600', color: '#333' },
  methodSub:       { fontSize: 11, color: '#999', marginTop: 2 },
  badge:           { backgroundColor: '#f0fdf4', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 },
  badgeText:       { fontSize: 10, color: '#10B981', fontWeight: '600' },
  radio:           { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  radioActive:     { borderColor: '#D4AF37' },
  radioDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4AF37' },

  secRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#10B981' },
  secText: { fontSize: 12, color: '#10B981', flex: 1 },

  footer:        { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cancelBtn:     { flex: 1, paddingVertical: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#666' },
  payBtn:        { flex: 2, paddingVertical: 15, borderRadius: 10, backgroundColor: '#f0bb3a', alignItems: 'center' },
  payBtnDisabled:{ opacity: 0.55 },
  payBtnText:    { fontSize: 15, fontWeight: '700', color: '#0d1f3c' },
});

export default PaymentReviewScreen;
