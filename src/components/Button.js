import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

const Button = ({ title, onPress, variant = 'primary', loading, disabled, style, icon }) => {
  const isOutline = variant === 'outline';
  const isDanger  = variant === 'danger';
  const isGhost   = variant === 'ghost';

  const content = (
    <View style={styles.inner}>
      {loading
        ? <ActivityIndicator color={isOutline ? COLORS.primary : COLORS.black} size="small" />
        : <>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <Text style={[
              styles.text,
              isOutline && { color: COLORS.primary },
              isDanger   && { color: COLORS.white },
              isGhost    && { color: COLORS.textSecondary },
            ]}>
              {title}
            </Text>
          </>
      }
    </View>
  );

  if (isOutline || isDanger || isGhost) {
    return (
      <TouchableOpacity
        style={[
          styles.base,
          isOutline && styles.outline,
          isDanger  && styles.danger,
          isGhost   && styles.ghost,
          (disabled || loading) && styles.disabled,
          style,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[(disabled || loading) && styles.disabled, style]}>
      <LinearGradient
        colors={[COLORS.primaryLight, COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.base}>
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  inner:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  text:    { color: COLORS.black, fontSize: FONT_SIZE.base, fontWeight: '700', letterSpacing: 0.3 },
  icon:    { fontSize: FONT_SIZE.lg },
  outline: { borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.transparent },
  danger:  { backgroundColor: COLORS.error },
  ghost:   { backgroundColor: COLORS.transparent },
  disabled:{ opacity: 0.45 },
});

export default Button;
