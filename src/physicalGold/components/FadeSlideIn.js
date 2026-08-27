import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

// Single shared entrance animation — used across Physical Gold screens so
// every screen fades/slides in the same subtle way (opacity + 14px rise).
const FadeSlideIn = ({ children, style, delay = 0, distance = 14, duration = 360 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

export default FadeSlideIn;
