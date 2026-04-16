// import React, { useCallback, useEffect, useRef, useState } from "react";
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
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { LinearGradient } from "expo-linear-gradient";
// import { useFocusEffect } from "@react-navigation/native";
// import { useSelector } from "react-redux";
// import { selectUserId } from "../store/authSlice";
// import { useGold } from "../context/GoldContext";
// import {
//   previewBuy,
//   fetchPortfolio,
//   fetchTransactions,
// } from "../services/goldApi";

// // ─── Design Tokens ────────────────────────────────────────────────────────────
// const C = {
//   bg: "#F7F6F3",
//   card: "#FFFFFF",
//   gold: "#C8952A",
//   goldLight: "#F5ECD7",
//   goldMid: "#E8C97A",
//   navy: "#1C2340",
//   navyMid: "#3D4463",
//   navyLight: "#8891AF",
//   green: "#0E9F6E",
//   greenBg: "#ECFDF5",
//   red: "#E02424",
//   redBg: "#FEF2F2",
//   border: "#EAE8E2",
//   divider: "#F0EEE9",
//   shadow: "rgba(28,35,64,0.08)",
//   goldShadow: "rgba(200,149,42,0.25)",
// };

// const RADIUS = { sm: 10, md: 14, lg: 18, xl: 22 };
// const SHADOW = {
//   shadowColor: "rgba(28,35,64,0.08)",
//   shadowOffset: { width: 0, height: 2 },
//   shadowOpacity: 1,
//   shadowRadius: 8,
//   elevation: 3,
// };

// const DigitalGoldScreen = ({ navigation, route }) => {
//   const { state, refreshPrice } = useGold();
//   const goldRate = state.goldPrice?.pricePerGram || 16236;
//   const sellPrice = state.goldPrice?.sellPrice || 16236;
//   const lastUpdated = state.goldPrice?.lastUpdated || null;
//   const userId = useSelector(selectUserId);
//   const accessToken = route?.params?.accessToken;

//   const [buyMode, setBuyMode] = useState("rupees");
//   const [amount, setAmount] = useState("");
//   const [keyboardOffset, setKeyboardOffset] = useState(0);
//   const [previewLoading, setPreviewLoading] = useState(false);
//   const [portfolio, setPortfolio] = useState(null);
//   const [portfolioLoading, setPortfolioLoading] = useState(false);
//   const [transactions, setTransactions] = useState([]);
//   const [txnLoading, setTxnLoading] = useState(false);

//   const scrollViewRef = useRef(null);
//   const inputRef = useRef(null);

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
//       if (portfolioData.status === "fulfilled")
//         setPortfolio(portfolioData.value);
//       if (txnData.status === "fulfilled")
//         setTransactions(txnData.value.slice(0, 5));
//     } catch {
//     } finally {
//       setPortfolioLoading(false);
//       setTxnLoading(false);
//     }
//   }, [userId]);

//   useFocusEffect(
//     useCallback(() => {
//       refreshPrice();
//       loadScreenData();
//     }, [refreshPrice, loadScreenData]),
//   );

//   const goldBalance =
//     portfolio?.totalGoldGrams ?? state.portfolio?.totalGrams ?? 0;
//   const currentValue = portfolio?.currentValue ?? goldBalance * goldRate;
//   const totalInvested =
//     portfolio?.totalInvestedAmount ?? state.portfolio?.totalInvested ?? 0;
//   const totalGain = portfolio?.totalGain ?? currentValue - totalInvested;
//   const gainPercent = portfolio?.gainPercentage ?? 0;
//   const isProfit = totalGain >= 0;

//   useEffect(() => {
//     const show = Keyboard.addListener("keyboardDidShow", (e) => {
//       setKeyboardOffset(e.endCoordinates.height);
//       setTimeout(
//         () => scrollViewRef.current?.scrollTo({ y: 200, animated: true }),
//         100,
//       );
//     });
//     const hide = Keyboard.addListener("keyboardDidHide", () =>
//       setKeyboardOffset(0),
//     );
//     return () => {
//       show.remove();
//       hide.remove();
//     };
//   }, []);

//   const handleBuyGold = async () => {
//     if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
//       Alert.alert("Enter Amount", "Please enter a valid amount to proceed");
//       return;
//     }
//     const numAmount = parseFloat(amount);
//     if (buyMode === "rupees" && numAmount < 100) {
//       Alert.alert("Minimum Amount", "Minimum purchase is ₹100");
//       return;
//     }
//     if (buyMode === "grams" && numAmount <= 0) {
//       Alert.alert("Invalid Grams", "Please enter a valid gram amount");
//       return;
//     }
//     setPreviewLoading(true);
//     try {
//       const uid = userId;
//       if (!uid) {
//         Alert.alert("Session Expired", "Please login again.");
//         navigation.replace("Login");
//         return;
//       }
//       const purchaseType = buyMode === "rupees" ? "AMOUNT" : "GRAMS";
//       let sendAmount = 0,
//         sendGrams = 0;
//       if (buyMode === "rupees") {
//         const gst = Math.round(numAmount * 0.03 * 100) / 100;
//         const goldValue = Math.round((numAmount - gst) * 100) / 100;
//         sendAmount = Math.round(numAmount * 100) / 100;
//         sendGrams = goldValue / goldRate;
//       } else {
//         sendGrams = Math.round(numAmount * 1000000) / 1000000;
//         const goldValue = Math.round(sendGrams * goldRate * 100) / 100;
//         const gst = Math.round(goldValue * 0.03 * 100) / 100;
//         sendAmount = Math.round((goldValue + gst) * 100) / 100;
//       }
//       const preview = await previewBuy({
//         userId: uid,
//         purchaseType,
//         amount: sendAmount,
//         grams: sendGrams,
//         pergramBuyingPrice: goldRate,
//       });
//       if (!preview)
//         throw new Error("Failed to get order preview. Please try again.");
//       navigation.navigate("PaymentReview", { preview, buyMode, goldRate });
//     } catch (e) {
//       Alert.alert(
//         "Error",
//         e.message || "Failed to preview order. Please try again.",
//       );
//     } finally {
//       setPreviewLoading(false);
//     }
//   };

