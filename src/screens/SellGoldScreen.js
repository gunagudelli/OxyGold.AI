import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGold } from '../context/GoldContext';

const SellGoldScreen = ({ navigation }) => {
  const { state } = useGold();
  const sellRate     = state.goldPrice?.sellPrice  || 16236;
  const lastUpdated  = state.goldPrice?.lastUpdated || null;
  const availableGold = state.portfolio?.totalGrams || 0;

  const [sellMode, setSellMode] = useState('rupees');
  const [amount, setAmount]     = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardOffset(event.endCoordinates.height);
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 200, animated: true });
        }
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardOffset(0));

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSell = () => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      Alert.alert('Enter Amount', 'Please enter a valid amount to proceed');
      return;
    }
    
    const numAmount = parseFloat(amount);
    
    if (sellMode === 'rupees' && numAmount < 100) {
      Alert.alert('Error', 'Minimum sell amount is ₹100');
      return;
    }
    
    const grams = sellMode === 'rupees' ? (numAmount / sellRate).toFixed(3) : numAmount.toFixed(3);
    
    if (parseFloat(grams) > availableGold) {
      Alert.alert('Error', 'Insufficient gold balance');
      return;
    }
    
    navigation.navigate('SellSummary', {
      amount: sellMode === 'rupees' ? numAmount : (numAmount * sellRate).toFixed(2),
      grams,
      sellRate,
      availableGold,
      lockedAt: new Date().toISOString()
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF', '#F8F9FA']}
        style={styles.backgroundGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sell Gold</Text>
          </View>
          <View style={styles.logoContainer}>
            <Ionicons name="logo-usd" size={24} color="#DAA520" />
          </View>
        </View>

      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardOffset > 0 ? keyboardOffset + 30 : 30 }]}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={['#2C2C54', '#40407A', '#464B8B']} style={styles.compactBanner}>
          <View style={styles.goldRateSection}>
            <Text style={styles.goldRateLabel}>Live Sell Price</Text>
            <View style={styles.rateRow}>
              <Text style={styles.goldRate}>₹{sellRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              <Text style={styles.perGramText}>/ gram</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.purityText}>24K Gold • 999.9 Purity Guaranteed{lastUpdated ? `  ·  ${lastUpdated}` : ''}</Text>
          </View>
          
          <View style={styles.portfolioSection}>
            <Text style={styles.portfolioLabel}>Available Balance</Text>
            <View style={styles.portfolioRow}>
              <View style={styles.portfolioLeft}>
                <Text style={styles.portfolioValue}>₹{(availableGold * sellRate).toLocaleString()}</Text>
                <Text style={styles.portfolioGrams}>{availableGold} grams owned</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.buySection}>
          <Text style={styles.buySectionTitle}>Sell Gold</Text>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleTab, sellMode === 'rupees' && styles.activeTab]}
              onPress={() => setSellMode('rupees')}
            >
              <Text style={[styles.toggleText, sellMode === 'rupees' && styles.activeToggleText]}>Sell in Rupees (₹)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleTab, sellMode === 'grams' && styles.activeTab]}
              onPress={() => setSellMode('grams')}
            >
              <Text style={[styles.toggleText, sellMode === 'grams' && styles.activeToggleText]}>Sell in Grams (g)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.amountInput}
              placeholder={sellMode === 'rupees' ? 'Enter amount in ₹' : 'Enter grams'}
              placeholderTextColor="#999"
              value={amount}
              onChangeText={(value) => {
                const numValue = parseFloat(value) || 0;
                if (sellMode === 'grams' && numValue > availableGold) return;
                if (sellMode === 'rupees' && numValue > availableGold * sellRate) return;
                setAmount(value);
              }}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            
            {amount && (
              <Text style={styles.equivalentText}>
                {sellMode === 'rupees' 
                  ? `≈ ${(parseFloat(amount) / sellRate).toFixed(3)} grams`
                  : `≈ ₹${(parseFloat(amount) * sellRate).toFixed(0)}`
                }
              </Text>
            )}
            
            <Text style={styles.helperText}>Based on live gold rate</Text>
            <Text style={styles.noteText}>Available: {availableGold}g (₹{(availableGold * sellRate).toLocaleString('en-IN', {maximumFractionDigits: 0})})</Text>
          </View>

          <View style={styles.chipContainer}>
            <TouchableOpacity style={styles.amountChip} onPress={() => setAmount(sellMode === 'rupees' ? (availableGold * sellRate * 0.25).toFixed(0) : (availableGold * 0.25).toFixed(3))}>
              <Text style={styles.chipText}>25%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.amountChip} onPress={() => setAmount(sellMode === 'rupees' ? (availableGold * sellRate * 0.5).toFixed(0) : (availableGold * 0.5).toFixed(3))}>
              <Text style={styles.chipText}>50%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.amountChip} onPress={() => setAmount(sellMode === 'rupees' ? (availableGold * sellRate).toFixed(0) : availableGold.toString())}>
              <Text style={styles.chipText}>All</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.buyButton} onPress={handleSell}>
            <View style={styles.buyButtonGradient}>
              <Text style={styles.buyButtonText}>Sell Gold</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertIcon}>
            <Text style={styles.alertEmoji}>💡</Text>
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Important Information</Text>
            <Text style={styles.alertSubtitle}>• Minimum sell: ₹100 • T+1 settlement • TDS applicable</Text>
          </View>
        </View>
      </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundGradient: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 20
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(218, 165, 32, 0.1)', justifyContent: 'center', alignItems: 'center' },
  backButton: { padding: 8 },
  backText: {
    fontSize: 24,
    color: '#464B8B',
    fontWeight: '600',
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#464B8B',
    marginLeft: 12
  },
  headerPlaceholder: {},
  scrollContent: { paddingBottom: 30 },
  compactBanner: { marginHorizontal: 20, marginTop: 20, marginBottom: 16, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  goldRateSection: { marginBottom: 20 },
  goldRateLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 8 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  goldRate: { fontSize: 20, fontWeight: '700', color: '#DAA520' },
  perGramText: { fontSize: 12, color: 'rgba(218, 165, 32, 0.8)' },
  purityText: { fontSize: 12, color: 'rgba(218, 165, 32, 0.8)' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C851', marginRight: 8 },
  liveText: { fontSize: 12, fontWeight: '600', color: '#00C851' },
  portfolioSection: { borderTopWidth: 1, borderTopColor: 'rgba(218, 165, 32, 0.3)', paddingTop: 20 },
  portfolioLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 12 },
  portfolioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portfolioLeft: { flex: 1 },
  portfolioValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  portfolioGrams: { fontSize: 14, color: 'rgba(218, 165, 32, 0.8)' },
  buySection: { marginHorizontal: 20, borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' },
  buySectionTitle: { fontSize: 20, fontWeight: '700', color: '#464B8B', marginBottom: 20 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#F5F5F5', borderRadius: 8, padding: 4, marginBottom: 20 },
  toggleTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: 14, color: '#666' },
  activeToggleText: { color: '#333', fontWeight: '600' },
  inputContainer: { marginBottom: 20 },
  amountInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 8 },
  equivalentText: { fontSize: 14, color: '#B8860B', marginBottom: 8, fontWeight: '600' },
  helperText: { fontSize: 12, color: '#666', marginBottom: 4 },
  noteText: { fontSize: 12, color: '#999' },
  chipContainer: { flexDirection: 'row', marginBottom: 20 },
  amountChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#DAA520', marginRight: 8 },
  chipText: { fontSize: 14, color: '#2C2C2C', fontWeight: '500' },
  buyButton: { borderRadius: 12, overflow: 'hidden' },
  buyButtonGradient: { paddingVertical: 16, alignItems: 'center', backgroundColor: '#464B8B' },
  buyButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  alertCard: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 14, marginHorizontal: 20, marginBottom: 30, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#10B981' },
  alertIcon: { marginRight: 12 },
  alertEmoji: { fontSize: 20 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#10B981', marginBottom: 2 },
  alertSubtitle: { fontSize: 12, color: '#10B981', lineHeight: 18 }
});

export default SellGoldScreen;
