// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   StatusBar,
//   TextInput,
//   Keyboard,
//   Alert,
//   Platform,
//   ActivityIndicator,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useFocusEffect } from '@react-navigation/native';
// import { useSelector } from 'react-redux';
// import { selectUserId } from '../store/authSlice';
// import { useGold } from '../context/GoldContext';
// import { previewBuy, fetchPortfolio, fetchTransactions } from '../services/goldApi';

// const DigitalGoldScreen = ({ navigation }) => {
//   const { state, refreshPrice } = useGold();
//   const goldRate    = state.goldPrice?.pricePerGram || 16236;
//   const sellPrice   = state.goldPrice?.sellPrice    || 16236;
//   const lastUpdated = state.goldPrice?.lastUpdated  || null;
//   const userId      = useSelector(selectUserId);

//   const [buyMode, setBuyMode]           = useState('rupees');
//   const [amount, setAmount]             = useState('');
//   const [keyboardOffset, setKeyboardOffset] = useState(0);
//   const [previewLoading, setPreviewLoading] = useState(false);

//   // Portfolio state
//   const [portfolio, setPortfolio]       = useState(null);
//   const [portfolioLoading, setPortfolioLoading] = useState(false);

//   // Recent transactions state
//   const [transactions, setTransactions] = useState([]);
//   const [txnLoading, setTxnLoading]     = useState(false);

//   const scrollViewRef = useRef(null);
//   const inputRef      = useRef(null);

//   // ── Load portfolio + transactions on screen focus ──────────────────────────
//   const loadScreenData = useCallback(async () => {
//     const uid = userId;
//     if (!uid) return;

//     setPortfolioLoading(true);
//     setTxnLoading(true);

//     try {
//       const [portfolioData, txnData] = await Promise.allSettled([
//         fetchPortfolio(uid),
//         fetchTransactions(uid),
//       ]);
//       if (portfolioData.status === 'fulfilled') setPortfolio(portfolioData.value);
//       if (txnData.status === 'fulfilled')       setTransactions(txnData.value.slice(0, 5));
//     } catch {}
//     finally {
//       setPortfolioLoading(false);
//       setTxnLoading(false);
//     }
//   }, [userId]);

//   useFocusEffect(useCallback(() => {
//     refreshPrice();
//     loadScreenData();
//   }, [refreshPrice, loadScreenData]));

//   const goldBalance    = portfolio?.totalGoldGrams      ?? state.portfolio?.totalGrams   ?? 0;
//   const currentValue   = portfolio?.currentValue        ?? (goldBalance * goldRate);
//   const totalInvested  = portfolio?.totalInvestedAmount ?? state.portfolio?.totalInvested ?? 0;
//   const totalGain      = portfolio?.totalGain           ?? (currentValue - totalInvested);
//   const gainPercent    = portfolio?.gainPercentage      ?? 0;

//   useEffect(() => {
//     const keyboardDidShowListener = Keyboard.addListener(
//       'keyboardDidShow',
//       (event) => {
//         setKeyboardOffset(event.endCoordinates.height);
//         setTimeout(() => {
//           if (scrollViewRef.current) {
//             scrollViewRef.current.scrollTo({ y: 200, animated: true });
//           }
//         }, 100);
//       }
//     );
//     const keyboardDidHideListener = Keyboard.addListener(
//       'keyboardDidHide',
//       () => setKeyboardOffset(0)
//     );
//     return () => {
//       keyboardDidShowListener.remove();
//       keyboardDidHideListener.remove();
//     };
//   }, []);

//   const handleBuyGold = async () => {
//     if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
//       Alert.alert('Enter Amount', 'Please enter a valid amount to proceed');
//       return;
//     }
//     const numAmount = parseFloat(amount);
//     if (buyMode === 'rupees' && numAmount < 100) {
//       Alert.alert('Minimum Amount', 'Minimum purchase is ₹100');
//       return;
//     }
//     if (buyMode === 'grams' && numAmount <= 0) {
//       Alert.alert('Invalid Grams', 'Please enter a valid gram amount');
//       return;
//     }

//     setPreviewLoading(true);
//     try {
//       const uid = userId;
//       if (!uid) {
//         Alert.alert('Session Expired', 'Please login again.');
//         navigation.replace('Login');
//         return;
//       }

//       // Match web calculation exactly
//       const purchaseType = buyMode === 'rupees' ? 'AMOUNT' : 'GRAMS';
//       let sendAmount = 0;
//       let sendGrams  = 0;

//       if (buyMode === 'rupees') {
//         // total entered = gold value + 3% GST
//         const gst       = Math.round(numAmount * 0.03 * 100) / 100;
//         const goldValue = Math.round((numAmount - gst) * 100) / 100;
//         sendAmount = Math.round(numAmount * 100) / 100;  // total payable
//         sendGrams  = goldValue / goldRate;
//       } else {
//         sendGrams  = Math.round(numAmount * 1000000) / 1000000;
//         const goldValue = Math.round(sendGrams * goldRate * 100) / 100;
//         const gst       = Math.round(goldValue * 0.03 * 100) / 100;
//         sendAmount = Math.round((goldValue + gst) * 100) / 100;
//       }

//       const preview = await previewBuy({
//         userId:             uid,
//         purchaseType,
//         amount:             sendAmount,
//         grams:              sendGrams,
//         pergramBuyingPrice: goldRate,
//       });

//       if (!preview) throw new Error('Failed to get order preview. Please try again.');

