import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const splashVideo = require('../../assets/OXYGOLD.AI Splash.mp4');

// Caps how long the splash can show — also cuts the video short if it's
// longer than this, moving on to Home regardless.
const MAX_DURATION_MS = 4000;

const SplashScreen = ({ navigation }) => {
  const navigatedRef = useRef(false);

  // Everyone lands on Home, logged in or not — guests can browse categories,
  // products, and prices there; login is only asked for when a cart/
  // wishlist/checkout action actually needs an account.
  const goNext = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigation.replace('PgHome');
  };

  const player = useVideoPlayer(splashVideo, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const endSub = player.addListener('playToEnd', goNext);
    const fallback = setTimeout(goNext, MAX_DURATION_MS);
    return () => {
      endSub.remove();
      clearTimeout(fallback);
    };
  }, [player]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
});

export default SplashScreen;