//   const gramsPreview =
//     amount && !isNaN(parseFloat(amount)) && buyMode === "rupees"
//       ? (parseFloat(amount) / goldRate).toFixed(4)
//       : null;
//   const rupeesPreview =
//     amount && !isNaN(parseFloat(amount)) && buyMode === "grams"
//       ? (parseFloat(amount) * goldRate).toLocaleString("en-IN", {
//           maximumFractionDigits: 0,
//         })
//       : null;

//   return (
//     <SafeAreaView style={s.container} edges={["top"]} backgroundColor="#13100A">
//       <StatusBar barStyle="light-content" backgroundColor="#13100A" />

//       {/* ─── Header ─────────────────────────────────────────────────── */}
//       <View style={s.header}>
//         <TouchableOpacity
//           style={s.backBtn}
//           onPress={() => navigation.goBack()}
//           activeOpacity={0.7}
//         >
//           <Text style={s.backBtnText}>‹</Text>
//         </TouchableOpacity>
//         <Text style={s.headerTitle}>Digital Gold</Text>
//         <View style={s.liveChip}>
//           <View style={s.liveDot} />
//           <Text style={s.liveLabel}>LIVE</Text>
//         </View>
//       </View>

//       <ScrollView
//         ref={scrollViewRef}
//         showsVerticalScrollIndicator={false}
//         bounces={false}
//         contentContainerStyle={[
//           s.scroll,
//           { paddingBottom: keyboardOffset > 0 ? keyboardOffset + 24 : 40 },
//         ]}
//         keyboardShouldPersistTaps="handled"
//       >
//         {/* ─── Hero: Price + Portfolio ──────────────────────────────── */}
//         <LinearGradient
//           colors={["#1C2340", "#2A3260", "#1C2340"]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 1 }}
//           style={s.heroCard}
//         >
//           <View style={s.heroRing1} />
//           <View style={s.heroRing2} />

//           {/* Top row: price + coin */}
//           <View style={s.heroPriceRow}>
//             <View>
//               <Text style={s.heroPurity}>24K Gold · 999.9 Pure</Text>
//               <Text style={s.heroPrice}>
//                 ₹
//                 {goldRate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
//               </Text>
//               <Text style={s.heroPriceSub}>
//                 per gram{lastUpdated ? `   ·   ${lastUpdated}` : ""}
//               </Text>
//             </View>
//             <View style={s.heroCoin}>
//               <View style={s.coinInner}>
//                 <Text style={s.coinKarat}>24K</Text>
//                 <View style={s.coinLine} />
//                 <Text style={s.coinPurity}>999.9</Text>
//                 <Text style={s.coinPure}>PURE</Text>
//               </View>
//             </View>
//           </View>

//           <View style={s.heroDivider} />

//           {/* Bottom: portfolio */}
//           <View style={s.heroPortfolio}>
//             <View>
//               <Text style={s.heroPortLabel}>YOUR PORTFOLIO</Text>
//               {portfolioLoading ? (
//                 <ActivityIndicator
//                   color={C.goldMid}
//                   size="small"
//                   style={{ marginTop: 10 }}
//                 />
//               ) : (
//                 <>
//                   <Text style={s.heroPortValue}>
//                     ₹
//                     {currentValue.toLocaleString("en-IN", {
//                       maximumFractionDigits: 0,
//                     })}
//                   </Text>
//                   <Text style={s.heroPortGrams}>
//                     {goldBalance.toFixed(4)} grams
//                   </Text>
//                 </>
//               )}
//             </View>
//             {!portfolioLoading && (
//               <View style={[s.heroGainTag, !isProfit && s.heroGainTagRed]}>
//                 <Text style={[s.heroGainPct, !isProfit && s.heroGainRed]}>
//                   {isProfit ? "▲" : "▼"} {gainPercent.toFixed(2)}%
//                 </Text>
//                 <Text style={[s.heroGainAmt, !isProfit && s.heroGainAmtRed]}>
//                   ₹
//                   {Math.abs(totalGain).toLocaleString("en-IN", {
//                     maximumFractionDigits: 0,
//                   })}
//                 </Text>
//               </View>
//             )}
//           </View>
//         </LinearGradient>

