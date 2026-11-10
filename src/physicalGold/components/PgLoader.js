import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";

// Four dots of shrinking size trailing along a circular path — brand violet
// with a gold lead dot. Core Animated API on the native driver.
// Props: { label, fullscreen }.
const RADIUS = 16;
const DOTS = [
  { angle: -90, size: 13, color: "#503189" }, // brand violet — lead dot
  { angle: -20, size: 11, color: "#6C4AB6" },
  { angle: 50, size: 9, color: "#8A73B8" },
  { angle: 120, size: 7, color: "#B9A9DA" }, // light violet — trailing dot
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
    <View
      style={[styles.container, fullscreen && styles.fullscreen]}
      accessibilityRole="progressbar"
      accessibilityLabel={label || "Loading"}
    >
      <Animated.View style={[styles.orbit, { transform: [{ rotate }] }]}>
        {DOTS.map((d, i) => {
          const rad = (d.angle * Math.PI) / 180;
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
                  transform: [
                    { translateX: RADIUS * Math.cos(rad) },
                    { translateY: RADIUS * Math.sin(rad) },
                  ],
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
  fullscreen: { flex: 1, backgroundColor: "#F7F7F9" },
  orbit: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: { position: "absolute" },
  text: { marginTop: 14, fontSize: 13.5, fontWeight: "500", color: "#757575" },
});

export default PgLoader;
