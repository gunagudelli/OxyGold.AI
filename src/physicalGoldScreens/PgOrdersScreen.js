import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectUserId } from '../store/authSlice';
import { getUserOrders, previewInvoice, downloadInvoice } from './physicalGoldApi';
import PgLayout from '../../components/physical/PgLayout';

const C = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  border: '#E8E3D8',
  gold: '#B8891A',
  goldLight: '#D4A82A',
  goldDim: 'rgba(184,137,26,0.10)',
  goldDimBorder: 'rgba(184,137,26,0.22)',
  textPri: '#1A1508',
  textSec: '#6B6050',
  textTer: '#A89880',
  success: '#1A7A4A',
  successBg: '#EDFBF3',
  warning: '#D97706',
  warningBg: '#FFFBEB',
};

const getStatusColor = (status) => {
  const upperStatus = status?.toUpperCase();
  switch (upperStatus) {
    case 'CONFIRMED':
    case 'DELIVERED':
      return { bg: C.successBg, color: C.success, icon: 'checkmark-circle' };
    case 'PENDING':
    case 'PROCESSING':
      return { bg: C.warningBg, color: C.warning, icon: 'time' };
    case 'CANCELLED':
      return { bg: '#FEF2F2', color: '#C0392B', icon: 'close-circle' };
    default:
      return { bg: '#F0EEE9', color: C.textTer, icon: 'help-circle' };
  }
};