//       navigation.navigate('PaymentReview', { preview, buyMode, goldRate });
//     } catch (e) {
//       Alert.alert('Error', e.message || 'Failed to preview order. Please try again.');
//     } finally {
//       setPreviewLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
//       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
//           <Text style={styles.headerBackText}>←</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Digital Gold</Text>
//         <View style={styles.headerRight}>
//           <Text style={styles.headerIcon}>🪙</Text>
//         </View>
//       </View>

//       <ScrollView
//         ref={scrollViewRef}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={1}
//         decelerationRate="normal"
//         bounces={false}
//         contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardOffset > 0 ? keyboardOffset + 30 : 30 }]}
//         keyboardShouldPersistTaps="handled"
//       >
//         {/* Professional Digital Gold Banner */}
//         <LinearGradient
//           colors={['#2C2C54', '#40407A', '#464B8B']}
//           style={styles.compactBanner}
//         >
//           <View style={styles.goldRateSection}>
//             <Text style={styles.goldRateLabel}>Live Gold Price</Text>
//             <View style={styles.rateRow}>
//               <Text style={styles.goldRate}>₹{goldRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / gram</Text>
//               <View style={styles.liveIndicator}>
//                 <View style={styles.liveDot} />
//                 <Text style={styles.liveText}>LIVE</Text>
//               </View>
//             </View>
//             <Text style={styles.purityText}>24K • 999.9 purity{lastUpdated ? `  ·  Updated ${lastUpdated}` : ''}</Text>
//           </View>

//           <View style={styles.portfolioSection}>
//             <Text style={styles.portfolioLabel}>Your Gold Portfolio</Text>
//             {portfolioLoading ? (
//               <ActivityIndicator color="#DAA520" style={{ marginTop: 8 }} />
//             ) : (
//               <View style={styles.portfolioRow}>
//                 <View style={styles.portfolioLeft}>
//                   <Text style={styles.portfolioValue}>₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
//                   <Text style={styles.portfolioGrams}>{goldBalance.toFixed(4)} grams</Text>
//                 </View>
//                 <View style={[styles.gainContainer, totalGain < 0 && { backgroundColor: 'rgba(220,53,69,0.15)' }]}>
//                   <Text style={[styles.gainText, totalGain < 0 && { color: '#DC3545' }]}>
//                     {totalGain >= 0 ? '↑' : '↓'} ₹{Math.abs(totalGain).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({gainPercent.toFixed(2)}%)
//                   </Text>
//                 </View>
//               </View>
//             )}
//           </View>
//         </LinearGradient>

//         {/* Gold Savings with Balance */}
//         <View style={styles.goldSavingsSection}>
//           <Text style={styles.goldSavingsTitle}>Gold Savings</Text>
//           <View style={styles.balanceRow}>
//             <View>
//               <Text style={styles.goldBalance}>{goldBalance.toFixed(4)} grams</Text>
//               <Text style={styles.investedText}>Invested: ₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
//             </View>
//             {goldBalance > 0 && (
//               <TouchableOpacity
//                 style={styles.sellButton}
//                 onPress={() => navigation.navigate('SellGold')}
//               >
//                 <Text style={styles.sellButtonText}>Sell @ ₹{sellPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/g</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         </View>

//         {/* Buy Gold Section */}
//         <View style={styles.buySection}>
//           <View style={styles.sectionHeader}>
//             <Text style={styles.buySectionTitle}>Buy Gold</Text>
//           </View>

//           {/* Toggle Tabs */}
//           <View style={styles.toggleContainer}>
//             <TouchableOpacity
//               style={[styles.toggleTab, buyMode === 'rupees' && styles.activeTab]}
//               onPress={() => setBuyMode('rupees')}
//             >
//               <Text style={[styles.toggleText, buyMode === 'rupees' && styles.activeToggleText]}>
//                 Buy in Rupees (₹)
//               </Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.toggleTab, buyMode === 'grams' && styles.activeTab]}
//               onPress={() => setBuyMode('grams')}
//             >
//               <Text style={[styles.toggleText, buyMode === 'grams' && styles.activeToggleText]}>
//                 Buy in Grams (g)
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Amount Input */}
//           <View style={styles.inputContainer}>
//             <TextInput
//               ref={inputRef}
//               style={styles.amountInput}
//               placeholder={buyMode === 'rupees' ? `Enter amount in ₹` : 'Enter grams'}
//               placeholderTextColor="#999"
//               value={amount}
//               onChangeText={(value) => setAmount(value)}
//               keyboardType="numeric"
//               returnKeyType="done"
//               onSubmitEditing={() => Keyboard.dismiss()}
//             />

//             {amount && (
//               <Text style={styles.equivalentText}>
//                 {buyMode === 'rupees'
//                   ? `≈ ${(parseFloat(amount) / goldRate).toFixed(3)} grams`
//                   : `≈ ₹${(parseFloat(amount) * goldRate).toFixed(0)}`
//                 }
//               </Text>
//             )}

//             <Text style={styles.helperText}>Inclusive of GST</Text>
//             <Text style={styles.noteText}>
//               {buyMode === 'rupees' ? 'Start buying from as low as ₹100' : 'Price based on live gold rate'}
//             </Text>
//           </View>

//           {/* Quick Amount Chips */}
//           {buyMode === 'rupees' && (
//             <View style={styles.chipContainer}>
//               {['100', '500', '1,000', '10,000'].map((chipAmount) => (
//                 <TouchableOpacity
//                   key={chipAmount}
//                   style={styles.amountChip}
//                   onPress={() => setAmount(chipAmount.replace(',', ''))}
//                 >
//                   <Text style={styles.chipText}>₹{chipAmount}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           )}

