import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PgLayout from '../../components/physical/PgLayout';

const PgCartScreen = ({ navigation, route }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = route?.params?.userId;
  const accessToken = route?.params?.accessToken;

  useEffect(() => {
    if (userId) {
      fetchCartData();
    }
  }, [userId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId) {
        fetchCartData();
      }
    });
    return unsubscribe;
  }, [navigation, userId]);

  const fetchCartData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    const startTime = Date.now();
    try {
      console.log('[Cart Fetch] userId:', userId, 'accessToken:', accessToken ? 'present' : 'missing');
      const response = await fetch(`http://65.0.147.157:9900/api/cart/customer-cart-info?customerId=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
        },
      });
      const data = await response.json();
      console.log('[Cart API Full Response]', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        // Response is NOT wrapped in data object - it's direct
        const items = data?.itemsInCart || [];
        console.log('[Setting Cart Items]', items.length, 'items');
        console.log('[Cart Items]', items);
        setCartItems(items);
      } else {
        console.error('[Cart Fetch Error] Status:', response.status, 'Data:', data);
        setCartItems([]);
      }
    } catch (err) {
      console.error('[Fetch Cart Exception]', err);
      setCartItems([]);
    } finally {
      // Ensure at least 2 seconds of loading
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }, remainingTime);
    }
  };

  const handleRemoveItem = (item) => {
    Alert.alert(
      'Remove Item',
      `Remove ${item.productName} from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              const { cartId } = item;
              console.log('[Remove] cartId:', cartId, 'userId:', userId);
              const response = await fetch(`http://65.0.147.157:9900/api/cart/${cartId}?userId=${userId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken || ''}`,
                },
              });
              console.log('[Remove Item Response Status]', response.status);
              const responseData = await response.json();
              console.log('[Remove Item Response Data]', responseData);
              if (response.ok) {
                fetchCartData();
              }
            } catch (err) {
              console.error('Remove error:', err);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleIncrement = async (item) => {
    try {
      const payload = {
        userId,
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: 1,
      };
      console.log('[Increment Payload]', JSON.stringify(payload, null, 2));
      const response = await fetch(`http://65.0.147.157:9900/api/cart/AddItemToCart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      console.log('[Increment Response Status]', response.status);
      console.log('[Increment Response Data]', responseData);
      if (response.ok) {
        fetchCartData();
      }
    } catch (err) {
      console.error('Increment error:', err);
    }
  };

  const handleDecrement = async (item) => {
    try {
      const { quantity, cartId, productId, productVariantId } = item;
      
      // If quantity is 1, remove the item instead of decrementing
      if (quantity === 1) {
        console.log('[Decrement] Quantity is 1, removing item instead');
        handleRemoveItem(item);
        return;
      }

      const payload = {
        userId,
        id: cartId,
        productId,
        productVariantId,
        quantity: 1,
      };
      console.log('[Decrement Payload]', JSON.stringify(payload, null, 2));
      const response = await fetch(`http://65.0.147.157:9900/api/cart/decrementCartItems`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      console.log('[Decrement Response Status]', response.status);
      console.log('[Decrement Response Data]', responseData);
      if (response.ok) {
        fetchCartData();
      }
    } catch (err) {
      console.error('Decrement error:', err);
    }
  };

  if (loading) {
    return (
      <PgLayout title="Shopping Cart" showBack onBack={() => navigation.goBack()}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b0a59" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </PgLayout>
    );
  }

  if (cartItems.length === 0) {
    return (
      <PgLayout title="Shopping Cart" showBack onBack={() => navigation.goBack()}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>Start shopping to add items</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('PgHome')}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Browse Store</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  const totalValue = cartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const gstAmount = Math.round(totalValue * 0.03);
  const grandTotal = totalValue + gstAmount;

  return (
    <PgLayout title="Shopping Cart" showBack onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cart Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({cartItems.length})</Text>
          <View style={styles.itemsList}>
            {cartItems.map((item) => (
              <View key={item.cartId} style={styles.cartItem}>
                {/* Image Placeholder */}
                <View style={styles.itemImageContainer}>
                  <Text style={styles.itemImagePlaceholder}>🏆</Text>
                </View>

                {/* Details */}
                <View style={styles.itemDetailsContainer}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemMeta}>Size: {item.size}</Text>
                    <Text style={styles.itemMetaDot}>•</Text>
                    <Text style={styles.itemMeta}>Purity: {item.purity}</Text>
                  </View>
                  <Text style={styles.itemWeight}>Weight: {item.weight}g</Text>
                  <Text style={styles.itemPrice}>₹{item.price?.toLocaleString('en-IN') || '0'}</Text>
                </View>

                {/* Actions */}
                <View style={styles.itemActionsContainer}>
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => handleDecrement(item)}
                      disabled={loading}
                    >
                      <Text style={styles.quantityBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => handleIncrement(item)}
                      disabled={loading}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemLineTotalLabel}>Total</Text>
                    <Text style={styles.lineTotal}>
                      ₹{item.totalPrice?.toLocaleString('en-IN') || '0'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item)}
                    disabled={loading}
                    style={styles.removeButtonContainer}
                  >
                    <Text style={styles.removeBtn}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{totalValue.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (3%)</Text>
              <Text style={styles.summaryValue}>₹{gstAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{grandTotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </ScrollView>
    </PgLayout>
  );
};

const C = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  border: '#E8E3D8',
  gold: '#B8891A',
  goldBright: '#F0CC5A',
  textPri: '#1A1508',
  textSec: '#6B6050',
  textTer: '#A89880',
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 24, paddingHorizontal: 12 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.textSec },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.textPri, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: C.textSec, marginBottom: 24, textAlign: 'center' },
  browseBtn: { backgroundColor: '#2b0a59', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  browseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.textPri, marginBottom: 14 },

  itemsList: { gap: 14 },
  cartItem: { 
    backgroundColor: C.surface, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: C.border, 
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  itemImagePlaceholder: { fontSize: 36 },
  
  itemDetailsContainer: { flex: 1, justifyContent: 'space-between' },
  itemName: { fontSize: 14, fontWeight: '700', color: C.textPri, marginBottom: 6, lineHeight: 18 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  itemMeta: { fontSize: 11, color: C.textTer },
  itemMetaDot: { fontSize: 10, color: C.textTer },
  itemWeight: { fontSize: 11, color: C.textSec, marginBottom: 6 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: C.gold, backgroundColor: '#F0EDE6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  
  itemActionsContainer: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0EDE6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, gap: 6 },
  quantityBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  quantityBtnText: { fontSize: 16, fontWeight: '700', color: C.textSec },
  quantityText: { fontSize: 13, fontWeight: '700', color: C.textPri, minWidth: 24, textAlign: 'center' },
  
  itemPriceContainer: { alignItems: 'flex-end' },
  itemLineTotalLabel: { fontSize: 10, color: C.textTer, marginBottom: 2 },
  lineTotal: { fontSize: 14, fontWeight: '800', color: C.gold },
  
  removeButtonContainer: { paddingVertical: 4 },
  removeBtn: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  summaryBox: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: C.textSec, fontWeight: '500' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: C.textPri },
  totalRow: { borderTopWidth: 1.5, borderTopColor: C.border, paddingTop: 12, marginTop: 8 },
  totalLabel: { fontSize: 14, fontWeight: '800', color: C.textPri },
  totalValue: { fontSize: 16, fontWeight: '800', color: C.gold },

  checkoutBtn: { marginHorizontal: 0, marginVertical: 16, backgroundColor: '#2b0a59', paddingVertical: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#2b0a59', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },
});

export default PgCartScreen;
