import React, { createContext, useContext, useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, View } from "react-native";

// Scroll-triggered entrance — a card stays hidden until it scrolls into
// view, then slides / rises / pops in. The screen owns a hub (see
// createRevealHub) and calls hub.notify() from its ScrollView's onScroll;
// every ScrollReveal re-checks its on-screen position then (at most once
// per frame). Without a provider it simply reveals on mount.
//
// Props:
//   from     "bottom" (default) | "left" | "right" — direction it comes from
//   pop      true → springy scale-up (good for round tiles / icons)
//   replay   true (default) → once fully off-screen it resets, so it animates
//            again every time it scrolls back into view
//   delay, distance, duration, scaleFrom — fine-tuning

export const createRevealHub = () => {
  const listeners = new Set();
  let queued = false;
  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    // Coalesced to one pass per frame so fast scrolling stays smooth.
    notify() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        listeners.forEach((fn) => fn());
      });
    },
  };
};

const ScrollRevealContext = createContext(null);
export const ScrollRevealProvider = ScrollRevealContext.Provider;

// useInView(ref) — true while the referenced view is (at least partly) on
// screen inside the hub's ScrollView. Used to run continuous animations only
// while they can be seen. Without a provider it always returns true.
export const useInView = (ref) => {
  const hub = useContext(ScrollRevealContext);
  const [inView, setInView] = React.useState(true);
  const lastRef = useRef(true);
  const check = React.useCallback(() => {
    if (!ref.current) return;
    ref.current.measureInWindow((x, y, w, h) => {
      if (!h && !w) return;
      const windowH = Dimensions.get("window").height;
      const visible = y < windowH && y + h > 0;
      if (visible !== lastRef.current) {
        lastRef.current = visible;
        setInView(visible);
      }
    });
  }, [ref]);
  useEffect(() => {
    if (!hub) return undefined;
    const unsub = hub.subscribe(check);
    requestAnimationFrame(check);
    return unsub;
  }, [hub, check]);
  return { inView, onLayout: () => requestAnimationFrame(check) };
};

// How far up from the bottom edge a card must come before it reveals.
const REVEAL_OFFSET = 40;

// Scroll animations are switched OFF (clean, static UI). ScrollReveal then
// renders its children in a plain View — same layout, no motion. Set to true
// to bring the slide/fade-in back.
const SCROLL_ANIMATIONS = true;
// Subtle mode: every reveal is a short fade + small rise, played once —
// sideways slides, pops and replays are ignored for a calm, premium feel.
const SUBTLE = true;

const ScrollReveal = (props) => {
  if (!SCROLL_ANIMATIONS) return <View style={props.style}>{props.children}</View>;
  if (SUBTLE) {
    return (
      <AnimatedReveal
        style={props.style}
        delay={Math.min(props.delay || 0, 120)}
        distance={16}
        duration={450}
        scaleFrom={0.98}
        from="bottom"
        pop={false}
        replay={false}
      >
        {props.children}
      </AnimatedReveal>
    );
  }
  return <AnimatedReveal {...props} />;
};

const AnimatedReveal = ({
  children,
  style,
  delay = 0,
  distance = 40,
  duration = 560,
  scaleFrom = 0.92,
  from = "bottom",
  pop = false,
  replay = true,
}) => {
  const hub = useContext(ScrollRevealContext);
  const viewRef = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const shownRef = useRef(false);
  const animRef = useRef(null);

  const reveal = () => {
    if (shownRef.current) return;
    shownRef.current = true;
    animRef.current?.stop();
    animRef.current = pop
      ? Animated.spring(progress, {
          toValue: 1,
          delay,
          friction: 5,
          tension: 70,
          useNativeDriver: true, isInteraction: false,
        })
      : Animated.timing(progress, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true, isInteraction: false,
        });
    animRef.current.start();
  };

  // Fully off-screen again → reset (invisible to the user) so it can replay.
  const hide = () => {
    if (!shownRef.current) return;
    shownRef.current = false;
    animRef.current?.stop();
    progress.setValue(0);
  };

  const check = () => {
    if (!viewRef.current) return;
    if (shownRef.current && !replay) return;
    viewRef.current.measureInWindow((x, y, w, h) => {
      if (!h && !w) return; // not laid out yet
      const windowH = Dimensions.get("window").height;
      const inView = y < windowH - REVEAL_OFFSET && y + h > 0;
      const fullyOut = y > windowH || y + h < 0;
      if (inView) reveal();
      else if (replay && fullyOut) hide();
    });
  };

  useEffect(() => {
    if (!hub) {
      reveal();
      return undefined;
    }
    const unsub = hub.subscribe(check);
    return () => {
      unsub();
      animRef.current?.stop();
    };
  }, [hub]);

  const offset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from === "left" ? -distance : distance, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [pop ? 0.6 : scaleFrom, 1],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.8, 1],
    extrapolate: "clamp",
  });
  const transform =
    from === "left" || from === "right"
      ? [{ translateX: offset }, { scale }]
      : [{ translateY: offset }, { scale }];

  return (
    <Animated.View
      ref={viewRef}
      collapsable={false}
      onLayout={() => requestAnimationFrame(check)}
      style={[style, { opacity, transform }]}
    >
      {children}
    </Animated.View>
  );
};

export default ScrollReveal;