//         {/* ─── Gold Savings + Sell ──────────────────────────────────── */}
//         <View style={s.savingsCard}>
//           <View style={s.savingsLeft}>
//             <Text style={s.savingsLabel}>GOLD SAVINGS</Text>
//             <Text style={s.savingsGrams}>
//               {goldBalance.toFixed(4)}
//               <Text style={s.savingsUnit}> g</Text>
//             </Text>
//             <Text style={s.savingsInvested}>
//               Invested ₹
//               {totalInvested.toLocaleString("en-IN", {
//                 maximumFractionDigits: 0,
//               })}
//             </Text>
//           </View>
//           {goldBalance > 0 && (
//             <TouchableOpacity
//               onPress={() => navigation.navigate("SellGold")}
//               activeOpacity={0.85}
//               style={s.sellBtn}
//             >
//               <Text style={s.sellBtnLabel}>Sell Gold</Text>
//               <Text style={s.sellBtnRate}>
//                 @ ₹
//                 {sellPrice.toLocaleString("en-IN", {
//                   maximumFractionDigits: 0,
//                 })}
//                 /g
//               </Text>
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* ─── Buy Gold ─────────────────────────────────────────────── */}
//         <View style={s.card}>
//           <View style={s.cardTop}>
//             <Text style={s.cardTitle}>Buy Gold</Text>
//             <View style={s.ratePill}>
//               <Text style={s.ratePillText}>
//                 ₹
//                 {goldRate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
//                 /g
//               </Text>
//             </View>
//           </View>

//           {/* Mode Toggle */}
//           <View style={s.toggle}>
//             {["rupees", "grams"].map((mode) => (
//               <TouchableOpacity
//                 key={mode}
//                 onPress={() => {
//                   setBuyMode(mode);
//                   setAmount("");
//                 }}
//                 style={[s.toggleTab, buyMode === mode && s.toggleTabActive]}
//                 activeOpacity={0.8}
//               >
//                 <Text
//                   style={[
//                     s.toggleTabText,
//                     buyMode === mode && s.toggleTabTextActive,
//                   ]}
//                 >
//                   {mode === "rupees" ? "₹  Rupees" : "⚖  Grams"}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>

//           {/* Input */}
//           <View style={s.inputBox}>
//             <Text style={s.inputSymbol}>
//               {buyMode === "rupees" ? "₹" : "g"}
//             </Text>
//             <TextInput
//               ref={inputRef}
//               style={s.input}
//               placeholder={buyMode === "rupees" ? "0" : "0.0000"}
//               placeholderTextColor="#CCCAC3"
//               value={amount}
//               onChangeText={setAmount}
//               keyboardType="numeric"
//               returnKeyType="done"
//               onSubmitEditing={() => Keyboard.dismiss()}
//             />
//           </View>

//           {/* Equivalent row */}
//           {gramsPreview || rupeesPreview ? (
//             <View style={s.equivRow}>
//               <Text style={s.equivText}>
//                 {gramsPreview
//                   ? `≈ ${gramsPreview} grams`
//                   : `≈ ₹${rupeesPreview}`}
//               </Text>
//               <Text style={s.equivGst}>Incl. 3% GST</Text>
//             </View>
//           ) : (
//             <Text style={s.inputHint}>
//               {buyMode === "rupees"
//                 ? "Minimum purchase ₹100  ·  Incl. 3% GST"
//                 : "Live rate  ·  Incl. 3% GST"}
//             </Text>
//           )}

//           {/* Quick chips */}
//           {buyMode === "rupees" && (
//             <View style={s.chips}>
//               {[
//                 ["100", "₹100"],
//                 ["500", "₹500"],
//                 ["1000", "₹1K"],
//                 ["10000", "₹10K"],
//               ].map(([val, label]) => (
//                 <TouchableOpacity
//                   key={val}
//                   onPress={() => setAmount(val)}
//                   style={[s.chip, amount === val && s.chipActive]}
//                   activeOpacity={0.75}
//                 >
//                   <Text
//                     style={[s.chipText, amount === val && s.chipTextActive]}
//                   >
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           )}

//           {/* CTA */}
//           <TouchableOpacity
//             onPress={handleBuyGold}
//             disabled={previewLoading}
//             activeOpacity={0.88}
//             style={[s.buyBtn, previewLoading && { opacity: 0.6 }]}
//           >
//             <LinearGradient
//               colors={["#D4A535", "#C8952A", "#B8841E"]}
//               start={{ x: 0, y: 0 }}
//               end={{ x: 1, y: 0 }}
//               style={s.buyBtnGrad}
//             >
//               {previewLoading ? (
//                 <ActivityIndicator color="#fff" size="small" />
//               ) : (
//                 <Text style={s.buyBtnText}>Proceed to Buy →</Text>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>
//         </View>

