import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PaymentSuccessScreen = ({ navigation, route }) => {
  const { transactionId, amount, grams, orderId, certificateUrl } = route.params || {};
  
  console.log('[PaymentSuccess] Route params:', route.params);
  console.log('[PaymentSuccess] transactionId:', transactionId);
  console.log('[PaymentSuccess] amount:', amount);
  console.log('[PaymentSuccess] grams:', grams);
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = currentDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const liveGoldRate = amount && grams ? Math.round((amount / grams) * 100) / 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.content}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.successContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={60} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Success Message */}
        <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
          <Text style={styles.successTitle}>Gold Purchased! </Text>
          <Text style={styles.successSubtitle}>
            Your digital gold has been added to your portfolio
          </Text>
        </Animated.View>

        {/* Purchase Summary */}
        <Animated.View style={[styles.summaryCard, { opacity: fadeAnim }]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Transaction ID</Text>
            <Text style={styles.summaryValue}>{transactionId || '—'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date & Time</Text>
            <View style={styles.summaryValueContainer}>
              <Text style={styles.summaryValue}>{formattedDate}</Text>
              <Text style={styles.summaryTime}>{formattedTime}</Text>
            </View>
          </View>

             <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gold Weight Purchased</Text>
            <Text style={styles.goldWeight}>{grams ? Number(grams).toFixed(4) : '0'} grams</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Live Gold Rate</Text>
            <Text style={styles.goldRate}>₹{liveGoldRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}/gram</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={styles.amountPaid}>₹{amount ? Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}</Text>
          </View>
        </Animated.View>

        {/* Security Message */}
        <Animated.View style={[styles.securityCard, { opacity: fadeAnim }]}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <Text style={styles.securityText}>
            Your gold is safely stored in secure, insured vaults
          </Text>
        </Animated.View>
      </View>

      {/* Action Buttons */}
      <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            Alert.alert('Download Receipt', 'Receipt download feature coming soon');
          }}
        >
          <Ionicons name="download-outline" size={18} color="#D4AF37" />
          <Text style={styles.secondaryButtonText}>Download Receipt</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successContainer: {
    marginBottom: 32,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  summaryValueContainer: {
    alignItems: 'flex-end',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  summaryTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    marginTop: 2,
  },
  goldWeight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37',
  },
  amountPaid: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  goldRate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 40,
  },
  securityText: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#464B8B',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PaymentSuccessScreen;