import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SHADOW } from '../constants/theme';
import { COLORS } from '../constants/colors';

const GradientCard = ({ children, colors, style, ...props }) => (
  <LinearGradient
    colors={colors || [COLORS.card, COLORS.surfaceLight]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.card, style]}
    {...props}>
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
});

export default GradientCard;