//         {/* ─── Silver Savings ───────────────────────────────────────── */}
//         {/* <View style={s.section}>
// <Text style={s.sectionTitle}>Silver Savings</Text>
//           <View style={s.twoCol}>
//             <TouchableOpacity style={s.featureCard} activeOpacity={0.8}>
//               <LinearGradient
//                 colors={["#F5F4FF", "#ECEAFF"]}
//                 style={s.featureCardInner}
//               >
//                 <Text style={s.featureEmoji}>🥈</Text>
//                 <Text style={s.featureTitle}>Save Daily</Text>
//                 <Text style={s.featureSub}>From ₹5/day</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//             <TouchableOpacity style={s.featureCard} activeOpacity={0.8}>
//               <LinearGradient
//                 colors={["#F5F4FF", "#ECEAFF"]}
//                 style={s.featureCardInner}
//               >
//                 <View style={s.featureEmojiWrap}>
//                   <Text style={s.featureEmoji}>💎</Text>
//                   <View style={s.newTag}>
//                     <Text style={s.newTagText}>NEW</Text>
//                   </View>
//                 </View>
//                 <Text style={s.featureTitle}>Buy Silver</Text>
//                 <Text style={s.featureSub}>₹78/gram today</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </View>
//         </View>
//         <TouchableOpacity
//           style={s.physicalGoldBtn}
//           onPress={() => navigation.navigate("PgHome", { accessToken, userId })}
//           activeOpacity={0.87}
//         >
//           <View style={s.pgBtnLeft}>
//             <Text style={s.pgBtnIcon}>🏆</Text>
//             <View>
//               <Text style={s.pgBtnTitle}>Physical Gold</Text>
//               <Text style={s.pgBtnSub}>BIS Hallmarked · Certified</Text>
//             </View>
//           </View>
//           <Text style={s.pgBtnArrow}>›</Text>
//         </TouchableOpacity> */}
//         {/* ─── Jewellery Scheme ─────────────────────────────────────── */}
//         {/* <View style={s.section}>
//           <Text style={s.sectionTitle}>Jewellery Scheme</Text>
//           <TouchableOpacity style={s.jewCard} activeOpacity={0.8}>
//             <View style={s.jewIconBox}>
//               <Text style={s.jewEmoji}>💍</Text>
//             </View>
//             <View style={s.jewContent}>
//               <Text style={s.jewTitle}>CaratLane Gold Plan</Text>
//               <Text style={s.jewSub}>Save monthly, get jewellery</Text>
//               <Text style={s.jewDetail}>11 months savings + 1 month free</Text>
//             </View>
//             <Text style={s.jewArrow}>›</Text>
//           </TouchableOpacity>
//         </View> */}

//         {/* ─── Recent Transactions ──────────────────────────────────── */}
//         <View style={s.section}>
//           <View style={s.sectionRowHeader}>
//             <Text style={s.sectionTitle}>Recent Transactions</Text>
//             <TouchableOpacity
//               onPress={() => navigation.navigate("Transactions")}
//             >
//               <Text style={s.viewAll}>View All ›</Text>
//             </TouchableOpacity>
//           </View>
//           <View style={s.txnCard}>
//             {txnLoading ? (
//               <ActivityIndicator
//                 color={C.gold}
//                 style={{ marginVertical: 28 }}
//               />
//             ) : transactions.length === 0 ? (
//               <View style={s.emptyState}>
//                 <Text style={s.emptyIcon}>📭</Text>
//                 <Text style={s.emptyText}>No transactions yet</Text>
//               </View>
//             ) : (
//               transactions.map((txn, i) => {
//                 const isBuy = txn.type === "BUY";
//                 return (
//                   <View
//                     key={txn.id}
//                     style={[
//                       s.txnRow,
//                       i < transactions.length - 1 && s.txnBorder,
//                     ]}
//                   >
//                     <View
//                       style={[s.txnDot, isBuy ? s.txnDotBuy : s.txnDotSell]}
//                     >
//                       <Text
//                         style={{
//                           fontSize: 16,
//                           fontWeight: "700",
//                           color: isBuy ? C.green : C.red,
//                         }}
//                       >
//                         {isBuy ? "↑" : "↓"}
//                       </Text>
//                     </View>
//                     <View style={s.txnMid}>
//                       <Text style={s.txnType}>
//                         {isBuy ? "Bought Gold" : "Sold Gold"}
//                       </Text>
//                       <Text style={s.txnDate}>
//                         {new Date(txn.timestamp).toLocaleDateString("en-IN", {
//                           day: "2-digit",
//                           month: "short",
//                           year: "numeric",
//                         })}
//                       </Text>
//                     </View>
//                     <View style={s.txnRight}>
//                       <Text style={s.txnAmt}>
//                         ₹
//                         {txn.amount.toLocaleString("en-IN", {
//                           maximumFractionDigits: 0,
//                         })}
//                       </Text>
//                       <Text style={s.txnGrams}>{txn.grams.toFixed(4)} g</Text>
//                     </View>
//                   </View>
//                 );
//               })
//             )}
//           </View>
//         </View>

//         {/* ─── PAN Alert ────────────────────────────────────────────── */}
//         <View style={s.panAlert}>
//           <Text style={s.panAlertIcon}>🪪</Text>
//           <View style={s.panAlertContent}>
//             <Text style={s.panAlertTitle}>Verify your PAN</Text>
//             <Text style={s.panAlertSub}>
//               Required for purchases above ₹50,000
//             </Text>
//           </View>
//           <TouchableOpacity style={s.panBtn} activeOpacity={0.8}>
//             <Text style={s.panBtnText}>Verify</Text>
//           </TouchableOpacity>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// // ─── Styles ───────────────────────────────────────────────────────────────────
// const s = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#13100A" },

//   // Header
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     paddingTop: Platform.OS === "ios" ? 10 : 14,
//     paddingBottom: 14,
//     backgroundColor: "#13100A",
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(212,168,67,0.2)",
//   },
//   backBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 12,
//     backgroundColor: "rgba(212,168,67,0.12)",
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "rgba(212,168,67,0.3)",
//   },
//   backBtnText: {
//     fontSize: 28,
//     lineHeight: 32,
//     color: "#D4A843",
//     fontWeight: "300",
//     marginTop: -2,
//   },
//   headerTitle: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: "#D4A843",
//     letterSpacing: 0.2,
//   },
//   liveChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     backgroundColor: "rgba(212,168,67,0.12)",
//     borderRadius: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 7,
//     borderWidth: 1,
//     borderColor: "rgba(212,168,67,0.35)",
//   },
//   liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D4A843" },
//   liveLabel: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: "#D4A843",
//     letterSpacing: 0.8,
//   },

