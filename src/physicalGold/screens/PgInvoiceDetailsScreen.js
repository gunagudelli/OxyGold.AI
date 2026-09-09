import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '../../store/authSlice';
import PgLayout from '../components/PgLayout';
import FadeSlideIn from '../components/FadeSlideIn';
import { downloadInvoicePDF, openInvoicePDF, shareInvoicePDF } from '../../utils/downloadInvoice';

const C = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E7E0DA',
  gold: '#0E6B57',
  goldDim: 'rgba(14,107,87,0.10)',
  goldDimBorder: 'rgba(14,107,87,0.22)',
  textPri: '#1C1C1E',
  textSec: '#7A7A80',
  textTer: '#A79C93',
  success: '#1F8A4C',
  successBg: '#E8F5E9',
};

const Row = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
  </View>
);

const PgInvoiceDetailsScreen = ({ navigation, route }) => {
  const accessToken = useSelector(selectAccessToken);
  const { order } = route?.params || {};
  const [downloading, setDownloading] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);

  if (!order) {
    navigation.goBack();
    return null;
  }

  const orderNumber = order.orderNumber || order.orderId || '';
  const displayOrderId = orderNumber.toString().slice(-6);
  const orderDate = new Date(
    order.paymentExpiry || order.createdAt || order.orderDate
  ).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handleDownloadPDF = async () => {
    if (!accessToken) {
      Alert.alert('Error', 'Session expired. Please login again.');
      return;
    }

    setDownloading(true);
    try {
      const fileUri = await downloadInvoicePDF(orderNumber, accessToken);
      Alert.alert('Success', 'Invoice downloaded successfully', [
        {
          text: 'Open',
          onPress: async () => {
            try {
              await openInvoicePDF(fileUri);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
        { text: 'Close' },
      ]);
    } catch (error) {
      Alert.alert('Download Failed', error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleSharePDF = async () => {
    if (!accessToken) {
      Alert.alert('Error', 'Session expired. Please login again.');
      return;
    }

    setSharing(true);
    try {
      const fileUri = await downloadInvoicePDF(orderNumber, accessToken);
      await shareInvoicePDF(fileUri);
    } catch (error) {
      Alert.alert('Share Failed', error.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <PgLayout
      title={`Invoice #${displayOrderId}`}
      showBack
      onBack={() => navigation.goBack()}
      hideLogo
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <FadeSlideIn>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={styles.invoiceNumber}>#{displayOrderId}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color={C.success} />
              <Text style={styles.statusText}>{order.orderStatus}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>Date: {orderDate}</Text>
        </View>

        {/* Customer Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CUSTOMER DETAILS</Text>
          <Row label="Name" value={order.userName || '—'} />
          <Row label="Email" value={order.userEmail || '—'} />
          <Row label="Phone" value={order.phoneNumber || '—'} />
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ORDER ITEMS</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemPrice}>
                  ₹{Number(item.price || 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetail}>Qty: {item.quantity || 1}</Text>
                <Text style={styles.itemDetail}>
                  Weight: {item.weight || '—'}g
                </Text>
                <Text style={styles.itemDetail}>
                  Purity: {item.purity || '—'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PAYMENT SUMMARY</Text>
          <Row label="Subtotal" value={`₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}`} />
          <Row label="Payment Mode" value={order.paymentMode || '—'} />
          <Row label="Payment Status" value={order.paymentStatus || '—'} />
          <View style={styles.divider} />
          <Row 
            label="Total Amount" 
            value={`₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}`}
            bold
          />
        </View>

        {/* Delivery Details */}
        {order.delivery && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>DELIVERY ADDRESS</Text>
            <Text style={styles.addressText}>
              {order.delivery.address || '—'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, downloading && styles.actionBtnDisabled]}
            onPress={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>
              {downloading ? 'Downloading...' : 'Download'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, sharing && styles.actionBtnDisabled]}
            onPress={handleSharePDF}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="share-outline" size={20} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>
              {sharing ? 'Sharing...' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
        </FadeSlideIn>
      </ScrollView>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  headerCard: {
    backgroundColor: C.surface,
    margin: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  invoiceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textTer,
    letterSpacing: 1,
  },

  invoiceNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: C.textPri,
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.successBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.success,
  },

  dateText: {
    fontSize: 13,
    color: C.textSec,
  },

  card: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textTer,
    letterSpacing: 1,
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEBE8',
  },

  rowLabel: {
    fontSize: 13,
    color: C.textSec,
  },

  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPri,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  rowValueBold: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textPri,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },

  itemCard: {
    backgroundColor: '#EEEBE8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },

  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPri,
    flex: 1,
  },

  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textPri,
  },

  itemDetails: {
    flexDirection: 'row',
    gap: 12,
  },

  itemDetail: {
    fontSize: 11,
    color: C.textSec,
  },

  addressText: {
    fontSize: 13,
    color: C.textPri,
    lineHeight: 20,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },

  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.gold,
    paddingVertical: 14,
    borderRadius: 12,
  },

  actionBtnDisabled: {
    opacity: 0.6,
  },

  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PgInvoiceDetailsScreen;
