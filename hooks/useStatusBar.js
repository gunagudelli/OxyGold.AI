import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';

const useStatusBar = (style = 'dark-content', bgColor = '#ffffff') => {
  useEffect(() => {
    try {
      StatusBar.setBarStyle(style, true);
      if (Platform.OS === 'android') StatusBar.setBackgroundColor(bgColor, true);
    } catch {}
  }, [style, bgColor]);
};

export default useStatusBar;