//   scroll: { paddingBottom: 40, backgroundColor: "#F7F6F3" },

//   // Hero card
//   heroCard: {
//     marginHorizontal: 16,
//     marginTop: 20,
//     marginBottom: 14,
//     borderRadius: 22,
//     padding: 22,
//     overflow: "hidden",
//   },
//   heroRing1: {
//     position: "absolute",
//     width: 220,
//     height: 220,
//     borderRadius: 110,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.05)",
//     right: -60,
//     top: -70,
//   },
//   heroRing2: {
//     position: "absolute",
//     width: 130,
//     height: 130,
//     borderRadius: 65,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.04)",
//     right: -10,
//     top: -10,
//   },
//   heroPriceRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//     marginBottom: 20,
//   },
//   heroPurity: {
//     fontSize: 11,
//     fontWeight: "600",
//     color: "rgba(255,255,255,0.45)",
//     letterSpacing: 1,
//     marginBottom: 8,
//   },
//   heroPrice: {
//     fontSize: 34,
//     fontWeight: "800",
//     color: "#E8C97A",
//     letterSpacing: -1,
//     marginBottom: 4,
//   },
//   heroPriceSub: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
//   heroCoin: {
//     width: 86,
//     height: 86,
//     borderRadius: 43,
//     backgroundColor: "#2A3158",
//     borderWidth: 2,
//     borderColor: "#D4A843",
//     padding: 5,
//     shadowColor: "#D4A843",
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.4,
//     shadowRadius: 12,
//     elevation: 10,
//   },
//   coinInner: {
//     flex: 1,
//     borderRadius: 38,
//     backgroundColor: "#D4A843",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   coinKarat: {
//     fontSize: 22,
//     fontWeight: "900",
//     color: "#1C2340",
//     lineHeight: 24,
//   },
//   coinLine: {
//     width: 32,
//     height: 1.5,
//     backgroundColor: "rgba(28,35,64,0.35)",
//     marginVertical: 3,
//   },
//   coinPurity: {
//     fontSize: 11,
//     fontWeight: "800",
//     color: "#1C2340",
//     lineHeight: 13,
//   },
//   coinPure: {
//     fontSize: 7.5,
//     fontWeight: "700",
//     color: "rgba(28,35,64,0.55)",
//     letterSpacing: 1.8,
//     marginTop: 2,
//   },
//   heroDivider: {
//     height: 1,
//     backgroundColor: "rgba(255,255,255,0.08)",
//     marginBottom: 20,
//   },
//   heroPortfolio: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   heroPortLabel: {
//     fontSize: 10,
//     fontWeight: "700",
//     color: "rgba(255,255,255,0.35)",
//     letterSpacing: 1.5,
//     marginBottom: 8,
//   },
//   heroPortValue: {
//     fontSize: 28,
//     fontWeight: "800",
//     color: "#FFFFFF",
//     letterSpacing: -0.5,
//     marginBottom: 4,
//   },
//   heroPortGrams: { fontSize: 13, color: "rgba(255,255,255,0.38)" },
//   heroGainTag: {
//     backgroundColor: "rgba(14,159,110,0.15)",
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: "rgba(14,159,110,0.25)",
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     alignItems: "center",
//     minWidth: 90,
//   },
//   heroGainTagRed: {
//     backgroundColor: "rgba(224,36,36,0.12)",
//     borderColor: "rgba(224,36,36,0.22)",
//   },
//   heroGainPct: {
//     fontSize: 13,
//     fontWeight: "700",
//     color: "#0E9F6E",
//     marginBottom: 3,
//   },
//   heroGainRed: { color: "#E02424" },
//   heroGainAmt: { fontSize: 11, color: "rgba(14,159,110,0.75)" },
//   heroGainAmtRed: { color: "rgba(224,36,36,0.7)" },

//   // Savings card
//   savingsCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     backgroundColor: "#FFFFFF",
//     marginHorizontal: 16,
//     marginBottom: 14,
//     borderRadius: 18,
//     padding: 18,
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//     shadowColor: "rgba(28,35,64,0.08)",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 1,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   savingsLeft: {},
//   savingsLabel: {
//     fontSize: 10,
//     fontWeight: "700",
//     color: "#8891AF",
//     letterSpacing: 1.2,
//     marginBottom: 6,
//   },
//   savingsGrams: {
//     fontSize: 24,
//     fontWeight: "800",
//     color: "#C8952A",
//     letterSpacing: -0.5,
//     marginBottom: 4,
//   },
//   savingsUnit: { fontSize: 15, fontWeight: "500", color: "#8891AF" },
//   savingsInvested: { fontSize: 12, color: "#8891AF" },
//   sellBtn: {
//     backgroundColor: "#FEF2F2",
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "#FECACA",
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     alignItems: "center",
//   },
//   sellBtnLabel: {
//     fontSize: 13,
//     fontWeight: "700",
//     color: "#E02424",
//     marginBottom: 3,
//   },
//   sellBtnRate: { fontSize: 11, color: "#F87171", fontWeight: "500" },

//   // Card
//   card: {
//     backgroundColor: "#FFFFFF",
//     marginHorizontal: 16,
//     marginBottom: 16,
//     borderRadius: 22,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//     shadowColor: "rgba(28,35,64,0.08)",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 1,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   cardTop: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 18,
//   },
//   cardTitle: {
//     fontSize: 20,
//     fontWeight: "800",
//     color: "#1C2340",
//     letterSpacing: -0.3,
//   },
//   ratePill: {
//     backgroundColor: "#F5ECD7",
//     borderRadius: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 5,
//     borderWidth: 1,
//     borderColor: "#E8C97A",
//   },
//   ratePillText: { fontSize: 12, fontWeight: "700", color: "#C8952A" },

