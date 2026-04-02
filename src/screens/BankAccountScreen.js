import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const BankAccountScreen = ({ navigation, route }) => {
  const sellData = route.params;
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const banks = [
    'State Bank of India',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'Bank of India'
  ];

  const validateAndSubmit = () => {
    if (!bankName) {
      Alert.alert('Error', 'Please select a bank');
      return;
    }
    if (accountHolder.length < 3) {
      Alert.alert('Error', 'Please enter valid account holder name');
      return;
    }
    if (ifscCode.length !== 11) {
      Alert.alert('Error', 'IFSC code must be 11 characters');
      return;
    }
    if (accountNumber.length < 9 || accountNumber.length > 18) {
      Alert.alert('Error', 'Please enter valid account number');
      return;
    }
    if (accountNumber !== confirmAccount) {
      Alert.alert('Error', 'Account numbers do not match');
      return;
    }

    navigation.navigate('SellProcessingScreen', {
      ...sellData,
      bankDetails: {
        accountHolder: accountHolder.toUpperCase(),
        bankName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase()
      }
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F8F9FA', '#FFFFFF', '#F8F9FA']} style={styles.backgroundGradient}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Bank Account</Text>
          </View>
          <View style={styles.headerRight}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Secure Bank Linking</Text>
            <Text style={styles.heroSubtitle}>Your funds will be credited to this account</Text>
          </View>

          <View style={styles.infoBanner}>
            <View style={styles.infoBannerIcon}>
              <Ionicons name="time-outline" size={20} color="#0066CC" />
            </View>
            <View style={styles.infoBannerContent}>
              <Text style={styles.infoBannerTitle}>Quick Settlement</Text>
              <Text style={styles.infoBannerText}>Funds credited in 1-2 business days</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Ionicons name="wallet" size={24} color="#464B8B" />
              <Text style={styles.formHeaderText}>Bank Details</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Bank Name *</Text>
              <TouchableOpacity 
                style={styles.dropdownButton} 
                onPress={() => setShowBankDropdown(true)}
              >
                <Ionicons name="business" size={20} color="#666" />
                <Text style={[styles.dropdownText, !bankName && styles.placeholderText]}>
                  {bankName || 'Select your bank'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Account Holder Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={20} color="#464B8B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter account holder name"
                  value={accountHolder}
                  onChangeText={(text) => setAccountHolder(text.toUpperCase())}
                  autoCapitalize="characters"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>IFSC Code *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="code-slash" size={20} color="#464B8B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., SBIN0001234"
                  value={ifscCode}
                  onChangeText={(text) => setIfscCode(text.toUpperCase())}
                  maxLength={11}
                  autoCapitalize="characters"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Account Number *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card" size={20} color="#464B8B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                  maxLength={18}
                  placeholderTextColor="#999"
                  secureTextEntry={true}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Account Number *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="checkmark-circle" size={20} color="#464B8B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter account number"
                  value={confirmAccount}
                  onChangeText={setConfirmAccount}
                  keyboardType="numeric"
                  maxLength={18}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          <View style={styles.securityNote}>
            <View style={styles.securityIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
            </View>
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Bank-Grade Security</Text>
              <Text style={styles.securityText}>Your details are encrypted with 256-bit SSL</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={validateAndSubmit}>
            <LinearGradient colors={['#464B8B', '#5A5A9A']} style={styles.submitGradient}>
              <Text style={styles.submitButtonText}>Verify & Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>

      <Modal
        visible={showBankDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBankDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankDropdown(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.bankList}>
              {banks.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={styles.bankOption}
                  onPress={() => {
                    setBankName(bank);
                    setShowBankDropdown(false);
                  }}
                >
                  <Ionicons name="business-outline" size={20} color="#464B8B" />
                  <Text style={styles.bankText}>{bank}</Text>
                  {bankName === bank && <Ionicons name="checkmark" size={20} color="#10B981" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  backButton: { padding: 8 },
  backText: { fontSize: 24, color: '#464B8B', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#464B8B', marginLeft: 12 },
  content: { flex: 1, paddingHorizontal: 20 },
  heroSection: { marginVertical: 24, alignItems: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#464B8B', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#666' },
  infoBanner: { 
    backgroundColor: '#E7F3FF', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  infoBannerContent: { flex: 1 },
  infoBannerTitle: { fontSize: 14, fontWeight: '600', color: '#0066CC', marginBottom: 2 },
  infoBannerText: { fontSize: 12, color: '#0066CC' },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#464B8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  formHeaderText: { fontSize: 18, fontWeight: '700', color: '#464B8B', marginLeft: 10 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#464B8B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF'
  },
  dropdownText: { fontSize: 15, color: '#333', flex: 1, marginLeft: 10 },
  placeholderText: { color: '#999' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, padding: 16, fontSize: 15, color: '#333' },
  securityNote: { 
    backgroundColor: '#F0FDF4', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center'
  },
  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  securityContent: { flex: 1 },
  securityTitle: { fontSize: 14, fontWeight: '600', color: '#10B981', marginBottom: 2 },
  securityText: { fontSize: 12, color: '#10B981' },
  submitButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 30 },
  submitGradient: { 
    flexDirection: 'row', 
    padding: 16, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginRight: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  bankList: { padding: 10 },
  bankOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0'
  },
  bankText: { fontSize: 15, color: '#333', flex: 1, marginLeft: 12 }
});

export default BankAccountScreen;
