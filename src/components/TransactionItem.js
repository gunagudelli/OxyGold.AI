import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

const TransactionItem = ({ item }) => {
  const isBuy = item.type === 'BUY';
  const date  = new Date(item.timestamp).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const time  = new Date(item.timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: isBuy ? '#0A2A1A' : '#2A0A12' }]}>
        <Text style={styles.iconText}>{isBuy ? '🪙' : '💸'}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>{isBuy ? 'Gold Purchased' : 'Gold Sold'}</Text>
        <Text style={styles.sub}>{date} · {time}</Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: isBuy ? COLORS.error : COLORS.success }]}>
          {isBuy ? '-' : '+'}₹{item.amount?.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.grams}>{item.grams}g</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconText: { fontSize: 20 },
  info:     { flex: 1 },
  title:    { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  sub:      { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 3 },
  right:    { alignItems: 'flex-end' },
  amount:   { fontSize: FONT_SIZE.md, fontWeight: '700' },
  grams:    { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: '600', marginTop: 3 },
});

export default TransactionItem;