//           {/* Action Button */}
//           <TouchableOpacity
//             style={[styles.buyButton, previewLoading && { opacity: 0.6 }]}
//             onPress={handleBuyGold}
//             disabled={previewLoading}
//           >
//             <LinearGradient colors={['#464B8B', '#464B8B']} style={styles.buyButtonGradient}>
//               <Text style={styles.buyButtonText}>
//                 {previewLoading ? 'Getting Preview...' : 'Buy Gold at Live Price'}
//               </Text>
//             </LinearGradient>
//           </TouchableOpacity>
//         </View>

//         {/* Silver Savings Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Silver Savings</Text>

//           <View style={styles.silverContainer}>
//             <TouchableOpacity style={styles.silverCard} activeOpacity={0.8}>
//               <LinearGradient
//                 colors={['#FFFFFF', '#F8F9FA', '#FFFFFF']}
//                 style={styles.silverCardGradient}
//               >
//                 <View style={styles.silverIcon}>
//                   <Text style={styles.silverEmoji}>🥈</Text>
//                 </View>
//                 <Text style={styles.silverTitle}>Save Daily</Text>
//                 <Text style={styles.silverSubtitle}>Start from ₹5</Text>
//               </LinearGradient>
//             </TouchableOpacity>

//             <TouchableOpacity style={styles.silverCard} activeOpacity={0.8}>
//               <LinearGradient
//                 colors={['#FFFFFF', '#F8F9FA', '#FFFFFF']}
//                 style={styles.silverCardGradient}
//               >
//                 <View style={styles.silverIconContainer}>
//                   <View style={styles.silverIcon}>
//                     <Text style={styles.silverEmoji}>💎</Text>
//                   </View>
//                   <View style={styles.newBadge}>
//                     <Text style={styles.newBadgeText}>NEW</Text>
//                   </View>
//                 </View>
//                 <Text style={styles.silverTitle}>Buy Silver</Text>
//                 <Text style={styles.silverSubtitle}>₹78/gram today</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* Jewellery Scheme Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Jewellery Scheme</Text>

//           <TouchableOpacity style={styles.jewelleryCard} activeOpacity={0.8}>
//             <LinearGradient
//               colors={['#FFFFFF', '#F8F9FA', '#FFFFFF']}
//               style={styles.cardGradient}
//             >
//               <View style={styles.jewelleryIcon}>
//                 <Text style={styles.jewelleryEmoji}>💍</Text>
//               </View>
//               <View style={styles.jewelleryContent}>
//                 <Text style={styles.jewelleryTitle}>CaratLane Gold Plan</Text>
//                 <Text style={styles.jewellerySubtitle}>Save monthly, get jewellery</Text>
//                 <Text style={styles.jewelleryDescription}>11 months savings + 1 month free</Text>
//               </View>
//               <Text style={styles.jewelleryArrow}>→</Text>
//             </LinearGradient>
//           </TouchableOpacity>
//         </View>

//         {/* Recent Transactions */}
//         <View style={styles.section}>
//           <View style={styles.txnHeader}>
//             <Text style={styles.sectionTitle}>Recent Transactions</Text>
//             <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
//               <Text style={styles.viewAllText}>View All</Text>
//             </TouchableOpacity>
//           </View>
//           {txnLoading ? (
//             <ActivityIndicator color="#464B8B" style={{ marginTop: 8 }} />
//           ) : transactions.length === 0 ? (
//             <Text style={styles.emptyTxnText}>No transactions yet</Text>
//           ) : (
//             transactions.map((txn) => (
//               <View key={txn.id} style={styles.txnRow}>
//                 <View style={[styles.txnIcon, { backgroundColor: txn.type === 'BUY' ? '#E8F5E9' : '#FFF3E0' }]}>
//                   <Text style={styles.txnEmoji}>{txn.type === 'BUY' ? '🟢' : '🔴'}</Text>
//                 </View>
//                 <View style={styles.txnInfo}>
//                   <Text style={styles.txnType}>{txn.type === 'BUY' ? 'Bought Gold' : 'Sold Gold'}</Text>
//                   <Text style={styles.txnDate}>{new Date(txn.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
//                 </View>
//                 <View style={styles.txnAmounts}>
//                   <Text style={styles.txnAmount}>₹{txn.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
//                   <Text style={styles.txnGrams}>{txn.grams.toFixed(4)}g</Text>
//                 </View>
//               </View>
//             ))
//           )}
//         </View>

//         {/* PAN Verification Alert */}
//         <View style={styles.alertCard}>
//           <View style={styles.alertIcon}>
//             <Text style={styles.alertEmoji}>⚠️</Text>
//           </View>
//           <View style={styles.alertContent}>
//             <Text style={styles.alertTitle}>Complete PAN verification</Text>
//             <Text style={styles.alertSubtitle}>Required for gold purchases above ₹50,000</Text>
//           </View>
//           <TouchableOpacity style={styles.alertButton} activeOpacity={0.8}>
//             <Text style={styles.alertButtonText}>Verify</Text>
//           </TouchableOpacity>
//         </View>

