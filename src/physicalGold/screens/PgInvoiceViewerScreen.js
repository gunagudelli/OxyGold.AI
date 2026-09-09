import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '../../store/authSlice';
import { BASE_URL } from '../../constants/api';
import PgLayout from '../components/PgLayout';
import PgLoader from '../components/PgLoader';
import { downloadInvoicePDF, openInvoicePDF } from '../../utils/downloadInvoice';

const C = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E7E0DA',
  gold: '#0E6B57',
  textPri: '#1C1C1E',
  textSec: '#7A7A80',
  textTer: '#A79C93',
  error: '#C85A54',
};

const PgInvoiceViewerScreen = ({ navigation, route }) => {
  const accessToken = useSelector(selectAccessToken);
  const { orderNumber } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [error, setError] = useState(null);

  const invoiceUrl = `${BASE_URL}/oxygold-api/invoices/${orderNumber}/pdf/preview`;

  useEffect(() => {
    if (!orderNumber) {
      Alert.alert('Error', 'Order number is required');
      navigation.goBack();
    }
    console.log('[Invoice Viewer] Order:', orderNumber);
    console.log('[Invoice Viewer] URL:', invoiceUrl);
    console.log('[Invoice Viewer] Token:', accessToken ? 'present' : 'missing');
  }, [orderNumber]);

  const handleDownload = async () => {
    if (!accessToken) {
      Alert.alert('Error', 'Session expired. Please login again.');
      return;
    }

    setDownloading(true);
    try {
      console.log('[Invoice Viewer] Starting download for order:', orderNumber);
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
      console.error('[Invoice Viewer Download Error]', error.message);
      Alert.alert('Download Failed', error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[WebView Error]', nativeEvent);
    setError('Failed to load invoice');
    setLoading(false);
  };

  const handleWebViewHttpError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[WebView HTTP Error]', nativeEvent);
    
    if (nativeEvent.statusCode === 401) {
      setError('Session expired. Please login again.');
      Alert.alert('Error', 'Session expired. Please login again.');
      navigation.goBack();
    } else if (nativeEvent.statusCode === 404) {
      setError('Invoice not found');
    } else if (nativeEvent.statusCode === 500) {
      setError('Server error. Invoice endpoint may not be available.');
    } else {
      setError(`Failed to load invoice (${nativeEvent.statusCode})`);
    }
    setLoading(false);
  };

  return (
    <PgLayout
      title={`Invoice #${orderNumber?.toString().slice(-6)}`}
      showBack
      onBack={() => navigation.goBack()}
      hideLogo
    >
      <View style={styles.container}>
        {/* Header Actions */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.actionBtn, downloading && styles.actionBtnDisabled]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={C.gold} />
            ) : (
              <Ionicons name="download-outline" size={20} color={C.gold} />
            )}
            <Text style={styles.actionBtnText}>
              {downloading ? 'Downloading...' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={C.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setError(null);
                setLoading(true);
                setWebViewKey(webViewKey + 1);
              }}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WebView */}
        {!error && (
          <View style={styles.webViewContainer}>
            <WebView
              key={webViewKey}
              source={{
                uri: invoiceUrl,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }}
              style={styles.webView}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <PgLoader label="Loading invoice..." fullscreen={false} />
                </View>
              )}
              onError={handleWebViewError}
              onHttpError={handleWebViewHttpError}
              onLoadEnd={() => setLoading(false)}
              javaScriptEnabled
              domStorageEnabled
              scalesPageToFit
              originWhitelist={['*']}
              mixedContentMode="always"
            />
          </View>
        )}
      </View>
    </PgLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  header: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },

  actionBtnDisabled: {
    opacity: 0.6,
  },

  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPri,
  },

  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },

  webView: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.textSec,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },

  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: C.textSec,
    textAlign: 'center',
  },

  retryBtn: {
    marginTop: 20,
    backgroundColor: C.gold,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PgInvoiceViewerScreen;
