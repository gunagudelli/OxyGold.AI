import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

const GoldPriceCard = ({ price, sellPrice, change, changePercent, high, low, loading, source, lastUpdated }) => {
  const isUp = (change || 0) >= 0;

  const formatTime = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <LinearGradient
      colors={['#1A1500', '#2A2000', '#1A1500']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>

      {/* Gold top accent bar */}
      <LinearGradient
        colors={[COLORS.primaryLight, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accent}
      />

      {/* Header row */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>24K Gold · Live Price</Text>
          <Text style={styles.unit}>per gram (INR)</Text>
        </View>
        <View style={styles.rightCol}>
          {change !== 0 && (
            <View style={[styles.badge, { backgroundColor: isUp ? '#0D2B1A' : '#2B0D15' }]}>
              <Text style={[styles.badgeText, { color: isUp ? COLORS.success : COLORS.error }]}>
                {isUp ? '▲' : '▼'} {Math.abs(changePercent || 0).toFixed(2)}%
              </Text>
            </View>
          )}
          {source ? (
            <Text style={styles.sourceText}>{source}</Text>
          ) : null}
        </View>
      </View>

      {/* Buy Price — main large number */}
      <Text style={styles.price}>
        {loading ? '—' : `₹${(price || 0).toLocaleString('en-IN')}`}
      </Text>

      {change !== 0 && (
        <Text style={[styles.change, { color: isUp ? COLORS.success : COLORS.error }]}>
          {isUp ? '+' : ''}₹{change} today
        </Text>
      )}

      <View style={styles.divider} />

      {/* Buy / Sell / High / Low row */}
      <View style={styles.hlRow}>
        <View style={styles.hlItem}>
          <Text style={styles.hlLabel}>Buy Price</Text>
          <Text style={[styles.hlValue, { color: COLORS.primary }]}>
            ₹{(price || 0).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.hlSep} />
        <View style={styles.hlItem}>
          <Text style={styles.hlLabel}>Sell Price</Text>
          <Text style={[styles.hlValue, { color: COLORS.error }]}>
            ₹{(sellPrice || 0).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.hlSep} />
        <View style={styles.hlItem}>
          <Text style={styles.hlLabel}>Purity</Text>
          <Text style={[styles.hlValue, { color: COLORS.primary }]}>99.9%</Text>
        </View>
      </View>

      {/* Last updated */}
      {lastUpdated ? (
        <Text style={styles.updated}>Updated {formatTime(lastUpdated)}</Text>
      ) : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.base,
    borderWidth: 1,
    borderColor: '#3A3000',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  rightCol:  { alignItems: 'flex-end', gap: 4 },
  label:     { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600', letterSpacing: 0.5 },
  unit:      { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  badge:     { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  badgeText: { fontSize: FONT_SIZE.sm, fontWeight: '700' },
  sourceText:{ color: COLORS.textMuted, fontSize: 9, fontStyle: 'italic' },
  price:     { color: COLORS.white, fontSize: FONT_SIZE.huge, fontWeight: '800', letterSpacing: -1 },
  change:    { fontSize: FONT_SIZE.sm, fontWeight: '600', marginTop: 4, marginBottom: SPACING.md },
  divider:   { height: 1, backgroundColor: '#3A3000', marginBottom: SPACING.md },
  hlRow:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  hlItem:    { alignItems: 'center', flex: 1 },
  hlLabel:   { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginBottom: 3 },
  hlValue:   { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  hlSep:     { width: 1, height: 28, backgroundColor: '#3A3000' },
  updated:   { color: COLORS.textMuted, fontSize: 9, textAlign: 'right', marginTop: SPACING.sm },
});

export default GoldPriceCard;