//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFFFFF',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingTop: Platform.OS === 'ios' ? 54 : 44,
//     paddingBottom: 14,
//     paddingHorizontal: 20,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0',
//   },
//   headerBack: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: '#464B8B',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   headerBackText: {
//     fontSize: 18,
//     color: '#464B8B',
//     fontWeight: '600',
//   },
//   headerTitle: {
//     fontSize: 17,
//     fontWeight: '700',
//     color: '#464B8B',
//   },
//   headerRight: {
//     width: 36,
//     height: 36,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   headerIcon: {
//     fontSize: 22,
//   },
//   compactBanner: {
//     marginHorizontal: 16,
//     marginTop: 20,
//     marginBottom: 24,
//     borderRadius: 16,
//     paddingHorizontal: 24,
//     paddingVertical: 24,
//   },
//   goldRateSection: {
//     marginBottom: 20,
//   },
//   goldRateLabel: {
//     fontSize: 14,
//     color: 'rgba(255, 255, 255, 0.7)',
//     marginBottom: 8,
//   },
//   rateRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 6,
//   },
//   goldRate: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#DAA520',
//   },
//   purityText: {
//     fontSize: 12,
//     color: 'rgba(218, 165, 32, 0.8)',
//   },
//   liveIndicator: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   liveDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#00C851',
//   },
//   liveText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#00C851',
//   },
//   portfolioSection: {
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(218, 165, 32, 0.3)',
//     paddingTop: 20,
//   },
//   portfolioLabel: {
//     fontSize: 14,
//     color: 'rgba(255, 255, 255, 0.7)',
//     marginBottom: 12,
//   },
//   portfolioRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   portfolioLeft: {
//     flex: 1,
//   },
//   portfolioValue: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     marginBottom: 6,
//   },
//   portfolioGrams: {
//     fontSize: 14,
//     color: 'rgba(218, 165, 32, 0.8)',
//   },
//   gainContainer: {
//     alignItems: 'center',
//     backgroundColor: 'rgba(0, 200, 81, 0.15)',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 12,
//   },
//   gainText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#00C851',
//   },
//   goldSavingsSection: {
//     paddingHorizontal: 20,
//     marginBottom: 20,
//   },
//   goldSavingsTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#464B8B',
//     marginBottom: 8,
//   },
//   balanceRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   goldBalance: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#DAA520',
//   },
//   investedText: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 2,
//   },
//   sellButton: {
//     backgroundColor: '#DC3545',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 6,
//   },
//   sellButtonText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },
//   backButton: {
//     backgroundColor: '#F5F5F5',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//   },
//   backButtonText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2C2C2C',
//   },
//   equivalentText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#B8860B',
//     marginBottom: 8,
//   },
//   buySection: {
//     marginHorizontal: 20,
//     borderRadius: 8,
//     padding: 24,
//     marginBottom: 24,
//     borderWidth: 1,
//     borderColor: '#DAA520',
//     backgroundColor: '#FFFFFF',
//   },
//   buySectionTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#464B8B',
//     marginBottom: 20,
//   },
//   toggleContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#F5F5F5',
//     borderRadius: 8,
//     padding: 4,
//     marginBottom: 20,
//   },
//   toggleTab: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: 'center',
//     borderRadius: 6,
//   },
//   activeTab: {
//     backgroundColor: '#FFFFFF',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   toggleText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#666',
//   },
//   activeToggleText: {
//     color: '#2C2C2C',
//     fontWeight: '600',
//   },
//   inputContainer: {
//     marginBottom: 20,
//   },
//   amountInput: {
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     borderRadius: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     color: '#2C2C2C',
//     marginBottom: 8,
//   },
//   helperText: {
//     fontSize: 12,
//     color: '#666',
//     marginBottom: 4,
//   },
//   noteText: {
//     fontSize: 12,
//     color: '#999',
//   },
//   chipContainer: {
//     flexDirection: 'row',
//     justifyContent: 'flex-start',
//     marginBottom: 24,
//     gap: 8,
//   },
//   amountChip: {
//     backgroundColor: '#FFFFFF',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//     borderWidth: 1,
//     borderColor: '#DAA520',
//   },
//   chipText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#2C2C2C',
//   },
//   buyButton: {
//     borderRadius: 8,
//     overflow: 'hidden',
//   },
//   buyButtonGradient: {
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   buyButtonText: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#FFFFFF',
//   },
//   section: {
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#464B8B',
//     paddingHorizontal: 20,
//     marginBottom: 12,
//   },
//   silverContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 20,
//     justifyContent: 'space-between',
//   },
//   silverCard: {
//     borderRadius: 12,
//     flex: 1,
//     marginHorizontal: 6,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: '#DAA520',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   silverIconContainer: {
//     position: 'relative',
//     marginBottom: 4,
//   },
//   silverIcon: {
//     marginBottom: 4,
//   },
//   silverEmoji: {
//     fontSize: 32,
//   },
//   newBadge: {
//     position: 'absolute',
//     top: -8,
//     right: -8,
//     backgroundColor: '#FF4444',
//     borderRadius: 8,
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//   },
//   newBadgeText: {
//     fontSize: 10,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },
//   silverTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2C2C2C',
//     marginBottom: 2,
//     textAlign: 'center',
//   },
//   silverSubtitle: {
//     fontSize: 12,
//     color: '#666666',
//     textAlign: 'center',
//   },
//   jewelleryCard: {
//     borderRadius: 12,
//     marginHorizontal: 20,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: '#DAA520',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   jewelleryIcon: {
//     marginRight: 16,
//   },
//   jewelleryEmoji: {
//     fontSize: 24,
//   },
//   jewelleryContent: {
//     flex: 1,
//   },
//   jewelleryTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#2C2C2C',
//     marginBottom: 4,
//   },
//   jewellerySubtitle: {
//     fontSize: 14,
//     color: '#666666',
//     marginBottom: 2,
//   },
//   jewelleryDescription: {
//     fontSize: 12,
//     color: '#DAA520',
//   },
//   jewelleryArrow: {
//     fontSize: 18,
//     color: '#666666',
//   },
//   alertCard: {
//     backgroundColor: '#464B8B',
//     borderRadius: 12,
//     padding: 16,
//     marginHorizontal: 20,
//     marginBottom: 30,
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#B8860B',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   alertIcon: {
//     marginRight: 12,
//   },
//   alertEmoji: {
//     fontSize: 20,
//   },
//   alertContent: {
//     flex: 1,
//   },
//   alertTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#FFFFFF',
//     marginBottom: 2,
//   },
//   alertSubtitle: {
//     fontSize: 12,
//     color: '#AAAAAA',
//   },
//   alertButton: {
//     backgroundColor: '#DAA520',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.3,
//     shadowRadius: 2,
//     elevation: 3,
//   },
//   alertButtonText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },
//   cardGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     borderRadius: 12,
//   },
//   silverCardGradient: {
//     alignItems: 'center',
//     padding: 12,
//     borderRadius: 12,
//     flex: 1,
//     height: '100%',
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   txnHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     marginBottom: 12,
//   },
//   viewAllText: {
//     fontSize: 13,
//     color: '#464B8B',
//     fontWeight: '600',
//   },
//   emptyTxnText: {
//     textAlign: 'center',
//     color: '#999',
//     fontSize: 14,
//     paddingVertical: 16,
//   },
//   txnRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0',
//   },
//   txnIcon: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   txnEmoji: {
//     fontSize: 16,
//   },
//   txnInfo: {
//     flex: 1,
//   },
//   txnType: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2C2C2C',
//   },
//   txnDate: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 2,
//   },
//   txnAmounts: {
//     alignItems: 'flex-end',
//   },
//   txnAmount: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#2C2C2C',
//   },
//   txnGrams: {
//     fontSize: 12,
//     color: '#DAA520',
//     marginTop: 2,
//   },
//   scrollContent: {
//     paddingBottom: 30,
//   },
// });

