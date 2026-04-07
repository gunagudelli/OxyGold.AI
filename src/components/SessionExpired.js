/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SESSION EXPIRED COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Reusable component to show when session expires
 * Can be used as:
 * 1. Full screen fallback
 * 2. Inline error state
 * 3. Modal overlay
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SessionExpired = ({ 
  onLoginPress, 
  message = 'Your session has expired',
  description = 'Please log in again to continue',
  variant = 'fullscreen' // 'fullscreen' | 'inline' | 'modal'
}) => {
  const styles = variant === 'fullscreen' ? fullscreenStyles : 
                 variant === 'modal' ? modalStyles : 
                 inlineStyles;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={64} color="#B8891A" />
        </View>

        {/* Message */}
        <Text style={styles.title}>{message}</Text>
        <Text style={styles.description}>{description}</Text>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={onLoginPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Login Again</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Additional Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#6B6050" />
          <Text style={styles.infoText}>
            Your data is safe. Login to continue where you left off.
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Shared Styles ────────────────────────────────────────────────────────────
const sharedStyles = {
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(184,137,26,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(184,137,26,0.20)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1508',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B6050',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B8891A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
    shadowColor: '#B8891A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0EDE6',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B6050',
    lineHeight: 16,
  },
};

// ─── Fullscreen Variant ───────────────────────────────────────────────────────
const fullscreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  ...sharedStyles,
});

// ─── Inline Variant ───────────────────────────────────────────────────────────
const inlineStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E8E3D8',
  },
  content: {
    alignItems: 'center',
  },
  ...sharedStyles,
});

// ─── Modal Variant ────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ...sharedStyles,
});

export default SessionExpired;
