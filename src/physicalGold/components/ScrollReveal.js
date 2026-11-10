import React, { createContext, useContext, useEffect, useRef } from "react";
import { Animated, Dimensions, Easing } from "react-native";

// Scroll-triggered entrance — a card stays hidden until it scrolls into
// view, then fades/rises/pops in once. The screen owns a hub (see
// createRevealHub) and calls hub.notify() from its ScrollView's onScroll;
// every unrevealed ScrollReveal re-checks its on-screen position then.
// Without a provider it simply reveals on mount.

export const createRevealHub = () => {
  const listeners = new Set();
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    notify() {
      listeners.forEach((fn) => fn());
    },
  };
};

const ScrollRevealContext = createContext(null);
export const ScrollRevealProvider = ScrollRevealContext.Provider;

// How far up from the bottom edge a card must come before it reveals.
const REVEAL_OFFSET = 40;

const ScrollReveal = ({
  children,
  style,
  delay = 0,
  distance = 40,
  duration = 520,
  scaleFrom = 0.92,
}) => {
  const hub = useContext(ScrollRevealContext);
  const viewRef = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const revealedRef = useRef(false);
  const unsubRef = useRef(null);

  const reveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    unsubRef.current?.();
    unsubRef.current = null;
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const check = () => {
    if (revealedRef.current || !viewRef.current) return;
    viewRef.current.measureInWindow((x, y, w, h) => {
      if (!h && !w) return; // not laid out yet
      const windowH = Dimensions.get("window").height;
      if (y < windowH - REVEAL_OFFSET && y + h > 0) reveal();
    });
  };

  useEffect(() => {
    if (!hub) {
      reveal();
      return undefined;
    }
    unsubRef.current = hub.subscribe(check);
    return () => unsubRef.current?.();
  }, [hub]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [scaleFrom, 1],
  });

  return (
    <Animated.View
      ref={viewRef}
      collapsable={false}
      onLayout={() => requestAnimationFrame(check)}
      style={[style, { opacity: progress, transform: [{ translateY }, { scale }] }]}
    >
      {children}
    </Animated.View>
  );
};

export default ScrollReveal;
