import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, Dimensions,
  KeyboardAvoidingView, Platform, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setTokens } from '../store/authSlice';
import { persistTokens } from '../services/apiClient';
import { API_AUTH } from '../constants/api';

const { width: W } = Dimensions.get('window');

const API = API_AUTH;

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0d1f3c',
  card:     '#f7f8fa',
  gold:     '#f0bb3a',
  goldDark: '#d9a020',
  navy:     '#0d1f3c',
  white:    '#ffffff',
  label:    '#9eaab8',
  border:   '#e0e4e8',
  inputBg:  '#ffffff',
  prefixBg: '#f4f5f7',
  success:  '#16a34a',
  successBg:'#f0fdf4',
  successBd:'#bbf7d0',
  error:    '#dc2626',
  errorBg:  '#fef2f2',
  muted:    '#bcc5cf',
  text:     '#0d1f3c',
};

// ── Token Manager (AsyncStorage-based, mirrors your web TokenManager) ─────────
const TokenManager = {
  async setTokens({ accessToken, refreshToken, expiresIn, userId, tokenType }) {
    await AsyncStorage.setItem('auth_tokens', JSON.stringify({
      accessToken, refreshToken, expiresIn, userId,
      tokenType: tokenType || 'Bearer',
      storedAt: Date.now(),
    }));
  },
  async getTokens() {
    const raw = await AsyncStorage.getItem('auth_tokens');
    return raw ? JSON.parse(raw) : null;
  },
  async getAccessToken() {
    const t = await this.getTokens();
    return t?.accessToken || null;
  },
  async getUserId() {
    const t = await this.getTokens();
    return t?.userId || null;
  },
  async isLoggedIn() {
    const t = await this.getTokens();
    return !!(t?.accessToken);
  },
  async clear() {
    await AsyncStorage.removeItem('auth_tokens');
    await AsyncStorage.removeItem('user');
  },
};

export { TokenManager };

// ── Slide-in animation ────────────────────────────────────────────────────────
const useSlideIn = (trigger) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    opacity.setValue(0);
    translateX.setValue(16);
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [trigger]);
  return { opacity, transform: [{ translateX }] };
};

