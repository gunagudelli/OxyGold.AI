/**
 * Physical Gold Payment Method Selection Screen
 * Allows user to choose between Wallet and UPI (Cashfree)
 * Production-ready with proper styling and error handling
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PgPaymentMethodScreen = ({ navigation, route }) => {
  const { userId, accessToken, cartTotal, cartItems } = route?.params || {};
  const [selectedMethod, setSelectedMethod] = useState('CASHFREE');
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    {
      id: 'CASHFREE',
      name: 'UPI Payment',
      description: 'Pay using UPI via Cashfree',
      icon: 'phone-portrait-outline',
      color: '#4F46E5',
      badge: 'Recommended',
    },
    {
      id: 'WALLET',
      name: 'Digital Wallet',
      description: 'Use your wallet balance',
      icon: 'wallet-outline',
      color: '#2ECC71',
      badge: null,
    },
  ];

  const handleContinue = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setLoading(true);
    try {
      console.log('[PaymentMethod] Selected method:', selectedMethod);
      console.log('[PaymentMethod] Proceeding to checkout');

      // Navigate to checkout with selected payment method
      navigation.navigate('PgCheckout', {
        userId,
        accessToken,
        cartTotal,
        cartItems,
        paymentMode: selectedMethod,
      });
    } catch (error) {
      console.error('[PaymentMethod] Error:', error);
      Alert.alert('Error', 'Failed to proceed. Please try again.');
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
          <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Total</Text>
            <Text style={styles.summaryValue}>₹{cartTotal?.toLocaleString('en-IN') || '0'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{cartItems?.length || 0}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsContainer}>
          <Text style={styles.methodsTitle}>Select Payment Method</Text>
          
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardActive,
              ]}
              onPress={() => setSelectedMethod(method.id)}
              activeOpacity={0.7}
            >
              {/* Left Section - Icon & Text */}
              <View style={styles.methodLeft}>
                <View
                  style={[
                    styles.methodIcon,
                    { backgroundColor: method.color + '15' },
                  ]}
                >
                  <Ionicons name={method.icon} size={24} color={method.color} />
                </View>
                
                <View style={styles.methodTextContainer}>
                  <View style={styles.methodNameRow}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    {method.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{method.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
              </View>

              {/* Right Section - Radio Button */}
              <View
                style={[
                  styles.radioButton,
                  selectedMethod === method.id && styles.radioButtonActive,
                ]}
              >
                {selectedMethod === method.id && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#CF8B17" />
          <Text style={styles.infoText}>
            Your payment is secure and encrypted. We accept all major payment methods.
          </Text>
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={18} color="#2ECC71" />
          <Text style={styles.securityText}>256-bit SSL encrypted • 100% secure</Text>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.continueBtnText}>Continue to Checkout</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7F6' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E0DA',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },

  content: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100 },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E7E0DA',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 13, color: '#7A7A80', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },

  methodsContainer: { marginBottom: 24 },
  methodsTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 14 },

  methodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E7E0DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodCardActive: {
    borderColor: '#CF8B17',
    backgroundColor: '#F7F4ED',
  },

  methodLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  methodTextContainer: { flex: 1 },
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  methodName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  badge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: '#2ECC71', fontWeight: '600' },
  methodDescription: { fontSize: 12, color: '#7A7A80' },

  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E7E0DA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#CF8B17',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CF8B17',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4ED',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  infoText: { fontSize: 12, color: '#7A7A80', flex: 1, lineHeight: 16 },

  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2ECC71',
    padding: 12,
    borderRadius: 8,
  },
  securityText: { fontSize: 12, color: '#2ECC71', marginLeft: 8, fontWeight: '500' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E7E0DA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  continueBtn: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export default PgPaymentMethodScreen;