//   // Toggle
//   toggle: {
//     flexDirection: "row",
//     backgroundColor: "#F7F6F3",
//     borderRadius: 14,
//     padding: 4,
//     marginBottom: 18,
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//   },
//   toggleTab: {
//     flex: 1,
//     paddingVertical: 11,
//     alignItems: "center",
//     borderRadius: 10,
//   },
//   toggleTabActive: {
//     backgroundColor: "#FFFFFF",
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//     shadowColor: "rgba(28,35,64,0.06)",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   toggleTabText: { fontSize: 14, fontWeight: "500", color: "#8891AF" },
//   toggleTabTextActive: { color: "#1C2340", fontWeight: "700" },

//   // Input
//   inputBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#F7F6F3",
//     borderRadius: 14,
//     borderWidth: 1.5,
//     borderColor: "#EAE8E2",
//     paddingHorizontal: 18,
//     marginBottom: 12,
//   },
//   inputSymbol: {
//     fontSize: 26,
//     fontWeight: "700",
//     color: "#C8952A",
//     marginRight: 6,
//   },
//   input: {
//     flex: 1,
//     fontSize: 30,
//     fontWeight: "700",
//     color: "#1C2340",
//     paddingVertical: 16,
//   },
//   equivRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "#F5ECD7",
//     borderRadius: 10,
//     paddingHorizontal: 14,
//     paddingVertical: 9,
//     marginBottom: 14,
//     borderWidth: 1,
//     borderColor: "#E8C97A",
//   },
//   equivText: { fontSize: 13, fontWeight: "600", color: "#C8952A" },
//   equivGst: { fontSize: 11, color: "#A07830", fontWeight: "500" },
//   inputHint: { fontSize: 12, color: "#8891AF", marginBottom: 16 },

//   // Chips
//   chips: { flexDirection: "row", gap: 8, marginBottom: 18 },
//   chip: {
//     flex: 1,
//     paddingVertical: 10,
//     borderRadius: 10,
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//     backgroundColor: "#F7F6F3",
//   },
//   chipActive: { borderColor: "#C8952A", backgroundColor: "#F5ECD7" },
//   chipText: { fontSize: 13, fontWeight: "600", color: "#8891AF" },
//   chipTextActive: { color: "#C8952A" },

//   // Buy button
//   buyBtn: {
//     borderRadius: 14,
//     overflow: "hidden",
//     shadowColor: "rgba(200,149,42,0.35)",
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 1,
//     shadowRadius: 14,
//     elevation: 6,
//   },
//   buyBtnGrad: { paddingVertical: 17, alignItems: "center", borderRadius: 14 },
//   buyBtnText: {
//     fontSize: 16,
//     fontWeight: "800",
//     color: "#FFFFFF",
//     letterSpacing: 0.2,
//   },

//   // Section
//   section: { marginBottom: 20 },
//   sectionTitle: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: "#1C2340",
//     marginHorizontal: 20,
//     marginBottom: 12,
//   },
//   sectionRowHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginHorizontal: 20,
//     marginBottom: 12,
//   },
//   viewAll: { fontSize: 13, fontWeight: "600", color: "#C8952A" },

//   // Two col
//   twoCol: { flexDirection: "row", marginHorizontal: 16, gap: 12 },
//   featureCard: {
//     flex: 1,
//     borderRadius: 18,
//     overflow: "hidden",
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//     shadowColor: "rgba(28,35,64,0.06)",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 1,
//     shadowRadius: 6,
//     elevation: 2,
//   },
//   featureCardInner: {
//     alignItems: "center",
//     paddingVertical: 22,
//     paddingHorizontal: 12,
//   },
//   featureEmojiWrap: { position: "relative", marginBottom: 2 },
//   featureEmoji: { fontSize: 34, marginBottom: 10 },
//   newTag: {
//     position: "absolute",
//     top: -4,
//     right: -14,
//     backgroundColor: "#E02424",
//     borderRadius: 6,
//     paddingHorizontal: 5,
//     paddingVertical: 2,
//   },
//   newTagText: {
//     fontSize: 8,
//     fontWeight: "800",
//     color: "#FFF",
//     letterSpacing: 0.5,
//   },
//   featureTitle: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#1C2340",
//     marginBottom: 4,
//     textAlign: "center",
//   },
//   featureSub: { fontSize: 12, color: "#8891AF", textAlign: "center" },

//   // Jewellery
//   jewCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFFFF",
//     marginHorizontal: 16,
//     borderRadius: 18,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//     shadowColor: "rgba(28,35,64,0.06)",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 1,
//     shadowRadius: 6,
//     elevation: 2,
//   },
//   jewIconBox: {
//     width: 48,
//     height: 48,
//     borderRadius: 14,
//     backgroundColor: "#F5ECD7",
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 14,
//     borderWidth: 1,
//     borderColor: "#E8C97A",
//   },
//   jewEmoji: { fontSize: 22 },
//   jewContent: { flex: 1 },
//   jewTitle: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: "#1C2340",
//     marginBottom: 3,
//   },
//   jewSub: { fontSize: 13, color: "#8891AF", marginBottom: 3 },
//   jewDetail: { fontSize: 12, color: "#C8952A", fontWeight: "500" },
//   jewArrow: { fontSize: 24, color: "#8891AF", fontWeight: "300" },

