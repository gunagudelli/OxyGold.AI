// import React, { useState, useEffect, useRef } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   Animated,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useSelector } from "react-redux";
// import { selectUserId } from "../store/authSlice";
// import { apiGet, apiPost, apiDelete } from "../services/apiClient";
// import { BASE_URL } from "../constants/api";
// import PgLayout from "../../components/physical/PgLayout";

// const C = {
//   bg: "#F7F5F0",
//   surface: "#FFFFFF",
//   surfaceAlt: "#F0EDE6",
//   border: "#E8E3D8",
//   gold: "#B8891A",
//   goldLight: "#D4A82A",
//   goldBright: "#F0CC5A",
//   heroBase: "#1A1200",
//   heroBorder: "rgba(212,175,55,0.30)",
//   textPri: "#1A1508",
//   textSec: "#6B6050",
//   textTer: "#A89880",
//   error: "#C0392B",
//   errorBg: "#FEF2F2",
//   success: "#1A7A4A",
// };

// // Skeleton shimmer for initial load
// const SkeletonItem = () => {
//   const anim = useRef(new Animated.Value(0.4)).current;
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(anim, {
//           toValue: 1,
//           duration: 750,
//           useNativeDriver: true,
//         }),
//         Animated.timing(anim, {
//           toValue: 0.4,
//           duration: 750,
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, []);
//   return (
//     <Animated.View style={[styles.skeletonItem, { opacity: anim }]}>
//       <View style={styles.skeletonThumb} />
//       <View style={styles.skeletonBody}>
//         <View style={[styles.skeletonLine, { width: "70%" }]} />
//         <View style={[styles.skeletonLine, { width: "45%", marginTop: 8 }]} />
//         <View style={[styles.skeletonLine, { width: "30%", marginTop: 8 }]} />
//       </View>
//     </Animated.View>
//   );
// };

// const CardLabel = ({ text }) => (
//   <View style={styles.cardLabelRow}>
//     <View style={styles.cardLabelAccent} />
//     <Text style={styles.cardLabel}>{text}</Text>
//   </View>
// );

// const PgCartScreen = ({ navigation, route }) => {
//   const userId = useSelector(selectUserId);

//   const [cartItems, setCartItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [checkingOut, setCheckingOut] = useState(false);

//   // Per-item loading: { [cartId]: true/false }
//   const [itemLoading, setItemLoading] = useState({});

//   const [totalCartValue, setTotalCartValue] = useState(0);
//   const [totalGstCharges, setTotalGstCharges] = useState(0);
//   const [totalMakingCharges, setTotalMakingCharges] = useState(0);
//   const [totalPayableAmount, setTotalPayableAmount] = useState(0);

//   const fadeAnim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     if (userId) fetchCartData();
//   }, [userId]);

//   useEffect(() => {
//     const unsubscribe = navigation.addListener("focus", () => {
//       if (userId) fetchCartData();
//     });
//     return unsubscribe;
//   }, [navigation, userId]);

//   const applyCartData = (data) => {
//     setCartItems(data?.itemsInCart || []);
//     setTotalCartValue(data?.totalCartValue || 0);
//     setTotalGstCharges(data?.totalGstCharges || 0);
//     setTotalMakingCharges(data?.totalMakingCharges || 0);
//     setTotalPayableAmount(data?.totalPayableAmount || 0);
//   };

//   // Full page load (initial / refresh) — keeps loading state
//   const fetchCartData = async (silent = false) => {
//     if (!silent) setLoading(true);
//     const startTime = Date.now();
//     try {
//       const data = await apiGet(`${BASE_URL}/cart/customer-cart-info`, {
//         params: { customerId: userId },
//       });
//       applyCartData(data);
//     } catch (err) {
//       if (err?.status === 404) {
//         setCartItems([]);
//       } else {
//         console.error("[Cart Fetch Error]", err.message);
//         setCartItems([]);
//       }
//     } finally {
//       const elapsed = Date.now() - startTime;
//       const wait = silent ? 0 : Math.max(0, 2000 - elapsed);
//       setTimeout(() => {
//         setLoading(false);
//         Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
//       }, wait);
//     }
//   };

//   // Silent refresh after item action — only updates data, no full screen spinner
//   const silentRefresh = async (cartId) => {
//     try {
//       const data = await apiGet(`${BASE_URL}/cart/customer-cart-info`, {
//         params: { customerId: userId },
//       });
//       applyCartData(data);
//     } catch (err) {
//       if (err?.status === 404) setCartItems([]);
//     } finally {
//       setItemLoading((prev) => ({ ...prev, [cartId]: false }));
//     }
//   };

//   const setItemBusy = (cartId, busy) =>
//     setItemLoading((prev) => ({ ...prev, [cartId]: busy }));

//   const handleRemoveItem = (item) => {
//     Alert.alert("Remove Item", `Remove ${item.productName} from cart?`, [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Remove",
//         onPress: async () => {
//           setItemBusy(item.cartId, true);
//           try {
//             await apiDelete(`${BASE_URL}/cart/${item.cartId}`, {
//               params: { userId },
//             });
//             await silentRefresh(item.cartId);
//           } catch (err) {
//             console.error("Remove error:", err.message);
//             setItemBusy(item.cartId, false);
//           }
//         },
//         style: "destructive",
//       },
//     ]);
//   };

//   const handleIncrement = async (item) => {
//     setItemBusy(item.cartId, true);
//     try {
//       await apiPost(`${BASE_URL}/cart/AddItemToCart`, {
//         userId,
//         productId: item.productId,
//         productVariantId: item.productVariantId,
//         quantity: 1,
//       });
//       await silentRefresh(item.cartId);
//     } catch (err) {
//       console.error("Increment error:", err.message);
//       setItemBusy(item.cartId, false);
//     }
//   };

//   const handleDecrement = async (item) => {
//     if (item.quantity === 1) { handleRemoveItem(item); return; }
//     setItemBusy(item.cartId, true);
//     try {
//       await apiPost(`${BASE_URL}/cart/decrementCartItems`, {
//         userId,
//         id: item.cartId,
//         productId: item.productId,
//         productVariantId: item.productVariantId,
//         quantity: 1,
//       });
//       await silentRefresh(item.cartId);
//     } catch (err) {
//       console.error("Decrement error:", err.message);
//       setItemBusy(item.cartId, false);
//     }
//   };

//   const handleCheckout = async () => {
//     if (!userId) {
//       Alert.alert("Session Expired", "Please login again", [
//         { text: "OK", onPress: () => navigation.replace("Login") },
//       ]);
//       return;
//     }
//     navigation.navigate("PgCheckout", {
//       cartTotal: totalPayableAmount,
//       cartItems,
//     });
//   };

//   // ── Loading skeleton ──
//   if (loading) {
//     return (
//       <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
//         <View style={styles.skeletonWrapper}>
//           <View style={styles.skeletonHeader} />
//           <SkeletonItem />
//           <SkeletonItem />
//           <SkeletonItem />
//         </View>
//       </PgLayout>
//     );
//   }

//   // ── Empty state ──
//   if (cartItems.length === 0) {
//     return (
//       <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
//         <View style={styles.emptyContainer}>
//           <View style={styles.emptyIconWrap}>
//             <Text style={styles.emptyIcon}>🛒</Text>
//           </View>
//           <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
//           <Text style={styles.emptySubtitle}>
//             Add gold products to get started
//           </Text>
//           <TouchableOpacity
//             style={styles.browseBtn}
//             onPress={() => navigation.navigate("PgHome")}
//             activeOpacity={0.85}
//           >
//             <Text style={styles.browseBtnText}>Browse Store</Text>
//           </TouchableOpacity>
//         </View>
//       </PgLayout>
//     );
//   }

//   const subtotal =
//     totalCartValue ||
//     cartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
//   const gstAmount = totalGstCharges || 0;
//   const grandTotal = totalPayableAmount || subtotal + gstAmount;

//   return (
//     <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
//       <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={styles.scrollContent}
//         >
//           {/* ── Items ── */}
//           <View style={styles.section}>
//             <CardLabel
//               text={`${cartItems.length} ITEM${cartItems.length > 1 ? "S" : ""} IN CART`}
//             />

//             <View style={styles.itemsList}>
//               {cartItems.map((item) => {
//                 const busy = !!itemLoading[item.cartId];
//                 return (
//                   <View
//                     key={item.cartId}
//                     style={[styles.cartItem, busy && styles.cartItemBusy]}
//                   >
//                     {/* Busy overlay — only on this card */}
//                     {busy && (
//                       <View style={styles.itemBusyOverlay}>
//                         <ActivityIndicator size="small" color={C.gold} />
//                       </View>
//                     )}

//                     {/* 🗑 Remove — top-right corner */}
//                     <TouchableOpacity
//                       style={styles.removeCornerBtn}
//                       onPress={() => handleRemoveItem(item)}
//                       disabled={busy}
//                       hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//                     >
//                       <Ionicons name="trash" size={14} color="#FFFFFF" />
//                     </TouchableOpacity>

//                     {/* Thumb */}
//                     <View style={styles.itemThumb}>
//                       <Text style={styles.itemThumbIcon}>🏆</Text>
//                     </View>

//                     {/* Info column */}
//                     <View style={styles.itemInfo}>
//                       {/* Name */}
//                       <Text style={styles.itemName} numberOfLines={2}>
//                         {item.productName}
//                       </Text>

//                       {/* Tags */}
//                       <View style={styles.itemTagRow}>
//                         {item.purity ? (
//                           <View style={styles.itemTag}>
//                             <Text style={styles.itemTagText}>
//                               {item.purity}
//                             </Text>
//                           </View>
//                         ) : null}
//                         {item.size ? (
//                           <View style={styles.itemTag}>
//                             <Text style={styles.itemTagText}>{item.size}</Text>
//                           </View>
//                         ) : null}
//                         {item.weight ? (
//                           <View style={styles.itemTag}>
//                             <Text style={styles.itemTagText}>
//                               {item.weight}g
//                             </Text>
//                           </View>
//                         ) : null}
//                       </View>

//                       {/* Price + Qty + Total — single row */}
//                       <View style={styles.itemFooterRow}>
//                         {/* Unit price */}
//                         <View style={styles.itemPriceBlock}>
//                           <Text style={styles.itemPriceLabel}>Unit Price</Text>
//                           <Text style={styles.itemPriceValue}>
//                             ₹{item.price?.toLocaleString("en-IN") || "0"}
//                           </Text>
//                         </View>

//                         {/* Divider */}
//                         <View style={styles.itemFooterDivider} />

//                         {/* Qty control */}
//                         <View style={styles.qtyControl}>
//                           <TouchableOpacity
//                             style={[styles.qtyBtn, busy && styles.qtyBtnBusy]}
//                             onPress={() => handleDecrement(item)}
//                             disabled={busy}
//                             activeOpacity={0.7}
//                           >
//                             <Text style={styles.qtyBtnText}>−</Text>
//                           </TouchableOpacity>
//                           <Text style={styles.qtyNum}>{item.quantity}</Text>
//                           <TouchableOpacity
//                             style={[styles.qtyBtn, busy && styles.qtyBtnBusy]}
//                             onPress={() => handleIncrement(item)}
//                             disabled={busy}
//                             activeOpacity={0.7}
//                           >
//                             <Text style={styles.qtyBtnText}>+</Text>
//                           </TouchableOpacity>
//                         </View>

//                         {/* Divider */}
//                         <View style={styles.itemFooterDivider} />

//                         {/* Line total */}
//                         <View style={styles.lineTotalBlock}>
//                           <Text style={styles.lineTotalLabel}>Total</Text>
//                           <Text style={styles.lineTotalValue}>
//                             ₹{item.totalPrice?.toLocaleString("en-IN") || "0"}
//                           </Text>
//                         </View>
//                       </View>
//                     </View>
//                   </View>
//                 );
//               })}
//             </View>
//           </View>

//           {/* ── Order Summary ── */}
//           <View style={styles.section}>
//             <CardLabel text="ORDER SUMMARY" />
//             <View style={styles.summaryBox}>
//               {/* Decorative circle */}
//               <View style={styles.summaryCircle} />

//               <View style={styles.summaryRow}>
//                 <Text style={styles.summaryLabel}>Subtotal</Text>
//                 <Text style={styles.summaryValue}>
//                   ₹{subtotal.toLocaleString("en-IN")}
//                 </Text>
//               </View>
//               <View style={styles.summaryDivider} />
//               <View style={styles.summaryRow}>
//                 <Text style={styles.summaryLabel}>GST (3%)</Text>
//                 <Text style={styles.summaryValue}>
//                   ₹{gstAmount.toLocaleString("en-IN")}
//                 </Text>
//               </View>
//               <View style={styles.summaryDivider} />
//               <View style={styles.summaryRow}>
//                 <Text style={styles.summaryLabel}>Delivery</Text>
//                 <Text style={styles.summaryFree}>FREE</Text>
//               </View>
//               <View style={styles.summaryTotalDivider} />
//               <View style={styles.summaryRow}>
//                 <Text style={styles.summaryTotalLabel}>Grand Total</Text>
//                 <Text style={styles.summaryTotalValue}>
//                   ₹{grandTotal.toLocaleString("en-IN")}
//                 </Text>
//               </View>
//             </View>
//           </View>
//         </ScrollView>

//         {/* Fixed Checkout Footer */}
//         <View style={styles.checkoutFooter}>
//           <TouchableOpacity
//             style={[
//               styles.checkoutBtn,
//               checkingOut && styles.checkoutBtnDisabled,
//             ]}
//             disabled={checkingOut}
//             activeOpacity={0.85}
//             onPress={handleCheckout}
//           >
//             {checkingOut ? (
//               <ActivityIndicator size="small" color="#fff" />
//             ) : (
//               <View style={styles.checkoutInner}>
//                 <View>
//                   <Text style={styles.checkoutBtnLabel}>Payable Amount</Text>
//                   <Text style={styles.checkoutBtnAmount}>
//                     ₹{grandTotal.toLocaleString("en-IN")}
//                   </Text>
//                 </View>
//                 <View style={styles.checkoutRight}>
//                   <Text style={styles.checkoutBtnText}>
//                     Proceed to Checkout
//                   </Text>
//                   <Text style={styles.checkoutArrow}>→</Text>
//                 </View>
//               </View>
//             )}
//           </TouchableOpacity>
//         </View>
//       </Animated.View>
//     </PgLayout>
//   );
// };

// const styles = StyleSheet.create({
//   scrollContent: { paddingBottom: 110, paddingHorizontal: 14, paddingTop: 16 },

//   // ── Skeleton ──
//   skeletonWrapper: { paddingHorizontal: 14, paddingTop: 20, gap: 14 },
//   skeletonHeader: {
//     height: 18,
//     width: 140,
//     borderRadius: 6,
//     backgroundColor: "#E8E3D8",
//     marginBottom: 6,
//   },
//   skeletonItem: {
//     flexDirection: "row",
//     backgroundColor: C.surface,
//     borderRadius: 16,
//     padding: 14,
//     gap: 12,
//     borderWidth: 1,
//     borderColor: C.border,
//   },
//   skeletonThumb: {
//     width: 80,
//     height: 80,
//     borderRadius: 12,
//     backgroundColor: "#E8E3D8",
//   },
//   skeletonBody: { flex: 1, justifyContent: "center" },
//   skeletonLine: { height: 12, borderRadius: 6, backgroundColor: "#E8E3D8" },

//   // ── Empty ──
//   emptyContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 32,
//   },
//   emptyIconWrap: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     backgroundColor: "#F0EDE6",
//     borderWidth: 1,
//     borderColor: C.border,
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 20,
//   },
//   emptyIcon: { fontSize: 44 },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: "900",
//     color: C.textPri,
//     marginBottom: 8,
//     textAlign: "center",
//   },
//   emptySubtitle: {
//     fontSize: 14,
//     color: C.textSec,
//     marginBottom: 28,
//     textAlign: "center",
//     lineHeight: 20,
//   },
//   browseBtn: {
//     backgroundColor: C.gold,
//     paddingVertical: 14,
//     paddingHorizontal: 32,
//     borderRadius: 12,
//   },
//   browseBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },

//   // ── Card label ──
//   cardLabelRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     marginBottom: 12,
//   },
//   cardLabelAccent: {
//     width: 3,
//     height: 14,
//     borderRadius: 2,
//     backgroundColor: C.gold,
//   },
//   cardLabel: {
//     fontSize: 11,
//     fontWeight: "800",
//     color: C.textTer,
//     letterSpacing: 0.8,
//   },

//   // ── Section ──
//   section: { marginBottom: 22 },

//   // ── Cart Item ──
//   itemsList: { gap: 12 },
//   cartItem: {
//     backgroundColor: C.surface,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: C.border,
//     padding: 16,
//     paddingTop: 18,
//     flexDirection: "row",
//     gap: 14,
//     overflow: "hidden",
//     position: "relative",
//   },
//   cartItemBusy: { opacity: 0.65 },

//   // Per-item busy overlay
//   itemBusyOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(247,245,240,0.75)",
//     justifyContent: "center",
//     alignItems: "center",
//     zIndex: 10,
//     borderRadius: 12,
//   },

//   itemThumb: {
//     width: 90,
//     height: 90,
//     borderRadius: 12,
//     backgroundColor: "#F0EDE6",
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 1.5,
//     borderColor: C.border,
//     alignSelf: "flex-start",
//     marginTop: 0,
//   },
//   itemThumbIcon: { fontSize: 40 },

//   itemInfo: { flex: 1, paddingRight: 24 },
//   itemName: {
//     fontSize: 14,
//     fontWeight: "800",
//     color: C.textPri,
//     lineHeight: 19,
//     marginBottom: 8,
//   },

//   itemTagRow: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 6,
//     marginBottom: 12,
//   },
//   itemTag: {
//     backgroundColor: "#F0EDE6",
//     borderRadius: 6,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderWidth: 1,
//     borderColor: C.border,
//   },
//   itemTagText: { fontSize: 10, fontWeight: "700", color: C.textSec },

//   // ── Footer row: Unit Price | divider | Qty | divider | Total ──
//   itemFooterRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#F7F5F0",
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: C.border,
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     gap: 8,
//   },
//   itemFooterDivider: {
//     width: 1,
//     height: 32,
//     backgroundColor: C.border,
//   },

//   itemPriceBlock: { alignItems: "flex-start", minWidth: 70 },
//   itemPriceLabel: {
//     fontSize: 9,
//     fontWeight: "700",
//     color: C.textTer,
//     marginBottom: 3,
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//   },
//   itemPriceValue: { fontSize: 13, fontWeight: "900", color: C.gold },

//   qtyControl: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },
//   qtyBtn: {
//     width: 28,
//     height: 28,
//     borderRadius: 7,
//     backgroundColor: C.gold,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   qtyBtnBusy: { backgroundColor: C.border },
//   qtyBtnText: {
//     fontSize: 16,
//     fontWeight: "800",
//     color: "#fff",
//     lineHeight: 18,
//   },
//   qtyNum: {
//     fontSize: 15,
//     fontWeight: "900",
//     color: C.textPri,
//     minWidth: 20,
//     textAlign: "center",
//   },

//   lineTotalBlock: { alignItems: "flex-end", minWidth: 80 },
//   lineTotalLabel: {
//     fontSize: 9,
//     fontWeight: "700",
//     color: C.textTer,
//     marginBottom: 3,
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//   },
//   lineTotalValue: { fontSize: 13, fontWeight: "900", color: C.gold },

//   // ── Remove corner button ──
//   removeCornerBtn: {
//     position: "absolute",
//     top: 12,
//     right: 12,
//     width: 32,
//     height: 32,
//     borderRadius: 8,
//     backgroundColor: "#EF4444",
//     borderWidth: 1,
//     borderColor: "#DC2626",
//     justifyContent: "center",
//     alignItems: "center",
//     zIndex: 5,
//   },
//   removeCornerText: { fontSize: 16, lineHeight: 18, color: "#FFFFFF" },

//   // Fixed checkout footer
//   checkoutFooter: {
//     backgroundColor: "#FFFFFF",
//     borderTopWidth: 1,
//     borderTopColor: "#E8E3D8",
//     paddingHorizontal: 14,
//     paddingTop: 12,
//     paddingBottom: 22,
//   },

//   // ── Summary Box ──
//   summaryBox: {
//     backgroundColor: C.surface,
//     borderRadius: 14,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: C.border,
//     overflow: "hidden",
//   },
//   summaryCircle: {
//     position: "absolute",
//     width: 140,
//     height: 140,
//     borderRadius: 70,
//     backgroundColor: "rgba(184,137,26,0.03)",
//     top: -50,
//     right: -20,
//   },
//   summaryRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   summaryDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
//   summaryLabel: { fontSize: 13, color: C.textSec, fontWeight: "500" },
//   summaryValue: { fontSize: 13, fontWeight: "700", color: C.textPri },
//   summaryFree: { fontSize: 13, fontWeight: "800", color: C.success },
//   summaryTotalDivider: {
//     height: 1,
//     backgroundColor: C.border,
//     marginVertical: 14,
//   },
//   summaryTotalLabel: { fontSize: 15, fontWeight: "800", color: C.textPri },
//   summaryTotalValue: {
//     fontSize: 20,
//     fontWeight: "900",
//     color: C.gold,
//     letterSpacing: -0.5,
//   },

//   // ── Checkout Button ──
//   checkoutBtn: {
//     backgroundColor: C.gold,
//     borderRadius: 14,
//     paddingVertical: 16,
//     paddingHorizontal: 20,
//     marginTop: 4,
//     marginBottom: 8,
//   },
//   checkoutBtnDisabled: { opacity: 0.6 },
//   checkoutInner: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   checkoutBtnLabel: {
//     fontSize: 10,
//     fontWeight: "600",
//     color: "rgba(255,255,255,0.7)",
//     marginBottom: 2,
//   },
//   checkoutBtnAmount: {
//     fontSize: 18,
//     fontWeight: "900",
//     color: "#fff",
//     letterSpacing: -0.3,
//   },
//   checkoutRight: { flexDirection: "row", alignItems: "center", gap: 6 },
//   checkoutBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
//   checkoutArrow: {
//     fontSize: 16,
//     color: "rgba(255,255,255,0.85)",
//     fontWeight: "700",
//   },
// });

// export default PgCartScreen;






import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectUserId } from "../store/authSlice";
import { apiGet, apiPost, apiDelete } from "../services/apiClient";
import { BASE_URL } from "../constants/api";
import PgLayout from "../../components/physical/PgLayout";

