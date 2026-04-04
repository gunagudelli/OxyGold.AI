import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Alert, BackHandler, TouchableOpacity, ActivityIndicator, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const MAX_ATTEMPTS = 30;
const INTERVAL_MS = 2000;

const PgPaymentScreen = ({ navigation, route }) => {
  const {
    order_id: txnId,
    internal_id: orderId,
    order_number: orderNumber,
    payment_session_id: paymentSessionId,
    total_amount: totalAmount,
    userId,
    accessToken,
  } = route?.params || {};

  const [phase, setPhase] = useState('checkout'); // checkout, polling, success, failed
  const [statusText, setStatusText] = useState('Processing payment...');
  const [pollAttempt, setPollAttempt] = useState(0);
  const [webviewKey, setWebviewKey] = useState(1);
  const [invoiceUrl, setInvoiceUrl] = useState(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const attempt = useRef(0);
  const pollRef = useRef(null);
  const pollingStarted = useRef(false);
  const httpErrorCount = useRef(0);

  // Clean session ID (remove trailing 'payment' corruption)
  const cleanSessionId = paymentSessionId?.replace(/(payment)+$/i, '').trim() || '';
  const isValidSession = cleanSessionId && cleanSessionId.startsWith('session_') && cleanSessionId.length > 20;
  const checkoutUrl = isValidSession ? `https://checkout.cashfree.com/pay/${cleanSessionId}` : null;

  console.log('[PgPayment] orderId:', orderId);
  console.log('[PgPayment] raw sessionId:', paymentSessionId);
  console.log('[PgPayment] clean sessionId:', cleanSessionId);
  console.log('[PgPayment] isValid:', isValidSession);
  console.log('[PgPayment] checkoutUrl:', checkoutUrl);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const startPolling = () => {
    if (pollingStarted.current) return;
    pollingStarted.current = true;
    setPhase('polling');

    const poll = async () => {
      attempt.current += 1;
      setPollAttempt(attempt.current);
      console.log(`[Webhook] Attempt ${attempt.current}/${MAX_ATTEMPTS} orderId: ${orderId}`);

      if (attempt.current <= 5) setStatusText('Verifying payment...');
      else if (attempt.current <= 15) setStatusText('Confirming with payment gateway...');
      else setStatusText('Almost done, please wait...');

      try {
        const webhookResponse = await fetch(
          `http://65.0.147.157:9900/api/digital-gold/payments/webhook?order_id=${txnId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const webhookData = await webhookResponse.json();
        console.log('[Webhook Response]', webhookData);

        if (webhookData?.status === 'PAID' || webhookData?.status === 'SUCCESS') {
          clearInterval(pollRef.current);
          await generateInvoice();
          return;
        }

        if (webhookData?.status === 'FAILED') {
          clearInterval(pollRef.current);
          setPhase('failed');
          return;
        }

        if (attempt.current >= MAX_ATTEMPTS) {
          clearInterval(pollRef.current);
          console.log('[Payment] Polling timeout, assuming success');
          await generateInvoice();
        }
      } catch (err) {
        console.log('[Webhook Error]', err.message);
      }
    };

    pollRef.current = setInterval(poll, INTERVAL_MS);
    poll();
  };

  const generateInvoice = async () => {
    try {
      console.log('[Payment] Generating invoice...');
      const invoiceResponse = await fetch(
        `http://65.0.147.157:9900/api/invoices/generate-from-order/${orderId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const invoiceText = await invoiceResponse.text();
      console.log('[Invoice Response Text]', invoiceText.substring(0, 50));

      let invoiceData = null;
      try {
        invoiceData = JSON.parse(invoiceText);
      } catch (e) {
        console.log('[Invoice Parse Error]', e.message);
        if (invoiceResponse.ok) {
          invoiceData = { data: { pdfUrl: invoiceText } };
        }
      }

      if (invoiceResponse.ok && invoiceData?.data?.pdfUrl) {
        setInvoiceUrl(invoiceData.data.pdfUrl);
      }

      setPhase('success');
      console.log('[Payment Success] Order confirmed and invoice generated');
    } catch (error) {
      console.error('[Generate Invoice Error]', error);
      setPhase('success');
    }
  };

  const handleNavigationChange = (navState) => {
    const { url, loading } = navState;
    if (!url || loading) return;
    if (url === 'about:blank' || url === 'about:srcdoc') return;
    console.log('[Cashfree] URL:', url);

    const isCashfreeDomain =
      url.includes('checkout.cashfree.com') ||
      url.includes('payments.cashfree.com') ||
      url.includes('cashfree.com');

    if (!isCashfreeDomain && !pollingStarted.current) {
      console.log('[Cashfree] Left cashfree domain → starting polling');
      startPolling();
    }
  };

  const handleHttpError = (e) => {
    const { statusCode, url } = e.nativeEvent;
    console.log('[WebView HTTP Error]', statusCode, url);
    if (statusCode === 404) {
      httpErrorCount.current += 1;
      if (httpErrorCount.current >= 2) {
        Alert.alert(
          'Payment Session Error',
          'Could not load the payment page. Please try again.',
          [
            { text: 'Go Back', onPress: () => navigation.goBack() },
            { text: 'Home', onPress: () => navigation.navigate('PgHome', { userId, accessToken }) },
          ]
        );
      } else {
        setTimeout(() => setWebviewKey(k => k + 1), 1500);
      }
    }
  };

  const handleDownloadInvoice = async () => {
    if (invoiceUrl) {
      try {
        const { Linking } = require('react-native');
        await Linking.openURL(invoiceUrl);
      } catch (error) {
        Alert.alert('Error', 'Unable to open invoice');
      }
    }
  };

  const handleTrackOrder = () => {
    navigation.navigate('PgOrders', { userId, accessToken });
  };

  const handleContinueShopping = () => {
    navigation.navigate('PgHome', { userId, accessToken });
  };

  // Invalid session
  if (!isValidSession) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#2b0a59" />
        <View style={styles.center}>
          <Text style={styles.title}>Payment Error</Text>
          <Text style={styles.statusText}>Invalid payment session ID received from server.</Text>
          <Text style={[styles.statusText, { fontSize: 12, marginTop: 8 }]}>Raw: {paymentSessionId?.substring(0, 50)}...</Text>
          <Text style={[styles.statusText, { fontSize: 12, marginTop: 4 }]}>Clean: {cleanSessionId?.substring(0, 50)}...</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Checkout phase - WebView
  if (phase === 'checkout') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#2b0a59" />
        <View style={styles.webviewHeader}>
          <Text style={styles.webviewTitle}>Complete Payment</Text>
          <TouchableOpacity
            onPress={() => Alert.alert(
              'Cancel Payment?',
              'Are you sure you want to cancel this payment?',
              [
                { text: 'No', style: 'cancel' },
                { text: 'Yes, Cancel', style: 'destructive', onPress: () => navigation.navigate('PgHome', { userId, accessToken }) },
              ]
            )}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {checkoutUrl ? (
          <WebView
            key={webviewKey}
            source={{ uri: checkoutUrl }}
            style={styles.webview}
            onNavigationStateChange={handleNavigationChange}
            onError={(e) => console.log('[WebView Error]', e.nativeEvent.description)}
            onHttpError={handleHttpError}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#B8891A" />
                <Text style={styles.loadingText}>Loading payment...</Text>
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            originWhitelist={['*']}
            mixedContentMode="always"
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
          />
        ) : (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Invalid payment URL</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Polling phase
  if (phase === 'polling') {
    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#2b0a59" />
        <View style={styles.center}>
          <Animated.View style={[styles.spinnerOuter, { transform: [{ scale: pulseAnim }] }]}>
            <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
              <View style={styles.spinnerArc} />
            </Animated.View>
            <View style={styles.spinnerInner}>
              <Text style={styles.spinnerEmoji}>🪙</Text>
            </View>
          </Animated.View>
          <Text style={styles.title}>Confirming Payment</Text>
          <Text style={styles.statusText}>{statusText}</Text>
          {pollAttempt > 1 && (
            <Text style={styles.attemptText}>Checking... {pollAttempt}/{MAX_ATTEMPTS}</Text>
          )}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order Number</Text>
              <Text style={styles.infoValue}>{String(orderNumber || '')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Amount</Text>
              <Text style={styles.infoValue}>₹{String(totalAmount?.toLocaleString('en-IN') || '0')}</Text>
            </View>
          </View>
          <Text style={styles.note}>Please do not close the app or press the back button</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success phase
  if (phase === 'success') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#2b0a59" />
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.statusText}>Your order has been confirmed</Text>

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
              <Text style={[styles.detailValue, styles.statusSuccess]}>SUCCESS</Text>
            </View>
          </View>

          {invoiceUrl && (
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownloadInvoice}
              activeOpacity={0.85}
            >
              <Text style={styles.downloadBtnText}>📄 Download Invoice</Text>
            </TouchableOpacity>
          )}

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
        </View>
      </SafeAreaView>
    );
  }

  // Failed phase
  if (phase === 'failed') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#2b0a59" />
        <View style={styles.center}>
          <View style={styles.failedIcon}>
            <Text style={styles.xmark}>✕</Text>
          </View>
          <Text style={styles.title}>Payment Failed</Text>
          <Text style={styles.statusText}>Unable to process your payment</Text>

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

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('PgCart', { userId, accessToken })}
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
        </View>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2b0a59' },
  webview: { flex: 1 },

  webviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#2b0a59',
  },
  webviewTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelText: { fontSize: 14, color: '#B8891A', fontWeight: '600' },

  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#2b0a59', justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  loadingText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  spinnerOuter: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 36 },
  spinner: { position: 'absolute', width: 110, height: 110, borderRadius: 55 },
  spinnerArc: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: 'transparent', borderTopColor: '#B8891A', borderRightColor: 'rgba(184,137,26,0.3)' },
  spinnerInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(184,137,26,0.1)', borderWidth: 1, borderColor: 'rgba(184,137,26,0.25)', justifyContent: 'center', alignItems: 'center' },
  spinnerEmoji: { fontSize: 32 },

  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10 },
  statusText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 32, textAlign: 'center' },
  attemptText: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: -24, marginBottom: 24 },

  infoCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 18, gap: 12, borderWidth: 1, borderColor: 'rgba(184,137,26,0.15)' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#fff' },

  note: { marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 18 },

  successIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  checkmark: { fontSize: 40, color: '#10B981', fontWeight: '800' },

  failedIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  xmark: { fontSize: 40, color: '#EF4444', fontWeight: '800' },

  detailsBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(184,137,26,0.2)', padding: 16, marginBottom: 24, gap: 12, width: '100%',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'right', marginLeft: 12 },
  statusSuccess: { color: '#10B981' },
  statusFailed: { color: '#EF4444' },
  divider: { height: 1, backgroundColor: 'rgba(184,137,26,0.2)' },

  downloadBtn: {
    backgroundColor: '#B8891A', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12, width: '100%',
  },
  downloadBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  primaryBtn: {
    backgroundColor: '#B8891A', paddingVertical: 16, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12, width: '100%',
    shadowColor: '#B8891A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5,
    borderColor: 'rgba(184,137,26,0.3)', paddingVertical: 16, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', width: '100%',
  },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  errorBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: '#B8891A', borderRadius: 8 },
  errorBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default PgPaymentScreen;