// ── OTP Box ───────────────────────────────────────────────────────────────────
const OtpBox = ({ value, inputRef, onChange, onKeyPress }) => (
  <TextInput
    ref={inputRef}
    style={[styles.otpBox, value ? styles.otpBoxFilled : null]}
    value={value}
    onChangeText={onChange}
    onKeyPress={onKeyPress}
    keyboardType="number-pad"
    maxLength={1}
    textAlign="center"
    selectTextOnFocus
  />
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const LoginScreen = ({ navigation, route }) => {
  const redirectTo = route?.params?.from || 'Dashboard';
  const dispatch   = useDispatch();

  const [step, setStep]               = useState('phone');
  const [phone, setPhone]             = useState('');
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [sessionId, setSessionId]     = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOtpSent, setShowOtpSent] = useState(false);

  const otpRefs = useRef([]);
  const anim    = useSlideIn(step);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          phoneNumber:      phone,
          registrationType: 'mobile',
          userType:         'Login',
          userRole:         'user',
          whatsappNumber:   '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to send OTP');
      setSessionId(data?.mobileOtpSessionId || data?.data?.mobileOtpSessionId || '');
      setShowOtpSent(true);
      setTimeout(() => setShowOtpSent(false), 3000);
      setStep('otp');
      setResendTimer(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setError('');
    const otpValue = otp.join('');
    if (otpValue.length < 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const res  = await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          phoneNumber:        phone,
          registrationType:   'mobile',
          userType:           'Login',
          mobileOtpSessionId: sessionId,
          mobileOtpValue:     otpValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Invalid OTP');

      // Dispatch tokens to Redux + persist to AsyncStorage
      if (data?.data?.accessToken) {
        const tokenPayload = {
          accessToken:  data.data.accessToken,
          refreshToken: data.data.refreshToken,
          expiresIn:    data.data.expiresIn,
          userId:       data.data.userId,
          tokenType:    data.data.tokenType || 'Bearer',
        };
        dispatch(setTokens(tokenPayload));
        await persistTokens(tokenPayload);
      } else {
        // Fallback for older API format
        const userId = data?.data?.userId || data?.userId || null;
        const tokenPayload = { accessToken: data?.token || data?.accessToken, userId };
        if (tokenPayload.accessToken) {
          dispatch(setTokens(tokenPayload));
          await persistTokens(tokenPayload);
        }
        await AsyncStorage.setItem('user', JSON.stringify({ phone, isLoggedIn: true, userId, ...data }));
      }

      setShowSuccess(true);
      setTimeout(() => navigation.replace('Dashboard'), 1500);
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP helpers ─────────────────────────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...otp];
    next[i]     = digit;
    setOtp(next);
    setError('');
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyPress = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleResend = () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    handleSendOtp();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.blob1} pointerEvents="none" />
          <View style={styles.blob2} pointerEvents="none" />

          <View style={styles.card}>

            {/* LEFT PANEL */}
            {W > 600 && (
              <View style={styles.leftPanel}>
                <Image
                  source={{ uri: 'https://img.freepik.com/premium-photo/gold-investment-outlook-illustration-gold-bars-stock-data-hologram_36897-5112.jpg' }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <View style={styles.leftOverlay} />
                <View style={styles.leftContent}>
                  <Text style={styles.logoName}>OXYGOLD.AI</Text>
                  <View>
                    <Text style={styles.tagline}>
                      Invest in{'\n'}<Text style={styles.taglineGold}>digital gold</Text>{'\n'}with confidence
                    </Text>
                    <Text style={styles.leftDesc}>
                      Secure, insured, and always at live market rates.
                    </Text>
                    <View style={styles.statsRow}>
                      {[['24K', 'Purity'], ['₹100', 'Min. Buy'], ['100%', 'Insured']].map(([v, l]) => (
                        <View key={l} style={styles.stat}>
                          <Text style={styles.statVal}>{v}</Text>
                          <Text style={styles.statLbl}>{l}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* RIGHT PANEL */}
            <View style={styles.rightPanel}>
              <Animated.View style={anim}>

                {step === 'phone' ? (
                  <>
                    <Text style={styles.formTitle}>Welcome back</Text>
                    <Text style={styles.formSub}>Sign in with your mobile number</Text>

                    <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                    <View style={styles.phoneWrap}>
                      <View style={styles.phonePrefix}>
                        <Text style={styles.phonePrefixText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        value={phone}
                        onChangeText={v => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                        keyboardType="number-pad"
                        placeholder="98765 43210"
                        placeholderTextColor={C.muted}
                        returnKeyType="done"
                        onSubmitEditing={handleSendOtp}
                        maxLength={10}
                      />
                    </View>

                    {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

                    <TouchableOpacity
                      style={[styles.btn, loading && styles.btnDisabled]}
                      onPress={handleSendOtp}
                      disabled={loading}
                      activeOpacity={0.85}>
                      {loading
                        ? <ActivityIndicator color={C.navy} size="small" />
                        : <Text style={styles.btnText}>Send OTP  →</Text>}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <Text style={styles.footerText}>
                      No account?{'  '}
                      <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
                        Create one
                      </Text>
                    </Text>

                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                      <Text style={styles.backBtnText}>← Back to home</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.formTitle}>Verify OTP</Text>
                    <Text style={styles.formSub}>Code sent to your mobile</Text>

                    {showOtpSent && (
                      <View style={styles.successBox}>
                        <View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View>
                        <Text style={styles.successText}>OTP sent to +91 {phone}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.changePhoneBtn}
                      onPress={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}>
                      <Text style={styles.changePhoneText}>← +91 {phone}</Text>
                    </TouchableOpacity>

                    <Text style={styles.fieldLabel}>ENTER 6-DIGIT OTP</Text>
                    <View style={styles.otpRow}>
                      {otp.map((d, i) => (
                        <OtpBox
                          key={i}
                          value={d}
                          inputRef={el => (otpRefs.current[i] = el)}
                          onChange={v => handleOtpChange(i, v)}
                          onKeyPress={e => handleOtpKeyPress(i, e)}
                        />
                      ))}
                    </View>

                    <Text style={styles.otpHint}>
                      Didn't receive it?{'  '}
                      {resendTimer > 0
                        ? <Text>Resend in <Text style={styles.otpHintBold}>{resendTimer}s</Text></Text>
                        : <Text style={styles.resendBtn} onPress={handleResend}>Resend OTP</Text>
                      }
                    </Text>

                    {showSuccess && (
                      <View style={styles.successBox}>
                        <View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View>
                        <Text style={styles.successText}>Login successful! Redirecting...</Text>
                      </View>
                    )}

                    {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

                    <TouchableOpacity
                      style={[styles.btn, (loading || otp.join('').length < 6 || showSuccess) && styles.btnDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={loading || otp.join('').length < 6 || showSuccess}
                      activeOpacity={0.85}>
                      {loading
                        ? <ActivityIndicator color={C.navy} size="small" />
                        : <Text style={styles.btnText}>{showSuccess ? 'Success!' : 'Verify & Sign In  →'}</Text>}
                    </TouchableOpacity>
                  </>
                )}

              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  blob1: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(42,78,158,0.22)', left: -120, top: '30%',
  },
  blob2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(240,187,58,0.06)', right: -60, top: '15%',
  },

  card: {
    width: '100%', maxWidth: 720, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(240,187,58,0.12)',
  },

  leftPanel:   { width: 280, backgroundColor: '#060f1e', overflow: 'hidden' },
  leftOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,15,30,0.65)' },
  leftContent: { flex: 1, justifyContent: 'space-between', padding: 28, zIndex: 2 },
  logoName:    { fontSize: 14, fontWeight: '700', color: C.gold, letterSpacing: 1 },
  tagline:     { fontSize: 22, fontWeight: '700', color: C.white, lineHeight: 28, marginBottom: 10 },
  taglineGold: { color: C.gold },
  leftDesc:    { fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 18, marginBottom: 20 },
  statsRow:    { flexDirection: 'row', gap: 18 },
  stat:        { gap: 2 },
  statVal:     { fontSize: 18, fontWeight: '700', color: C.gold },
  statLbl:     { fontSize: 9, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: 1 },

  rightPanel: { flex: 1, backgroundColor: C.card, padding: 32, justifyContent: 'center' },

  formTitle: { fontSize: 20, fontWeight: '700', color: C.navy, marginBottom: 4, letterSpacing: -0.3 },
  formSub:   { fontSize: 12, color: C.label, marginBottom: 22 },

  fieldLabel: {
    fontSize: 9, fontWeight: '600', color: C.label,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7,
  },

  phoneWrap:       {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 9, overflow: 'hidden',
    backgroundColor: C.inputBg, marginBottom: 14,
  },
  phonePrefix:     { paddingHorizontal: 12, paddingVertical: 11, backgroundColor: C.prefixBg, borderRightWidth: 1.5, borderRightColor: C.border },
  phonePrefixText: { fontSize: 13, fontWeight: '600', color: '#6b82a8' },
  phoneInput:      { flex: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.text },

  otpRow:       { flexDirection: 'row', gap: 7, marginBottom: 10 },
  otpBox:       {
    flex: 1, height: 46, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 9, fontSize: 18, fontWeight: '600', color: C.navy,
    backgroundColor: C.inputBg, textAlign: 'center',
  },
  otpBoxFilled: { borderColor: C.goldDark, backgroundColor: '#fffcf2' },
  otpHint:      { fontSize: 11, color: C.label, marginBottom: 14 },
  otpHintBold:  { fontWeight: '700', color: C.navy },
  resendBtn:    { color: C.goldDark, fontWeight: '600' },

  changePhoneBtn:  {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f2f5', borderWidth: 1, borderColor: '#e4e7eb',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 18,
  },
  changePhoneText: { fontSize: 11, color: '#6b82a8' },

  successBox:     {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successBg, borderWidth: 1, borderColor: C.successBd,
    borderRadius: 7, padding: 10, marginBottom: 12,
  },
  successIcon:     {
    width: 16, height: 16, borderRadius: 8, backgroundColor: C.success,
    alignItems: 'center', justifyContent: 'center',
  },
  successIconText: { color: C.white, fontSize: 9, fontWeight: '700' },
  successText:     { fontSize: 11, color: C.success, flex: 1 },

  errorBox:  {
    backgroundColor: C.errorBg, borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)',
    borderRadius: 7, padding: 10, marginBottom: 12,
  },
  errorText: { fontSize: 11, color: C.error },

  btn: {
    backgroundColor: C.gold, borderRadius: 9, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    shadowColor: C.goldDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText:     { fontSize: 13, fontWeight: '700', color: C.navy },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e8ecf0' },
  dividerText: { fontSize: 10, color: C.muted },

  footerText: { textAlign: 'center', fontSize: 12, color: C.label, marginBottom: 8 },
  link:       { color: C.goldDark, fontWeight: '600' },

  backBtn:     {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 9,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  backBtnText: { fontSize: 12, color: C.label },
});

export default LoginScreen;
