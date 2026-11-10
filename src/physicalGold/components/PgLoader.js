import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Gold & silver coin loader — the two coins take turns hopping up and doing
// a full flip (like a coin toss), each over a soft shadow that shrinks as the
// coin rises. Core Animated API on the native driver, so it stays smooth
// while the screen loads. Same props as before: { label, fullscreen }.

const COIN = 38;
const DURATION = 1100; // one hop + flip

const COINS = [
  {
    key: "gold",
    symbol: "Au",
    face: ["#FFF1B8", "#E9B93A", "#B8860B"],
    rim: "#A97C10",
    text: "#7A5A0B",
  },
  {
    key: "silver",
    symbol: "Ag",
    face: ["#FFFFFF", "#CDD2DA", "#8E96A3"],
    rim: "#7D8592",
    text: "#4B5260",
  },
];

const Coin = ({ coin, progress }) => {
  // 0 → 1: rise + flip; it lands back on 1.
  const translateY = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -18, 0],
  });
  const rotateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const shadowScale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.55, 1],
  });
  const shadowOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.22, 0.08, 0.22],
  });

  return (
    <View style={styles.coinSlot}>
      <Animated.View
        style={{ transform: [{ perspective: 600 }, { translateY }, { rotateY }] }}
      >
        <LinearGradient
          colors={coin.face}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.9, y: 0.95 }}
          style={[styles.coin, { borderColor: coin.rim }]}
        >
          <View style={[styles.coinInner, { borderColor: coin.rim }]}>
            <Text style={[styles.coinSymbol, { color: coin.text }]}>{coin.symbol}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
      <Animated.View
        style={[styles.coinShadow, { opacity: shadowOpacity, transform: [{ scaleX: shadowScale }] }]}
      />
    </View>
  );
};

const PgLoader = ({ label = "Loading...", fullscreen = true }) => {
  const gold = useRef(new Animated.Value(0)).current;
  const silver = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const hop = (v) =>
      Animated.timing(v, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const reset = (v) => Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true });
    // Gold hops, then silver hops — on repeat.
    const loop = Animated.loop(
      Animated.sequence([hop(gold), reset(gold), hop(silver), reset(silver)]),
    );
    loop.start();
    return () => loop.stop();
  }, [gold, silver]);

  return (
    <View
      style={[styles.container, fullscreen && styles.fullscreen]}
      accessibilityRole="progressbar"
      accessibilityLabel={label || "Loading"}
    >
      <View style={styles.coinsRow}>
        <Coin coin={COINS[0]} progress={gold} />
        <Coin coin={COINS[1]} progress={silver} />
      </View>
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
  coinsRow: { flexDirection: "row", alignItems: "flex-end", gap: 14, paddingTop: 20 },
  coinSlot: { alignItems: "center" },
  coin: {
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  coinInner: {
    width: COIN - 10,
    height: COIN - 10,
    borderRadius: (COIN - 10) / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
  },
  coinSymbol: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  coinShadow: {
    marginTop: 6,
    width: COIN - 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2A1F4A",
  },
  text: { marginTop: 16, fontSize: 14, fontWeight: "500", color: "#757575" },
});

export default PgLoader;
