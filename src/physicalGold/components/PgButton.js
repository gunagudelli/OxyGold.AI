import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { PG_COLORS } from '../constants/physicalGoldColors';

const PgButton = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  disabled = false, 
  style,
  textStyle,
  ...props 
}) => {
  const buttonStyle = [
    styles.button,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'outline' && styles.buttonOutline,
    disabled && styles.buttonDisabled,
    style,
  ];

  const buttonTextStyle = [
    styles.buttonText,
    variant === 'secondary' && styles.buttonTextSecondary,
    variant === 'outline' && styles.buttonTextOutline,
    disabled && styles.buttonTextDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      {...props}
    >
      <Text style={buttonTextStyle}>{String(title || '')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: PG_COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: PG_COLORS.surface,
    borderWidth: 1,
    borderColor: PG_COLORS.border,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: PG_COLORS.gold,
  },
  buttonDisabled: {
    backgroundColor: PG_COLORS.border,
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  buttonTextSecondary: {
    color: PG_COLORS.darkGray,
  },
  buttonTextOutline: {
    color: PG_COLORS.gold,
  },
  buttonTextDisabled: {
    color: PG_COLORS.lightGray,
  },
});

export default PgButton;