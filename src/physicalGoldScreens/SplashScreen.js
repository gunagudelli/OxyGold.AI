import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SplashScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered animation sequence
    Animated.sequence([
      // Logo fade-in + scale (0-1s)
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Text fade-in + slide up (1-2s)
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Hold for 2 more seconds (total 5s)
      Animated.delay(2000),
    ]).start(() => {
      // Navigate to home after animation completes
      navigation.replace('PgHome');
    });
  }, [navigation, logoScale, logoOpacity, textOpacity, textTranslateY]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Background gradient effect */}
      <View style={styles.gradientBg} />

      {/* Logo Container */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Text style={styles.logoEmoji}>✨</Text>
      </Animated.View>

      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.appName}>OXYGOLD.AI</Text>
        <Text style={styles.tagline}>Premium Gold Investment</Text>
      </Animated.View>

      {/* Bottom accent */}
      <View style={styles.bottomAccent} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C2340',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    backgroundColor: 'rgba(212, 168, 67, 0.03)',
    borderRadius: 200,
    top: -100,
    right: -100,
  },
  logoContainer: {
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 80,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#D4A843',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bottomAccent: {
    position: 'absolute',
    bottom: 40,
    width: 60,
    height: 3,
    backgroundColor: '#D4A843',
    borderRadius: 2,
  },
});

export default SplashScreen;
