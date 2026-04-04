/**
 * Invoice Viewer Screen with Authentication
 * Uses WebView to display PDF with auth headers
 */

import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, TouchableOpacity, Text, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '../store/authSlice';

const PgInvoiceViewerScreen = ({ navigation, route }) => {
  const { url, title = 'Invoice', orderNumber } = route?.params || {};
  const accessToken = useSelector(selectAccessToken);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log('[InvoiceViewer] URL:', url);
  console.log('[InvoiceViewer] orderNumber:', orderNumber);
  console.log('[InvoiceViewer] accessToken:', accessToken ? 'present' : 'missing');

  if (!url) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#C0392B" />
          <Text style={styles.errorText}>No invoice URL provided</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleOpenInBrowser = async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open URL');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open in browser: ' + err.message);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color="#2b0a59" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#C0392B" />
          <Text style={styles.errorText}>Failed to load invoice</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          
          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenInBrowser}>
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Open in Browser</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#2b0a59" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{title}</Text>
          {orderNumber && <Text style={styles.headerSubtitle}>{orderNumber}</Text>}
        </View>
        <TouchableOpacity onPress={handleOpenInBrowser} style={styles.headerBtn}>
          <Ionicons name="open-outline" size={20} color="#B8891A" />
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B8891A" />
          <Text style={styles.loadingText}>Loading invoice...</Text>
        </View>
      )}

      {/* WebView with Auth Headers */}
      <WebView
        source={{
          uri: url,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }}
        style={styles.webview}
        onLoadStart={() => {
          console.log('[WebView] Load started');
          setLoading(true);
        }}
        onLoadEnd={() => {
          console.log('[WebView] Load ended');
          setLoading(false);
        }}
        onLoad={() => {
          console.log('[WebView] Load success');
          setLoading(false);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebView Error]', nativeEvent);
          setError(nativeEvent.description || 'Failed to load invoice');
          setLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebView HTTP Error]', nativeEvent.statusCode, nativeEvent.url);
          setError(`HTTP Error ${nativeEvent.statusCode}`);
          setLoading(false);
        }}
        onMessage={(event) => {
          console.log('[WebView Message]', event.nativeEvent.data);
        }}
        // PDF-specific settings
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        mixedContentMode="always"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3D8',
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b0a59',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B6050',
    marginTop: 2,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B6050',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C0392B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 13,
    color: '#6B6050',
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#B8891A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E3D8',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6050',
  },
  backBtn: {
    backgroundColor: '#B8891A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PgInvoiceViewerScreen;
