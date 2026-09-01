import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import PgLayout from '../components/PgLayout';
import { getOrderDetails } from './physicalGoldApi';
import { selectUserId } from '../../store/authSlice';

const PgPaymentStatusScreen = ({ navigation, route }) => {
  const [status, setStatus] = useState('LOADING'); // LOADING, SUCCESS, FAILED
  const [orderDetails, setOrderDetails] = useState(null);
  const userId = useSelector(selectUserId);

  const {
    orderId,
    orderNumber,
    txnId,
    totalAmount,
  } = route?.params || {};

  // Cash on Delivery is the only payment mode — there's no payment gateway
  // transaction to verify, the order is placed the moment it's created.
  // Just confirm the order exists and show success.
  useEffect(() => {
    confirmOrderPlaced();
  }, []);

  const confirmOrderPlaced = async () => {
    try {
      if (orderId) {
        const data = await getOrderDetails(orderId);
        console.log('[PaymentStatus] Order details:', data);
        setOrderDetails(data);
      }
      setStatus('SUCCESS');
    } catch (error) {
      // Even if the details fetch fails, the order was already created
      // successfully by Checkout before navigating here — still show success.
      console.log('[PaymentStatus] Order details fetch failed:', error.message);
      setStatus('SUCCESS');
    }
  };

  const handleTrackOrder = () => {
    navigation.navigate('PgOrders', { userId });
  };

  const handleContinueShopping = () => {
    navigation.navigate('PgHome', { userId });
  };

  const handleRetry = () => {
    navigation.navigate('PgCart', { userId });
  };

  if (status === 'LOADING') {
    return (
      <PgLayout title="Order Status" showBack={false}>
        <View style={styles.container}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#1C1C1E" />
            <Text style={styles.loadingText}>Confirming Order...</Text>
            <Text style={styles.loadingSubtext}>Please wait a moment</Text>
          </View>
        </View>
      </PgLayout>
    );
  }

  if (status === 'SUCCESS') {
    return (
      <PgLayout title="Order Confirmed" showBack={false}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Success Icon */}
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color="#2ECC71" />
            </View>
            <Text style={styles.successTitle}>Order Confirmed!</Text>
            <Text style={styles.successSubtitle}>Your order has been placed successfully</Text>
          </View>

          {/* Order Details */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Number</Text>
              <Text style={styles.detailValue}>{String(orderNumber || '')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{String(txnId || '')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Amount</Text>
              <Text style={styles.detailValue}>₹{String(totalAmount?.toLocaleString('en-IN') || '0')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={[styles.detailValue, styles.statusSuccess]}>Cash on Delivery</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleTrackOrder}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Track My Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleContinueShopping}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      </PgLayout>
    );
  }

  if (status === 'FAILED') {
    return (
      <PgLayout title="Payment Failed" showBack={false}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Failed Icon */}
          <View style={styles.failedContainer}>
            <View style={styles.failedIcon}>
              <Ionicons name="close" size={40} color="#C85A54" />
            </View>
            <Text style={styles.failedTitle}>Payment Failed</Text>
            <Text style={styles.failedSubtitle}>Unable to process your payment</Text>
          </View>

          {/* Error Details */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Number</Text>
              <Text style={styles.detailValue}>{String(orderNumber || '')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Amount</Text>
              <Text style={styles.detailValue}>₹{String(totalAmount?.toLocaleString('en-IN') || '0')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Status</Text>
              <Text style={[styles.detailValue, styles.statusFailed]}>FAILED</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleRetry}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleContinueShopping}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Go Back Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </PgLayout>
    );
  }
};

const C = {
  bg: '#F8F7F6',
  surface: '#FFFFFF',
  border: '#E7E0DA',
  gold: '#CF8B17',
  textPri: '#1C1C1E',
  textSec: '#7A7A80',
  textTer: '#A79C93',
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 24, paddingHorizontal: 16 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  loadingContent: { alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '700', color: C.textPri },
  loadingSubtext: { fontSize: 13, color: C.textSec, textAlign: 'center' },

  successContainer: { alignItems: 'center', marginVertical: 32, gap: 12 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmark: { fontSize: 40, color: '#2ECC71', fontWeight: '800' },
  successTitle: { fontSize: 22, fontWeight: '800', color: C.textPri },
  successSubtitle: { fontSize: 14, color: C.textSec, textAlign: 'center' },

  failedContainer: { alignItems: 'center', marginVertical: 32, gap: 12 },
  failedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDECEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  xmark: { fontSize: 40, color: '#C85A54', fontWeight: '800' },
  failedTitle: { fontSize: 22, fontWeight: '800', color: C.textPri },
  failedSubtitle: { fontSize: 14, color: C.textSec, textAlign: 'center' },

  detailsBox: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, color: C.textSec, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '700', color: C.textPri, flex: 1, textAlign: 'right', marginLeft: 12 },
  statusSuccess: { color: '#2ECC71' },
  statusFailed: { color: '#C85A54' },
  divider: { height: 1, backgroundColor: C.border },

  primaryBtn: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1C1C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  secondaryBtn: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { color: C.textPri, fontSize: 15, fontWeight: '800' },
});

export default PgPaymentStatusScreen;
