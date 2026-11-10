import React, { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

// Festive firework "blast" — a few bursts of gold / saffron / pink sparks that
// fly out, fall slightly and fade. Plays once each time `playKey` changes
// (Home bumps it on every focus). Overlay only: never blocks touches.

const { width: W, height: H } = Dimensions.get("window");
const COLORS = ["#FFD166", "#F59E0B", "#FF7A59", "#F472B6", "#FDE68A", "#FFFFFF"];
const SPARKS = 20;

const Burst = memo(({ x, y, delay, color }) => {
  const t = useRef(new Animated.Value(0)).current;
  const sparks = useMemo(
    () =>
      Array.from({ length: SPARKS }, (_, i) => {
        const angle = (Math.PI * 2 * i) / SPARKS;
        const dist = 80 + Math.random() * 55;
        return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 4.5 + Math.random() * 3.5 };
      }),
    [],
  );

  useEffect(() => {
    t.setValue(0);
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 1300,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = t.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 0.9, 0] });

  return (
    <View style={{ position: "absolute", left: x, top: y }} pointerEvents="none">
      {sparks.map((sp, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: sp.size,
            height: sp.size,
            borderRadius: sp.size / 2,
            backgroundColor: i % 3 === 0 ? "#FFFFFF" : color,
            opacity,
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, sp.dx] }) },
              // fly out, then drift down a little (gravity)
              {
                translateY: t.interpolate({
                  inputRange: [0, 0.75, 1],
                  outputRange: [0, sp.dy, sp.dy + 22],
                }),
              },
              { scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.2, 0.6] }) },
            ],
          }}
        />
      ))}
    </View>
  );
});

const DiwaliBlast = ({ playKey }) => {
  // New random burst positions for every play.
  const bursts = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        x: W * (0.18 + 0.64 * Math.random()),
        y: H * (0.18 + 0.32 * Math.random()),
        delay: i * 220,
        color: COLORS[(i + Math.floor(Math.random() * COLORS.length)) % COLORS.length],
      })),
    [playKey],
  );
  if (!playKey) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bursts.map((b, i) => (
        <Burst key={`${playKey}-${i}`} {...b} />
      ))}
    </View>
  );
};

export default memo(DiwaliBlast);

// "Happy Diwali" pop-up — fades/scales in, stays ~3s, fades out by itself.
// Overlay only: never blocks touches.
export const DiwaliGreeting = memo(({ showKey }) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!showKey) return undefined;
    a.setValue(0);
    const seq = Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(a, { toValue: 0, duration: 450, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [showKey]);
  if (!showKey) return null;
  return (
    <View style={greet.wrap} pointerEvents="none">
      <Animated.View
        style={[
          greet.card,
          {
            opacity: a,
            transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          },
        ]}
      >
        <Animated.Text style={greet.diya}>🪔</Animated.Text>
        <Animated.Text style={greet.title}>Happy Diwali!</Animated.Text>
        <Animated.Text style={greet.text}>
          May the festival of lights fill your home with prosperity.
        </Animated.Text>
        <Animated.Text style={greet.from}>— Team OxyGold</Animated.Text>
      </Animated.View>
    </View>
  );
});

const greet = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    backgroundColor: "#5A44A0",
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.45)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  diya: { fontSize: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#FFD166", marginTop: 6 },
  text: { fontSize: 14, color: "#F3E8FF", textAlign: "center", lineHeight: 20, marginTop: 6 },
  from: { fontSize: 12, color: "#C9BEE6", marginTop: 10 },
});