//   // Transactions
//   txnCard: {
//     backgroundColor: "#FFFFFF",
//     marginHorizontal: 16,
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//     overflow: "hidden",
//     shadowColor: "rgba(28,35,64,0.06)",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 1,
//     shadowRadius: 6,
//     elevation: 2,
//   },
//   emptyState: { alignItems: "center", paddingVertical: 32 },
//   emptyIcon: { fontSize: 32, marginBottom: 10 },
//   emptyText: { fontSize: 14, color: "#8891AF" },
//   txnRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//   },
//   txnBorder: { borderBottomWidth: 1, borderBottomColor: "#F0EEE9" },
//   txnDot: {
//     width: 38,
//     height: 38,
//     borderRadius: 12,
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 14,
//   },
//   txnDotBuy: { backgroundColor: "#ECFDF5" },
//   txnDotSell: { backgroundColor: "#FEF2F2" },
//   txnMid: { flex: 1 },
//   txnType: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#1C2340",
//     marginBottom: 3,
//   },
//   txnDate: { fontSize: 12, color: "#8891AF" },
//   txnRight: { alignItems: "flex-end" },
//   txnAmt: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#1C2340",
//     marginBottom: 3,
//   },
//   txnGrams: { fontSize: 12, color: "#C8952A", fontWeight: "500" },

//   //...............//
//   physicalGoldBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     backgroundColor: "#FFFFFF",
//     marginHorizontal: 16,
//     marginBottom: 20,
//     borderRadius: 18,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: "#EAE8E2",
//     shadowColor: "rgba(28,35,64,0.08)",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 1,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   pgBtnLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 14,
//     flex: 1,
//   },
//   pgBtnIcon: {
//     fontSize: 28,
//   },
//   pgBtnTitle: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: "#1C2340",
//     marginBottom: 3,
//   },
//   pgBtnSub: {
//     fontSize: 12,
//     color: "#8891AF",
//   },
//   pgBtnArrow: {
//     fontSize: 24,
//     color: "#8891AF",
//     fontWeight: "300",
//   },

