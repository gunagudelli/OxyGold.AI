import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";

// Four dots of shrinking size trailing along a circular path, in our own
// gold → emerald palette. Same "orbiting trail" style as the OxyLoans
// Borrower app's loader, recreated with the core Animated API (no native
// module) so it renders in Expo Go without a rebuild.
const RADIUS = 16;
const DOTS = [
  { angle: -90, size: 13, color: "#CF8B17" }, // gold — lead dot
  { angle: -20, size: 11, color: "#14876D" }, // bright emerald
  { angle: 50, size: 9, color: "#0E6B57" }, // emerald
  { angle: 120, size: 7, color: "#0B5245" }, // deep emerald — trailing dot
];

const PgLoader = ({ label = "Loading...", fullscreen = true }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <Animated.View style={[styles.orbit, { transform: [{ rotate }] }]}>
        {DOTS.map((d, i) => {
          const rad = (d.angle * Math.PI) / 180;
          const x = RADIUS * Math.cos(rad);
          const y = RADIUS * Math.sin(rad);
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: d.size,
                  height: d.size,
                  borderRadius: d.size / 2,
                  backgroundColor: d.color,
                  transform: [{ translateX: x }, { translateY: y }],
                },
              ]}
            />
          );
        })}
      </Animated.View>
      {!!label && <Text style={styles.text}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  fullscreen: { flex: 1, backgroundColor: "#F8F7F6" },
  orbit: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: { position: "absolute" },
  text: { marginTop: 14, fontSize: 13.5, fontWeight: "600", color: "#7A7A80" },
});

export default PgLoader;