// export default DigitalGoldScreen;

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Keyboard,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { useGold } from "../context/GoldContext";
import {
  previewBuy,
  fetchPortfolio,
  fetchTransactions,
} from "../services/goldApi";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  gold: "#C8952A",
  goldLight: "#F5ECD7",
  goldMid: "#E8C97A",
  navy: "#1C2340",
  navyMid: "#3D4463",
  navyLight: "#8891AF",
  green: "#0E9F6E",
  greenBg: "#ECFDF5",
  red: "#E02424",
  redBg: "#FEF2F2",
  border: "#EAE8E2",
  divider: "#F0EEE9",
  shadow: "rgba(28,35,64,0.08)",
  goldShadow: "rgba(200,149,42,0.25)",
};

const RADIUS = { sm: 10, md: 14, lg: 18, xl: 22 };
const SHADOW = {
  shadowColor: "rgba(28,35,64,0.08)",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 8,
  elevation: 3,
};

const DigitalGoldScreen = ({ navigation, route }) => {
  const { state, refreshPrice } = useGold();
  const goldRate = state.goldPrice?.pricePerGram || 16236;
  const sellPrice = state.goldPrice?.sellPrice || 16236;
  const lastUpdated = state.goldPrice?.lastUpdated || null;
  const userId = useSelector(selectUserId);
  const accessToken = route?.params?.accessToken;

  const [buyMode, setBuyMode] = useState("rupees");
  const [amount, setAmount] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txnLoading, setTxnLoading] = useState(false);

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  const loadScreenData = useCallback(async () => {
    const uid = userId;
    if (!uid) return;
    setPortfolioLoading(true);
    setTxnLoading(true);
    try {
      const [portfolioData, txnData] = await Promise.allSettled([
        fetchPortfolio(uid),
        fetchTransactions(uid),
      ]);
      if (portfolioData.status === "fulfilled")
        setPortfolio(portfolioData.value);
      if (txnData.status === "fulfilled")
        setTransactions(txnData.value.slice(0, 5));
    } catch {
    } finally {
      setPortfolioLoading(false);
      setTxnLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refreshPrice();
      loadScreenData();
    }, [refreshPrice, loadScreenData]),
  );

  const goldBalance =
    portfolio?.totalGoldGrams ?? state.portfolio?.totalGrams ?? 0;
  const currentValue = portfolio?.currentValue ?? goldBalance * goldRate;
  const totalInvested =
    portfolio?.totalInvestedAmount ?? state.portfolio?.totalInvested ?? 0;
  const totalGain = portfolio?.totalGain ?? currentValue - totalInvested;
  const gainPercent = portfolio?.gainPercentage ?? 0;
  const isProfit = totalGain >= 0;

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardOffset(e.endCoordinates.height);
      setTimeout(
        () => scrollViewRef.current?.scrollTo({ y: 200, animated: true }),
        100,
      );
    });
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardOffset(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleBuyGold = async () => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      Alert.alert("Enter Amount", "Please enter a valid amount to proceed");
      return;
    }
    const numAmount = parseFloat(amount);
    if (buyMode === "rupees" && numAmount < 100) {
      Alert.alert("Minimum Amount", "Minimum purchase is ₹100");
      return;
    }
    if (buyMode === "grams" && numAmount <= 0) {
      Alert.alert("Invalid Grams", "Please enter a valid gram amount");
      return;
    }
    setPreviewLoading(true);
    try {
      const uid = userId;
      if (!uid) {
        Alert.alert("Session Expired", "Please login again.");
        navigation.replace("Login");
        return;
      }
      const purchaseType = buyMode === "rupees" ? "AMOUNT" : "GRAMS";
      let sendAmount = 0,
        sendGrams = 0;
      if (buyMode === "rupees") {
        const gst = Math.round(numAmount * 0.03 * 100) / 100;
        const goldValue = Math.round((numAmount - gst) * 100) / 100;
        sendAmount = Math.round(numAmount * 100) / 100;
        sendGrams = goldValue / goldRate;
      } else {
        sendGrams = Math.round(numAmount * 1000000) / 1000000;
        const goldValue = Math.round(sendGrams * goldRate * 100) / 100;
        const gst = Math.round(goldValue * 0.03 * 100) / 100;
        sendAmount = Math.round((goldValue + gst) * 100) / 100;
      }
      const preview = await previewBuy({
        userId: uid,
        purchaseType,
        amount: sendAmount,
        grams: sendGrams,
        pergramBuyingPrice: goldRate,
      });
      if (!preview)
        throw new Error("Failed to get order preview. Please try again.");
      navigation.navigate("PaymentReview", { preview, buyMode, goldRate });
    } catch (e) {
      Alert.alert(
        "Error",
        e.message || "Failed to preview order. Please try again.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const gramsPreview =
    amount && !isNaN(parseFloat(amount)) && buyMode === "rupees"
      ? (parseFloat(amount) / goldRate).toFixed(4)
      : null;
  const rupeesPreview =
    amount && !isNaN(parseFloat(amount)) && buyMode === "grams"
      ? (parseFloat(amount) * goldRate).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })
      : null;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Digital Gold</Text>
        <View style={s.liveChip}>
          <View style={s.liveDot} />
          <Text style={s.liveLabel}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: keyboardOffset > 0 ? keyboardOffset + 24 : 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Hero: Price + Portfolio ──────────────────────────────── */}
        <LinearGradient
          colors={["#1C2340", "#2A3260", "#1C2340"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroRing1} />
          <View style={s.heroRing2} />

          {/* Top row: price + coin */}
          <View style={s.heroPriceRow}>
            <View>
              <Text style={s.heroPurity}>24K Gold · 999.9 Pure</Text>
              <Text style={s.heroPrice}>
                ₹
                {goldRate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </Text>
              <Text style={s.heroPriceSub}>
                per gram{lastUpdated ? `   ·   ${lastUpdated}` : ""}
              </Text>
            </View>
            <View style={s.heroCoin}>
              <Text style={s.heroCoinEmoji}>🪙</Text>
            </View>
          </View>

          <View style={s.heroDivider} />

          {/* Bottom: portfolio */}
          <View style={s.heroPortfolio}>
            <View>
              <Text style={s.heroPortLabel}>YOUR PORTFOLIO</Text>
              {portfolioLoading ? (
                <ActivityIndicator
                  color={C.goldMid}
                  size="small"
                  style={{ marginTop: 10 }}
                />
              ) : (
                <>
                  <Text style={s.heroPortValue}>
                    ₹
                    {currentValue.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                  <Text style={s.heroPortGrams}>
                    {goldBalance.toFixed(4)} grams
                  </Text>
                </>
              )}
            </View>
            {!portfolioLoading && (
              <View style={[s.heroGainTag, !isProfit && s.heroGainTagRed]}>
                <Text style={[s.heroGainPct, !isProfit && s.heroGainRed]}>
                  {isProfit ? "▲" : "▼"} {gainPercent.toFixed(2)}%
                </Text>
                <Text style={[s.heroGainAmt, !isProfit && s.heroGainAmtRed]}>
                  ₹
                  {Math.abs(totalGain).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ─── Gold Savings + Sell ──────────────────────────────────── */}
        <View style={s.savingsCard}>
          <View style={s.savingsLeft}>
            <Text style={s.savingsLabel}>GOLD SAVINGS</Text>
            <Text style={s.savingsGrams}>
              {goldBalance.toFixed(4)}
              <Text style={s.savingsUnit}> g</Text>
            </Text>
            <Text style={s.savingsInvested}>
              Invested ₹
              {totalInvested.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>
          {goldBalance > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate("SellGold")}
              activeOpacity={0.85}
              style={s.sellBtn}
            >
              <Text style={s.sellBtnLabel}>Sell Gold</Text>
              <Text style={s.sellBtnRate}>
                @ ₹
                {sellPrice.toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                })}
                /g
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Buy Gold ─────────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardTop}>
            <Text style={s.cardTitle}>Buy Gold</Text>
            <View style={s.ratePill}>
              <Text style={s.ratePillText}>
                ₹
                {goldRate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                /g
              </Text>
            </View>
          </View>

          {/* Mode Toggle */}
          <View style={s.toggle}>
            {["rupees", "grams"].map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  setBuyMode(mode);
                  setAmount("");
                }}
                style={[s.toggleTab, buyMode === mode && s.toggleTabActive]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.toggleTabText,
                    buyMode === mode && s.toggleTabTextActive,
                  ]}
                >
                  {mode === "rupees" ? "₹  Rupees" : "⚖  Grams"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input */}
          <View style={s.inputBox}>
            <Text style={s.inputSymbol}>
              {buyMode === "rupees" ? "₹" : "g"}
            </Text>
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder={buyMode === "rupees" ? "0" : "0.0000"}
              placeholderTextColor="#CCCAC3"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          {/* Equivalent row */}
          {gramsPreview || rupeesPreview ? (
            <View style={s.equivRow}>
              <Text style={s.equivText}>
                {gramsPreview
                  ? `≈ ${gramsPreview} grams`
                  : `≈ ₹${rupeesPreview}`}
              </Text>
              <Text style={s.equivGst}>Incl. 3% GST</Text>
            </View>
          ) : (
            <Text style={s.inputHint}>
              {buyMode === "rupees"
                ? "Minimum purchase ₹100  ·  Incl. 3% GST"
                : "Live rate  ·  Incl. 3% GST"}
            </Text>
          )}

          {/* Quick chips */}
          {buyMode === "rupees" && (
            <View style={s.chips}>
              {[
                ["100", "₹100"],
                ["500", "₹500"],
                ["1000", "₹1K"],
                ["10000", "₹10K"],
              ].map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setAmount(val)}
                  style={[s.chip, amount === val && s.chipActive]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[s.chipText, amount === val && s.chipTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            onPress={handleBuyGold}
            disabled={previewLoading}
            activeOpacity={0.88}
            style={[s.buyBtn, previewLoading && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={["#D4A535", "#C8952A", "#B8841E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.buyBtnGrad}
            >
              {previewLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.buyBtnText}>Proceed to Buy →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ─── Silver Savings ───────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Silver Savings</Text>
          <View style={s.twoCol}>
            <TouchableOpacity style={s.featureCard} activeOpacity={0.8}>
              <LinearGradient
                colors={["#F5F4FF", "#ECEAFF"]}
                style={s.featureCardInner}
              >
                <Text style={s.featureEmoji}>🥈</Text>
                <Text style={s.featureTitle}>Save Daily</Text>
                <Text style={s.featureSub}>From ₹5/day</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={s.featureCard} activeOpacity={0.8}>
              <LinearGradient
                colors={["#F5F4FF", "#ECEAFF"]}
                style={s.featureCardInner}
              >
                <View style={s.featureEmojiWrap}>
                  <Text style={s.featureEmoji}>💎</Text>
                  <View style={s.newTag}>
                    <Text style={s.newTagText}>NEW</Text>
                  </View>
                </View>
                <Text style={s.featureTitle}>Buy Silver</Text>
                <Text style={s.featureSub}>₹78/gram today</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={s.physicalGoldBtn}
          onPress={() => navigation.navigate("PgHome", { accessToken, userId })}
          activeOpacity={0.87}
        >
          <View style={s.pgBtnLeft}>
            <Text style={s.pgBtnIcon}>🏆</Text>
            <View>
              <Text style={s.pgBtnTitle}>Physical Gold</Text>
              <Text style={s.pgBtnSub}>BIS Hallmarked · Certified</Text>
            </View>
          </View>
          <Text style={s.pgBtnArrow}>›</Text>
        </TouchableOpacity>
        {/* ─── Jewellery Scheme ─────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Jewellery Scheme</Text>
          <TouchableOpacity style={s.jewCard} activeOpacity={0.8}>
            <View style={s.jewIconBox}>
              <Text style={s.jewEmoji}>💍</Text>
            </View>
            <View style={s.jewContent}>
              <Text style={s.jewTitle}>CaratLane Gold Plan</Text>
              <Text style={s.jewSub}>Save monthly, get jewellery</Text>
              <Text style={s.jewDetail}>11 months savings + 1 month free</Text>
            </View>
            <Text style={s.jewArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Recent Transactions ──────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionRowHeader}>
            <Text style={s.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
              <Text style={s.viewAll}>View All ›</Text>
            </TouchableOpacity>
          </View>
          <View style={s.txnCard}>
            {txnLoading ? (
              <ActivityIndicator
                color={C.gold}
                style={{ marginVertical: 28 }}
              />
            ) : transactions.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>📭</Text>
                <Text style={s.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map((txn, i) => {
                const isBuy = txn.type === "BUY";
                return (
                  <View
                    key={txn.id}
                    style={[
                      s.txnRow,
                      i < transactions.length - 1 && s.txnBorder,
                    ]}
                  >
                    <View
                      style={[s.txnDot, isBuy ? s.txnDotBuy : s.txnDotSell]}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: isBuy ? C.green : C.red,
                        }}
                      >
                        {isBuy ? "↑" : "↓"}
                      </Text>
                    </View>
                    <View style={s.txnMid}>
                      <Text style={s.txnType}>
                        {isBuy ? "Bought Gold" : "Sold Gold"}
                      </Text>
                      <Text style={s.txnDate}>
                        {new Date(txn.timestamp).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={s.txnRight}>
                      <Text style={s.txnAmt}>
                        ₹
                        {txn.amount.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </Text>
                      <Text style={s.txnGrams}>{txn.grams.toFixed(4)} g</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ─── PAN Alert ────────────────────────────────────────────── */}
        <View style={s.panAlert}>
          <Text style={s.panAlertIcon}>🪪</Text>
          <View style={s.panAlertContent}>
            <Text style={s.panAlertTitle}>Verify your PAN</Text>
            <Text style={s.panAlertSub}>
              Required for purchases above ₹50,000
            </Text>
          </View>
          <TouchableOpacity style={s.panBtn} activeOpacity={0.8}>
            <Text style={s.panBtnText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F6F3" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 14,
    paddingBottom: 14,
    backgroundColor: "#F7F6F3",
    borderBottomWidth: 1,
    borderBottomColor: "#EAE8E2",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE8E2",
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  backBtnText: {
    fontSize: 28,
    lineHeight: 32,
    color: "#1C2340",
    fontWeight: "300",
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C2340",
    letterSpacing: 0.2,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#0E9F6E" },
  liveLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0E9F6E",
    letterSpacing: 0.8,
  },

  scroll: { paddingBottom: 40 },

  // Hero card
  heroCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 14,
    borderRadius: 22,
    padding: 22,
    overflow: "hidden",
  },
  heroRing1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    right: -60,
    top: -70,
  },
  heroRing2: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    right: -10,
    top: -10,
  },
  heroPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  heroPurity: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroPrice: {
    fontSize: 34,
    fontWeight: "800",
    color: "#E8C97A",
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroPriceSub: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
  heroCoin: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCoinEmoji: { fontSize: 26 },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
  },
  heroPortfolio: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heroPortLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroPortValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroPortGrams: { fontSize: 13, color: "rgba(255,255,255,0.38)" },
  heroGainTag: {
    backgroundColor: "rgba(14,159,110,0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(14,159,110,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 90,
  },
  heroGainTagRed: {
    backgroundColor: "rgba(224,36,36,0.12)",
    borderColor: "rgba(224,36,36,0.22)",
  },
  heroGainPct: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0E9F6E",
    marginBottom: 3,
  },
  heroGainRed: { color: "#E02424" },
  heroGainAmt: { fontSize: 11, color: "rgba(14,159,110,0.75)" },
  heroGainAmtRed: { color: "rgba(224,36,36,0.7)" },

  // Savings card
  savingsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EAE8E2",
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  savingsLeft: {},
  savingsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8891AF",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  savingsGrams: {
    fontSize: 24,
    fontWeight: "800",
    color: "#C8952A",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  savingsUnit: { fontSize: 15, fontWeight: "500", color: "#8891AF" },
  savingsInvested: { fontSize: 12, color: "#8891AF" },
  sellBtn: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  sellBtnLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E02424",
    marginBottom: 3,
  },
  sellBtnRate: { fontSize: 11, color: "#F87171", fontWeight: "500" },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EAE8E2",
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C2340",
    letterSpacing: -0.3,
  },
  ratePill: {
    backgroundColor: "#F5ECD7",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E8C97A",
  },
  ratePillText: { fontSize: 12, fontWeight: "700", color: "#C8952A" },

  // Toggle
  toggle: {
    flexDirection: "row",
    backgroundColor: "#F7F6F3",
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#EAE8E2",
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleTabActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAE8E2",
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleTabText: { fontSize: 14, fontWeight: "500", color: "#8891AF" },
  toggleTabTextActive: { color: "#1C2340", fontWeight: "700" },

  // Input
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F6F3",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EAE8E2",
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  inputSymbol: {
    fontSize: 26,
    fontWeight: "700",
    color: "#C8952A",
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 30,
    fontWeight: "700",
    color: "#1C2340",
    paddingVertical: 16,
  },
  equivRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5ECD7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8C97A",
  },
  equivText: { fontSize: 13, fontWeight: "600", color: "#C8952A" },
  equivGst: { fontSize: 11, color: "#A07830", fontWeight: "500" },
  inputHint: { fontSize: 12, color: "#8891AF", marginBottom: 16 },

  // Chips
  chips: { flexDirection: "row", gap: 8, marginBottom: 18 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE8E2",
    backgroundColor: "#F7F6F3",
  },
  chipActive: { borderColor: "#C8952A", backgroundColor: "#F5ECD7" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#8891AF" },
  chipTextActive: { color: "#C8952A" },

  // Buy button
  buyBtn: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "rgba(200,149,42,0.35)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  buyBtnGrad: { paddingVertical: 17, alignItems: "center", borderRadius: 14 },
  buyBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C2340",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  viewAll: { fontSize: 13, fontWeight: "600", color: "#C8952A" },

  // Two col
  twoCol: { flexDirection: "row", marginHorizontal: 16, gap: 12 },
  featureCard: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EAE8E2",
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  featureCardInner: {
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 12,
  },
  featureEmojiWrap: { position: "relative", marginBottom: 2 },
  featureEmoji: { fontSize: 34, marginBottom: 10 },
  newTag: {
    position: "absolute",
    top: -4,
    right: -14,
    backgroundColor: "#E02424",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newTagText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C2340",
    marginBottom: 4,
    textAlign: "center",
  },
  featureSub: { fontSize: 12, color: "#8891AF", textAlign: "center" },

  // Jewellery
  jewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAE8E2",
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  jewIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F5ECD7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#E8C97A",
  },
  jewEmoji: { fontSize: 22 },
  jewContent: { flex: 1 },
  jewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C2340",
    marginBottom: 3,
  },
  jewSub: { fontSize: 13, color: "#8891AF", marginBottom: 3 },
  jewDetail: { fontSize: 12, color: "#C8952A", fontWeight: "500" },
  jewArrow: { fontSize: 24, color: "#8891AF", fontWeight: "300" },

  // Transactions
  txnCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EAE8E2",
    overflow: "hidden",
    shadowColor: "rgba(28,35,64,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyText: { fontSize: 14, color: "#8891AF" },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txnBorder: { borderBottomWidth: 1, borderBottomColor: "#F0EEE9" },
  txnDot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  txnDotBuy: { backgroundColor: "#ECFDF5" },
  txnDotSell: { backgroundColor: "#FEF2F2" },
  txnMid: { flex: 1 },
  txnType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C2340",
    marginBottom: 3,
  },
  txnDate: { fontSize: 12, color: "#8891AF" },
  txnRight: { alignItems: "flex-end" },
  txnAmt: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C2340",
    marginBottom: 3,
  },
  txnGrams: { fontSize: 12, color: "#C8952A", fontWeight: "500" },

  //...............//
  physicalGoldBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAE8E2",
    shadowColor: "rgba(28,35,64,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  pgBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  pgBtnIcon: {
    fontSize: 28,
  },
  pgBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C2340",
    marginBottom: 3,
  },
  pgBtnSub: {
    fontSize: 12,
    color: "#8891AF",
  },
  pgBtnArrow: {
    fontSize: 24,
    color: "#8891AF",
    fontWeight: "300",
  },

  // PAN Alert
  panAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  panAlertIcon: { fontSize: 22, marginRight: 12 },
  panAlertContent: { flex: 1 },
  panAlertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 3,
  },
  panAlertSub: { fontSize: 12, color: "#B45309" },
  panBtn: {
    backgroundColor: "#C8952A",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: "rgba(200,149,42,0.3)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  panBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});

export default DigitalGoldScreen;