//   // PAN Alert
//   panAlert: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFBEB",
//     marginHorizontal: 16,
//     marginTop: 4,
//     borderRadius: 18,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: "#FDE68A",
//   },
//   panAlertIcon: { fontSize: 22, marginRight: 12 },
//   panAlertContent: { flex: 1 },
//   panAlertTitle: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#92400E",
//     marginBottom: 3,
//   },
//   panAlertSub: { fontSize: 12, color: "#B45309" },
//   panBtn: {
//     backgroundColor: "#C8952A",
//     borderRadius: 20,
//     paddingHorizontal: 18,
//     paddingVertical: 9,
//     shadowColor: "rgba(200,149,42,0.3)",
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 1,
//     shadowRadius: 6,
//     elevation: 4,
//   },
//   panBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
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
    <SafeAreaView style={s.container} edges={["top"]} backgroundColor="#13100A">
      <StatusBar barStyle="light-content" backgroundColor="#13100A" />

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
        {/* ─── Hero Banner ──────────────────────────────────────────── */}
        <LinearGradient
          colors={["#0F1628", "#1C2340", "#252D52"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          {/* Decorative rings */}
          <View style={s.heroRing1} />
          <View style={s.heroRing2} />
          <View style={s.heroRing3} />

          {/* ── Live Price Row ───────────────────────── */}
          <View style={s.livePriceSection}>
            {/* Left: purity badge + price */}
            <View style={s.priceBlock}>
              <View style={s.purityBadge}>
                <Text style={s.purityBadgeText}>24K · 999.9 PURE</Text>
              </View>
              <Text style={s.heroPrice}>
                ₹{goldRate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </Text>
              <View style={s.priceMetaRow}>
                <Text style={s.priceMetaLabel}>per gram</Text>
                {lastUpdated ? (
                  <View style={s.updatedChip}>
                    <Text style={s.updatedText}>{lastUpdated}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Right: buy / sell rates */}
            <View style={s.ratesBlock}>
              <View style={s.rateItem}>
                <Text style={s.rateItemLabel}>BUY</Text>
                <Text style={s.rateItemValue}>
                  ₹{goldRate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={s.rateSep} />
              <View style={s.rateItem}>
                <Text style={s.rateItemLabel}>SELL</Text>
                <Text style={[s.rateItemValue, { color: "#F87171" }]}>
                  ₹{sellPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Divider ──────────────────────────────── */}
          <View style={s.heroDivider} />

          {/* ── Portfolio Section ────────────────────── */}
          <View style={s.portfolioSection}>
            <View style={s.portfolioHeader}>
              <Text style={s.portfolioLabel}>MY PORTFOLIO</Text>
              {!portfolioLoading && goldBalance > 0 && (
                <View style={[s.gainBadge, !isProfit && s.gainBadgeRed]}>
                  <Text style={[s.gainBadgeText, !isProfit && s.gainBadgeTextRed]}>
                    {isProfit ? "▲" : "▼"} {gainPercent.toFixed(2)}%
                  </Text>
                </View>
              )}
            </View>

            {portfolioLoading ? (
              <ActivityIndicator color={C.goldMid} size="small" style={{ marginTop: 12 }} />
            ) : (
              <View style={s.portfolioGrid}>
                {/* Current Value */}
                <View style={s.portfolioMainValue}>
                  <Text style={s.portfolioValueBig}>
                    ₹{currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={s.portfolioValueSub}>Current Value</Text>
                </View>

                {/* Stats row */}
                <View style={s.portfolioStatsRow}>
                  <View style={s.portfolioStat}>
                    <Text style={s.portfolioStatVal}>
                      {goldBalance.toFixed(4)}g
                    </Text>
                    <Text style={s.portfolioStatLabel}>Gold Held</Text>
                  </View>

                  <View style={s.portfolioStatDivider} />

                  <View style={s.portfolioStat}>
                    <Text style={s.portfolioStatVal}>
                      ₹{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </Text>
                    <Text style={s.portfolioStatLabel}>Invested</Text>
                  </View>

                  <View style={s.portfolioStatDivider} />

                  <View style={s.portfolioStat}>
                    <Text style={[
                      s.portfolioStatVal,
                      { color: isProfit ? "#4ADE80" : "#F87171" }
                    ]}>
                      {isProfit ? "+" : "-"}₹{Math.abs(totalGain).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </Text>
                    <Text style={s.portfolioStatLabel}>P&amp;L</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ─── Sell Gold strip (only when holding gold) ─────────────── */}
        {goldBalance > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate("SellGold")}
            activeOpacity={0.85}
            style={s.sellStrip}
          >
            <View style={s.sellStripLeft}>
              <View style={s.sellStripDot} />
              <Text style={s.sellStripLabel}>Sell Gold</Text>
            </View>
            <View style={s.sellStripRight}>
              <Text style={s.sellStripRate}>
                @ ₹{sellPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/g
              </Text>
              <Text style={s.sellStripArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ─── Buy Gold ─────────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardTop}>
            <Text style={s.cardTitle}>Buy Gold</Text>
            <View style={s.ratePill}>
              <Text style={s.ratePillText}>
                ₹{goldRate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/g
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

        {/* ─── Recent Transactions ──────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionRowHeader}>
            <Text style={s.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Transactions")}
            >
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
  container: { flex: 1, backgroundColor: "#13100A" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 14,
    paddingBottom: 14,
    backgroundColor: "#13100A",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,168,67,0.2)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(212,168,67,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.3)",
  },
  backBtnText: {
    fontSize: 28,
    lineHeight: 32,
    color: "#D4A843",
    fontWeight: "300",
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#D4A843",
    letterSpacing: 0.2,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(212,168,67,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.35)",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D4A843" },
  liveLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4A843",
    letterSpacing: 0.8,
  },

  scroll: { paddingBottom: 40, backgroundColor: "#F7F6F3" },

  // ── Hero Card ──────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 14,
    borderRadius: 24,
    padding: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.18)",
  },
  heroRing1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.06)",
    right: -80,
    top: -80,
  },
  heroRing2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.05)",
    right: -20,
    top: -20,
  },
  heroRing3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(212,168,67,0.04)",
    left: -30,
    bottom: -30,
  },

  // Live price section (top half of hero)
  livePriceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
  },
  priceBlock: {
    flex: 1,
  },
  purityBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,168,67,0.15)",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.28)",
    marginBottom: 10,
  },
  purityBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D4A843",
    letterSpacing: 1.2,
  },
  heroPrice: {
    fontSize: 38,
    fontWeight: "800",
    color: "#E8C97A",
    letterSpacing: -1.2,
    marginBottom: 6,
  },
  priceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceMetaLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "500",
  },
  updatedChip: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  updatedText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "500",
  },

  // Buy/Sell rates block (top-right)
  ratesBlock: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    minWidth: 110,
  },
  rateItem: {
    alignItems: "center",
  },
  rateItemLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  rateItemValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4ADE80",
  },
  rateSep: {
    width: "80%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 10,
  },

  // Divider between price and portfolio
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(212,168,67,0.12)",
    marginHorizontal: 0,
  },

  // Portfolio section (bottom half of hero)
  portfolioSection: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 22,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  portfolioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  portfolioLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.8,
  },
  gainBadge: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gainBadgeRed: {
    backgroundColor: "rgba(248,113,113,0.12)",
    borderColor: "rgba(248,113,113,0.22)",
  },
  gainBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4ADE80",
  },
  gainBadgeTextRed: {
    color: "#F87171",
  },
  portfolioGrid: {},
  portfolioMainValue: {
    marginBottom: 16,
  },
  portfolioValueBig: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    marginBottom: 3,
  },
  portfolioValueSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "500",
  },

  // 3-col stats row inside portfolio
  portfolioStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  portfolioStat: {
    flex: 1,
    alignItems: "center",
  },
  portfolioStatVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E8C97A",
    marginBottom: 3,
  },
  portfolioStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "500",
    letterSpacing: 0.4,
  },
  portfolioStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // ── Sell strip ────────────────────────────────────────────────────
  sellStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  sellStripLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sellStripDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E02424",
  },
  sellStripLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E02424",
  },
  sellStripRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sellStripRate: {
    fontSize: 13,
    color: "#F87171",
    fontWeight: "600",
  },
  sellStripArrow: {
    fontSize: 22,
    color: "#F87171",
    fontWeight: "300",
  },

  // ── Card ──────────────────────────────────────────────────────────
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
  pgBtnIcon: { fontSize: 28 },
  pgBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C2340",
    marginBottom: 3,
  },
  pgBtnSub: { fontSize: 12, color: "#8891AF" },
  pgBtnArrow: { fontSize: 24, color: "#8891AF", fontWeight: "300" },

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