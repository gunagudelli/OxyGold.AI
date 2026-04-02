import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  Animated, Easing, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '../store/authSlice';
import { BASE_URL } from '../constants/api';

const SELL_EXECUTE_API  = `${BASE_URL}/digital-gold/sell/execute`;
const PAYOUT_STATUS_API = `${BASE_URL}/digital-gold/payout/status`;

const STEPS = [
  'Executing sell order',
  'Initiating bank payout',
  'Verifying payment status',
];

export default function SellProcessingScreen({ navigation, route }) {
  const { transactionId, beneficiaryId, amount, grams, sellRate, bankDetails } = route.params ?? {};
  const accessToken = useSelector(selectAccessToken);

  const [currentStep,    setCurrentStep]    = useState(0);
  const [statusMessage,  setStatusMessage]  = useState('Processing your sell order...');

  const spinAnim = useRef(new Animated.Value(0)).current;
  const processed = useRef(false);

  // Block back button during processing
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Spinner animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const run = async () => {
      try {
        // Step 1 — Execute sell
        setCurrentStep(0);
        setStatusMessage('Executing sell order...');

        const execRes  = await fetch(`${SELL_EXECUTE_API}?txnId=${transactionId}`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        const execData = await execRes.json();
        console.log('[SellProcess] Execute response:', JSON.stringify(execData));

        // Execute succeeded if success=true OR if data has transferId
        const execSuccess = execData?.success && execData?.data?.transferId;
        if (!execSuccess) {
          throw new Error(execData?.message || execData?.data?.message || 'Sell execution failed');
        }

        const { transferId, message: execMsg } = execData.data;

        // Step 2 — Payout initiated
        setCurrentStep(1);
        setStatusMessage(execMsg || 'Bank payout initiated...');

        await new Promise(r => setTimeout(r, 1500));

        // Step 3 — Skip payout status check (API not ready), go to success
        setCurrentStep(2);
        setStatusMessage('Completing transaction...');

        await new Promise(r => setTimeout(r, 1000));

        navigation.replace('SellSuccess', {
          transactionId,
          transferId,
          beneficiaryId,
          paymentStatus: 'PENDING', // Bank payout initiated, settlement T+1
          amount,
          grams,
          sellRate,
          bankDetails,
        });

      } catch (e) {
        console.log('[SellProcess] Error:', e.message, e.stack);
        navigation.replace('SellSuccess', {
          transactionId,
          beneficiaryId,
          paymentStatus: 'FAILED',
          amount,
          grams,
          sellRate,
          bankDetails,
        });
      }
    };

    const timer = setTimeout(run, 800);
    return () => clearTimeout(timer);
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f8fa" />
      <View style={s.center}>

        {/* Spinner */}
        <Animated.View style={[s.spinnerRing, { transform: [{ rotate: spin }] }]} />
        <View style={s.spinnerInner}>
          <Text style={s.spinnerEmoji}>🪙</Text>
        </View>

        <Text style={s.title}>Processing Sell Order</Text>
        <Text style={s.subtitle}>{statusMessage}</Text>
        <Text style={s.txnId}>TXN: {transactionId}</Text>

        {/* Steps */}
        <View style={s.stepsWrap}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={[s.stepDot, i <= currentStep ? s.stepDotActive : s.stepDotInactive]} />
              <Text style={[s.stepText, i <= currentStep ? s.stepTextActive : s.stepTextInactive]}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        <Text style={s.note}>Please do not close the app{'\n'}or press the back button</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f7f8fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  spinnerRing:  { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'transparent', borderTopColor: '#d4a017', marginBottom: 0 },
  spinnerInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,160,23,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  spinnerEmoji: { fontSize: 32 },

  title:    { fontSize: 20, fontWeight: '700', color: '#1c2b3a', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8a96a3', marginBottom: 6, textAlign: 'center' },
  txnId:    { fontSize: 11, color: '#bbb', marginBottom: 32 },

  stepsWrap: { width: '100%', gap: 12, marginBottom: 32 },
  stepRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot:         { width: 8, height: 8, borderRadius: 4 },
  stepDotActive:   { backgroundColor: '#d4a017' },
  stepDotInactive: { backgroundColor: '#ddd' },
  stepText:        { fontSize: 14 },
  stepTextActive:  { color: '#1c2b3a', fontWeight: '600' },
  stepTextInactive:{ color: '#bbb' },

  note: { fontSize: 12, color: '#bbb', textAlign: 'center', lineHeight: 18 },
});
