import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useVideoPlayer, VideoView } from 'expo-video';
import { selectAccessToken } from '../store/authSlice';

const splashVideo = require('../../assets/OXYGOLD.AI Splash.mp4');

// Safety net in case the video fails to fire its end event on some devices.
const MAX_DURATION_MS = 6000;

const SplashScreen = ({ navigation }) => {
  const accessToken = useSelector(selectAccessToken);
  const navigatedRef = useRef(false);

  const goNext = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigation.replace(accessToken ? 'PgHome' : 'Login');
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
