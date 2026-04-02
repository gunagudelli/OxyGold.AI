import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT_SIZE, SPACING } from '../constants/theme';

const StatRow = ({ label, value, valueColor, last }) => (
  <View style={[styles.row, !last && styles.border]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, valueColor && { color: valueColor }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  border:  { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label:   { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  value:   { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});

export default StatRow;