// ─── Design Tokens (mirrors PgProductDetailsScreen exactly) ──────────────────
const C = {
  bg: "#F7F6F3",
  card: "#FFFFFF",
  gold: "#C8952A",
  goldLight: "#F5ECD7",
  goldMid: "#E8C97A",
  goldDim: "rgba(200,149,42,0.10)",
  goldDimBorder: "rgba(200,149,42,0.25)",
  navy: "#1C2340",
  navyMid: "#3D4463",
  navyLight: "#8891AF",
  green: "#0E9F6E",
  greenBg: "#ECFDF5",
  greenBorder: "#A7F3D0",
  red: "#E02424",
  redBg: "#FEF2F2",
  redBorder: "#FECACA",
  border: "#EAE8E2",
  divider: "#F0EEE9",
  surfaceAlt: "#F7F6F3",
  grey: "#e7e7da",
};

// ─── Shimmer (same as PgProductDetailsScreen) ─────────────────────────────────
const ShimmerBox = ({ width, height, borderRadius = 8 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: C.goldMid,
        opacity,
      }}
    />
  );
};

// ─── Section Header (same pattern as PgProductDetailsScreen) ──────────────────
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ─── Skeleton Item (restyled to match design system) ──────────────────────────
const SkeletonItem = () => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  return (
    <View style={styles.skeletonItem}>
      <Animated.View
        style={[styles.skeletonThumb, { opacity, backgroundColor: C.goldMid }]}
      />
      <View style={styles.skeletonBody}>
        <Animated.View
          style={[
            styles.skeletonLine,
            { width: "70%", opacity, backgroundColor: C.goldMid },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonLine,
            { width: "45%", marginTop: 8, opacity, backgroundColor: C.goldMid },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonLine,
            { width: "30%", marginTop: 8, opacity, backgroundColor: C.goldMid },
          ]}
        />
      </View>
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PgCartScreen = ({ navigation, route }) => {
  const userId = useSelector(selectUserId);

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  // Per-item loading: { [cartId]: true/false }
  const [itemLoading, setItemLoading] = useState({});

  const [totalCartValue, setTotalCartValue] = useState(0);
  const [totalGstCharges, setTotalGstCharges] = useState(0);
  const [totalMakingCharges, setTotalMakingCharges] = useState(0);
  const [totalPayableAmount, setTotalPayableAmount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (userId) fetchCartData();
  }, [userId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (userId) fetchCartData();
    });
    return unsubscribe;
  }, [navigation, userId]);

  const applyCartData = (data) => {
    setCartItems(data?.itemsInCart || []);
    setTotalCartValue(data?.totalCartValue || 0);
    setTotalGstCharges(data?.totalGstCharges || 0);
    setTotalMakingCharges(data?.totalMakingCharges || 0);
    setTotalPayableAmount(data?.totalPayableAmount || 0);
  };

  // Full page load (initial / refresh) — keeps loading state
  const fetchCartData = async (silent = false) => {
    if (!silent) setLoading(true);
    const startTime = Date.now();
    try {
      const data = await apiGet(`${BASE_URL}/cart/customer-cart-info`, {
        params: { customerId: userId },
      });
      applyCartData(data);
    } catch (err) {
      if (err?.status === 404) {
        setCartItems([]);
      } else {
        console.error("[Cart Fetch Error]", err.message);
        setCartItems([]);
      }
    } finally {
      const elapsed = Date.now() - startTime;
      const wait = silent ? 0 : Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            delay: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }, wait);
    }
  };

  // Silent refresh after item action — only updates data, no full screen spinner
  const silentRefresh = async (cartId) => {
    try {
      const data = await apiGet(`${BASE_URL}/cart/customer-cart-info`, {
        params: { customerId: userId },
      });
      applyCartData(data);
    } catch (err) {
      if (err?.status === 404) setCartItems([]);
    } finally {
      setItemLoading((prev) => ({ ...prev, [cartId]: false }));
    }
  };

  const setItemBusy = (cartId, busy) =>
    setItemLoading((prev) => ({ ...prev, [cartId]: busy }));

  const handleRemoveItem = (item) => {
    Alert.alert("Remove Item", `Remove ${item.productName} from cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: async () => {
          setItemBusy(item.cartId, true);
          try {
            await apiDelete(`${BASE_URL}/cart/${item.cartId}`, {
              params: { userId },
            });
            await silentRefresh(item.cartId);
          } catch (err) {
            console.error("Remove error:", err.message);
            setItemBusy(item.cartId, false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  const handleIncrement = async (item) => {
    setItemBusy(item.cartId, true);
    try {
      await apiPost(`${BASE_URL}/cart/AddItemToCart`, {
        userId,
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: 1,
      });
      await silentRefresh(item.cartId);
    } catch (err) {
      console.error("Increment error:", err.message);
      setItemBusy(item.cartId, false);
    }
  };

  const handleDecrement = async (item) => {
    if (item.quantity === 1) {
      handleRemoveItem(item);
      return;
    }
    setItemBusy(item.cartId, true);
    try {
      await apiPost(`${BASE_URL}/cart/decrementCartItems`, {
        userId,
        id: item.cartId,
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: 1,
      });
      await silentRefresh(item.cartId);
    } catch (err) {
      console.error("Decrement error:", err.message);
      setItemBusy(item.cartId, false);
    }
  };

  const handleCheckout = async () => {
    if (!userId) {
      Alert.alert("Session Expired", "Please login again", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
      return;
    }
    navigation.navigate("PgCheckout", {
      cartTotal: totalPayableAmount,
      cartItems,
    });
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.shimmerBody}>
            <ShimmerBox width="45%" height={14} />
            <View style={{ height: 14 }} />
            <SkeletonItem />
            <View style={{ height: 12 }} />
            <SkeletonItem />
            <View style={{ height: 12 }} />
            <SkeletonItem />
            <View style={{ height: 20 }} />
            <ShimmerBox width="45%" height={14} />
            <View style={{ height: 14 }} />
            <ShimmerBox width="100%" height={160} borderRadius={16} />
          </View>
        </ScrollView>
      </PgLayout>
    );
  }

  // ── Empty state (matches PgProductDetailsScreen empty state) ──
  if (cartItems.length === 0) {
    return (
      <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIcon}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Add gold products to get started
          </Text>
          <TouchableOpacity
            style={styles.goBackBtn}
            onPress={() => navigation.navigate("PgHome")}
            activeOpacity={0.85}
          >
            <Text style={styles.goBackText}>Browse Store</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  const subtotal =
    totalCartValue ||
    cartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const gstAmount = totalGstCharges || 0;
  const grandTotal = totalPayableAmount || subtotal + gstAmount;

  return (
    <PgLayout title="My Cart" showBack onBack={() => navigation.goBack()}>
      <View style={styles.root}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Items ── */}
          <View style={styles.card}>
            <SectionHeader
              title={`${cartItems.length} ITEM${cartItems.length > 1 ? "S" : ""} IN CART`}
            />

            <View style={styles.itemsList}>
              {cartItems.map((item, index) => {
                const busy = !!itemLoading[item.cartId];
                return (
                  <View key={item.cartId}>
                    <View
                      style={[styles.cartItem, busy && styles.cartItemBusy]}
                    >
                      {/* Busy overlay */}
                      {busy && (
                        <View style={styles.itemBusyOverlay}>
                          <ActivityIndicator size="small" color={C.gold} />
                        </View>
                      )}

                      {/* 🗑 Remove — top-right corner */}
                      <TouchableOpacity
                        style={styles.removeCornerBtn}
                        onPress={() => handleRemoveItem(item)}
                        disabled={busy}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash" size={13} color="#FFFFFF" />
                      </TouchableOpacity>

                      {/* Thumb — navy coin style matching hero fallback */}
                      <View style={styles.itemThumb}>
                        <Text style={styles.itemThumbWeight}>
                          {item.weight ? `${item.weight}g` : "🏆"}
                        </Text>
                        {item.weight ? (
                          <>
                            <View style={styles.itemThumbDivider} />
                            <Text style={styles.itemThumbPurity}>
                              {item.purity || "—"}
                            </Text>
                          </>
                        ) : null}
                      </View>

                      {/* Info column */}
                      <View style={styles.itemInfo}>
                        {/* Name */}
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.productName}
                        </Text>

                        {/* Tags — match variant chip purity/size style */}
                        <View style={styles.itemTagRow}>
                          {item.purity ? (
                            <View style={styles.itemTag}>
                              <Text style={styles.itemTagText}>
                                {item.purity}
                              </Text>
                            </View>
                          ) : null}
                          {item.size ? (
                            <View style={styles.itemTag}>
                              <Text style={styles.itemTagText}>
                                {item.size}
                              </Text>
                            </View>
                          ) : null}
                          {item.weight ? (
                            <View style={styles.itemTag}>
                              <Text style={styles.itemTagText}>
                                {item.weight}g
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Price + Qty + Total row — matches priceCard layout */}
                        <View style={styles.itemFooterRow}>
                          {/* Unit price */}
                          <View style={styles.itemPriceBlock}>
                            <Text style={styles.itemPriceLabel}>
                              Unit Price
                            </Text>
                            <Text style={styles.itemPriceValue}>
                              ₹{item.price?.toLocaleString("en-IN") || "0"}
                            </Text>
                          </View>

                          <View style={styles.itemFooterDivider} />

                          {/* Qty control — matches PgProductDetailsScreen qtyBtn */}
                          <View style={styles.qtyControl}>
                            <TouchableOpacity
                              style={[styles.qtyBtn, busy && styles.qtyBtnBusy]}
                              onPress={() => handleDecrement(item)}
                              disabled={busy}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.qtyBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyNum}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={[styles.qtyBtn, busy && styles.qtyBtnBusy]}
                              onPress={() => handleIncrement(item)}
                              disabled={busy}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.qtyBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.itemFooterDivider} />

                          {/* Line total */}
                          <View style={styles.lineTotalBlock}>
                            <Text style={styles.lineTotalLabel}>Total</Text>
                            <Text style={styles.lineTotalValue}>
                              ₹{item.totalPrice?.toLocaleString("en-IN") || "0"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Divider between items */}
                    {index < cartItems.length - 1 && (
                      <View style={styles.itemDivider} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Order Summary — navy card matching priceCard ── */}
          <View style={styles.summaryCard}>
            {/* Decorative rings — same as priceCard */}
            <View style={styles.summaryRing1} />
            <View style={styles.summaryRing2} />

            <SectionHeader title="ORDER SUMMARY" />

            {/* SpecRow-style rows */}
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Subtotal</Text>
              <Text style={styles.specValue}>
                ₹{subtotal.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.specDivider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>GST (3%)</Text>
              <Text style={styles.specValue}>
                ₹{gstAmount.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.specDivider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Delivery</Text>
              <Text style={styles.specFree}>FREE</Text>
            </View>

            {/* Grand total — gold highlight */}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>
                ₹{grandTotal.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </Animated.ScrollView>

        {/* ── Footer (trust strip + CTA) — mirrors PgProductDetailsScreen footer exactly ── */}
        <View style={styles.footer}>
          {/* Trust micro-strip */}
         

          <View style={styles.footerMain}>
            {/* Left: price summary */}
            <View style={styles.footerLeft}>
              <Text style={styles.footerPriceLabel}>Payable Amount</Text>
              <Text style={styles.footerPriceValue}>
                ₹{grandTotal.toLocaleString("en-IN")}
              </Text>
              {cartItems.length > 0 && (
                <Text style={styles.footerPriceSub}>
                  {cartItems.length} item{cartItems.length > 1 ? "s" : ""}
                </Text>
              )}
            </View>

            {/* Right: Proceed to Checkout */}
            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                checkingOut && styles.checkoutBtnDisabled,
              ]}
              disabled={checkingOut}
              activeOpacity={0.85}
              onPress={handleCheckout}
            >
              {checkingOut ? (
                <ActivityIndicator size="small" color={C.navy} />
              ) : (
                <Text style={styles.checkoutBtnText}>Checkout →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </PgLayout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 },

  // Loading shimmer
  shimmerBody: { padding: 16, gap: 0 },

  // ── Section Header (same as PgProductDetailsScreen) ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.navyMid,
    letterSpacing: 0.5,
  },

  // ── Cards (same surface/border as PgProductDetailsScreen) ──
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    shadowColor: "rgba(181, 183, 190, 0.06)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Cart Items ──
  itemsList: { gap: 0 },
  itemDivider: { height: 1, backgroundColor: C.divider, marginVertical: 14 },

  cartItem: {
    flexDirection: "row",
    gap: 14,
    position: "relative",
  },
  cartItemBusy: { opacity: 0.65 },

  itemBusyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247,246,243,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 12,
  },

  // Thumb — navy coin style matching hero fallback from PgProductDetailsScreen
  itemThumb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.navy,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(232,201,122,0.35)",
    alignSelf: "flex-start",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  itemThumbWeight: {
    fontSize: 16,
    fontWeight: "900",
    color: C.goldMid,
    lineHeight: 18,
  },
  itemThumbDivider: {
    width: 32,
    height: 1,
    backgroundColor: "rgba(232,201,122,0.4)",
    marginVertical: 3,
  },
  itemThumbPurity: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(232,201,122,0.65)",
    letterSpacing: 0.5,
  },

  itemInfo: { flex: 1, paddingRight: 28 },
  itemName: {
    fontSize: 14,
    fontWeight: "800",
    color: C.navy,
    lineHeight: 19,
    marginBottom: 8,
  },

  itemTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  itemTag: {
    backgroundColor: C.goldDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.goldDimBorder,
  },
  itemTagText: { fontSize: 10, fontWeight: "700", color: C.gold },

  // Footer row: Unit Price | divider | Qty | divider | Total
  itemFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  itemFooterDivider: { width: 1, height: 32, backgroundColor: C.border },

  itemPriceBlock: { alignItems: "flex-start", minWidth: 64 },
  itemPriceLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: C.navyLight,
    marginBottom: 3,
    letterSpacing: 0.4,
  },
  itemPriceValue: { fontSize: 13, fontWeight: "900", color: C.gold },

  // Qty control — matches PgProductDetailsScreen qtyBtn exactly
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  qtyBtnBusy: { backgroundColor: C.border, shadowOpacity: 0 },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 18,
  },
  qtyNum: {
    fontSize: 15,
    fontWeight: "900",
    color: C.navy,
    minWidth: 18,
    textAlign: "center",
  },

  lineTotalBlock: { alignItems: "flex-end", minWidth: 72 },
  lineTotalLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: C.navyLight,
    marginBottom: 3,
    letterSpacing: 0.4,
  },
  lineTotalValue: { fontSize: 13, fontWeight: "900", color: C.gold },

  // Remove button — matches PgProductDetailsScreen error red
  removeCornerBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.red,
    borderWidth: 1,
    borderColor: "rgba(224,36,36,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },

  // ── Summary Card — navy, same as priceCard in PgProductDetailsScreen ──
 summaryCard: {
  backgroundColor: C.goldLight,   // ✅ light gold
  borderRadius: 18,
  padding: 20,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: C.goldMid,
},
  summaryRing1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(232,201,122,0.07)",
    top: -35,
    right: 16,
  },
  summaryRing2: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: "rgba(232,201,122,0.10)",
    right: 90,
    bottom: -24,
  },

  // SpecRow style adapted for navy background
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    zIndex: 1,
  },
  specDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    zIndex: 1,
  },
specLabel: {
  fontSize: 13,
  color: C.navyLight,   // ✅ navy light
},

specValue: {
  fontSize: 13,
  fontWeight: "700",
  color: C.navy,        // ✅ navy
},

specFree: {
  fontSize: 13,
  fontWeight: "800",
  color: C.green,       // keep green (looks good)
},
grandTotalRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 14,
  paddingTop: 14,
  borderTopWidth: 1,
  borderTopColor: C.goldMid,
},

grandTotalLabel: {
  fontSize: 15,
  fontWeight: "800",
  color: C.navy,   // ✅ navy
},

grandTotalValue: {
  fontSize: 22,
  fontWeight: "900",
  color: C.gold,   // ✅ gold highlight
},
  // ── Footer (mirrors PgProductDetailsScreen footer exactly) ──
  footer: {
  backgroundColor: C.card,
  borderTopWidth: 1,
  borderTopColor: C.border,
  paddingTop: 10,   // ✅ add this
  paddingBottom: 22,
},

  // Trust micro-strip (same as PgProductDetailsScreen)
  trustStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  trustItem: {
    fontSize: 10,
    fontWeight: "700",
    color: C.navyLight,
    paddingHorizontal: 12,
  },
  trustDivider: { width: 1, height: 14, backgroundColor: C.border },

  footerMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 16,
  },
  footerLeft: { flex: 1 },
  footerPriceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.navyLight,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  footerPriceValue: {
    fontSize: 22,
    fontWeight: "900",
    color: C.navy,
    letterSpacing: -0.5,
  },
  footerPriceSub: { fontSize: 11, color: C.navyLight, marginTop: 2 },

  // Checkout button — same dimensions/radius/gold shadow as cartBtn in PgProductDetailsScreen
  checkoutBtn: {
    backgroundColor: C.gold,
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 22,
    minWidth: 155,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  checkoutBtnDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1C2340",
    letterSpacing: 0.3,
  },

  // ── Empty state (matches PgProductDetailsScreen exactly) ──
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.goldLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.goldMid,
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.navyLight,
    marginBottom: 24,
    textAlign: "center",
  },
  goBackBtn: {
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  goBackText: { fontSize: 14, fontWeight: "800", color: "#1C2340" },
});

export default PgCartScreen;