const OrderCard = ({ order, onShowInvoiceMenu }) => {
  const statusInfo = getStatusColor(order.orderStatus);
  const orderDate = new Date(order.paymentExpiry || order.createdAt || order.orderDate).toLocaleDateString('en-IN');
  const itemCount = order.items?.length || order.totalItems || 1;
  const canShowInvoice = order.orderStatus === 'CONFIRMED' || order.orderStatus === 'DELIVERED';

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderId}>Order #{order.orderNumber || order.orderId}</Text>
          <Text style={styles.orderDate}>{orderDate}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]} numberOfLines={1}>
            {order.orderStatus || 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemCount}>{itemCount} item{itemCount > 1 ? 's' : ''}</Text>
          <Text style={styles.itemDesc} numberOfLines={1}>
            {order.items?.[0]?.productName || 'Gold Product'}
            {itemCount > 1 ? ` +${itemCount - 1}` : ''}
          </Text>
        </View>
        <View style={styles.amountInfo}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amount}>₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {canShowInvoice && (
        <TouchableOpacity
          style={styles.invoiceMenuBtn}
          onPress={() => onShowInvoiceMenu(order)}
        >
          <Ionicons name="document-outline" size={14} color={C.gold} />
          <Text style={styles.invoiceMenuBtnText}>Invoice</Text>
          <Ionicons name="chevron-down" size={14} color={C.gold} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const PgOrdersScreen = ({ navigation, route }) => {
  const reduxAccessToken = useSelector(selectAccessToken);
  const reduxUserId = useSelector(selectUserId);
  const routeUserId = route?.params?.userId;
  const userId = routeUserId || reduxUserId;

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    console.log('[Orders] Redux Token:', reduxAccessToken ? 'present' : 'missing');
    console.log('[Orders] Redux UserId:', reduxUserId);
  }, [reduxAccessToken, reduxUserId]);

  useEffect(() => {
    if (userId) {
      fetchOrders();
    }
  }, [userId]);

  const fetchOrders = async () => {
    if (!userId) return;
    const startTime = Date.now();
    try {
      setLoading(true);
      console.log('[Orders Fetch] userId:', userId);
      const orders = await getUserOrders(userId);
      console.log('[Orders Response]', orders);
      setOrders(orders);
    } catch (error) {
      console.error('[Orders Error]', error.message);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.orderStatus?.toUpperCase() === filter.toUpperCase();
  });

  const handleShowInvoiceMenu = (order) => {
    setSelectedOrder(order);
    setInvoiceModal(true);
  };

  const handlePreviewInvoice = async () => {
    if (!selectedOrder?.orderNumber) {
      Alert.alert('Error', 'Order number not found');
      return;
    }

    if (!reduxAccessToken) {
      Alert.alert('Error', 'Access token not available');
      return;
    }

    try {
      const url = previewInvoice(selectedOrder.orderNumber, reduxAccessToken);
      console.log('[Preview Invoice] Opening URL:', url);
      await Linking.openURL(url);
      setInvoiceModal(false);
    } catch (error) {
      console.error('[Preview Invoice Error]', error.message);
      Alert.alert('Error', 'Failed to open invoice: ' + error.message);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!selectedOrder?.orderNumber) {
      Alert.alert('Error', 'Order number not found');
      return;
    }

    if (!reduxAccessToken) {
      Alert.alert('Error', 'Access token not available');
      return;
    }

    try {
      const url = downloadInvoice(selectedOrder.orderNumber, reduxAccessToken);
      console.log('[Download Invoice] Opening URL:', url);
      await Linking.openURL(url);
      setInvoiceModal(false);
    } catch (error) {
      console.error('[Download Invoice Error]', error.message);
      Alert.alert('Error', 'Failed to download invoice: ' + error.message);
    }
  };

  if (loading) {
    return (
      <PgLayout title="My Orders" showBack={true} onBack={() => navigation.goBack()} hideLogo={true}>
        <View style={[styles.root, styles.center]}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </PgLayout>
    );
  }

  if (orders.length === 0) {
    return (
      <PgLayout title="My Orders" showBack={true} onBack={() => navigation.goBack()} hideLogo={true}>
        <View style={[styles.root, styles.center]}>
          <Ionicons name="receipt-outline" size={64} color={C.textTer} />
          <Text style={styles.emptyText}>No orders yet</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('PgHome')}
          >
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </PgLayout>
    );
  }

  return (
    <PgLayout title="My Orders" showBack={true} onBack={() => navigation.goBack()} hideLogo={true}>
      <View style={styles.root}>
        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {['all', 'PENDING', 'PROCESSING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f === 'all' ? 'All' : f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Orders List */}
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => (item.orderId || item.id)?.toString()}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onShowInvoiceMenu={handleShowInvoiceMenu}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyFilterText}>No {filter} orders found</Text>
            </View>
          }
        />

        {/* Invoice Menu Modal */}
        <Modal visible={invoiceModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invoice Options</Text>
                <TouchableOpacity onPress={() => setInvoiceModal(false)}>
                  <Ionicons name="close" size={24} color={C.textPri} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handlePreviewInvoice}
              >
                <Ionicons name="eye-outline" size={18} color={C.gold} />
                <Text style={styles.modalBtnText}>Preview Invoice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handleDownloadInvoice}
              >
                <Ionicons name="download-outline" size={18} color={C.gold} />
                <Text style={styles.modalBtnText}>Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setInvoiceModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },

  filterScroll: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0EEE9',
    borderWidth: 1,
    borderColor: C.border,
  },
  filterTabActive: { backgroundColor: C.gold, borderColor: C.gold },
  filterTabText: { fontSize: 11, fontWeight: '600', color: C.textSec },
  filterTabTextActive: { color: '#fff' },

  listContent: { padding: 12, paddingBottom: 20 },

  orderCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 },
  orderId: { fontSize: 13, fontWeight: '800', color: C.textPri, marginBottom: 2 },
  orderDate: { fontSize: 10, color: C.textTer },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  statusText: { fontSize: 10, fontWeight: '700' },

  orderBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0EEE9', gap: 8 },
  itemInfo: { flex: 1 },
  itemCount: { fontSize: 11, fontWeight: '700', color: C.textPri, marginBottom: 2 },
  itemDesc: { fontSize: 10, color: C.textTer },

  amountInfo: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 9, color: C.textTer, marginBottom: 2 },
  amount: { fontSize: 13, fontWeight: '800', color: C.gold },

  invoiceMenuBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldDimBorder },
  invoiceMenuBtnText: { fontSize: 12, fontWeight: '700', color: C.gold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPri },
  modalBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: C.goldDim, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: C.goldDimBorder },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: C.gold, flex: 1 },
  modalBtnCancel: { backgroundColor: '#F0EEE9', borderColor: C.border },
  modalBtnCancelText: { fontSize: 15, fontWeight: '700', color: C.textPri, flex: 1, textAlign: 'center' },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: C.textSec, marginTop: 12, marginBottom: 24 },
  emptyFilterText: { fontSize: 14, color: C.textTer },
  shopBtn: { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  shopBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default PgOrdersScreen;
