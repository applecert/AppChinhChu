import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { COLORS, useThemeUpdate } from '../../constants/theme';

interface TabTransitionProps {
  children: React.ReactNode;
  tabPath: string;
}

// Global variable to track the active tab across tab components
let lastActiveTabPath = '/';

const TAB_PATHS = ['/', '/sign', '/apps', '/mmo'];

export function TabTransition({ children, tabPath }: TabTransitionProps) {
  useThemeUpdate(); // Sync background color with dynamic theme updates
  const pathname = usePathname();
  // Normalize pathname (strip trailing slashes if any)
  const normalizedPathname = pathname === '/index' ? '/' : pathname;
  const isTabActive = normalizedPathname === tabPath;

  const opacity = useRef(new Animated.Value(isTabActive ? 1 : 0)).current;

  useEffect(() => {
    if (isTabActive) {
      const isTabSwitch = lastActiveTabPath !== tabPath;
      lastActiveTabPath = tabPath;

      if (isTabSwitch) {
        // Smooth fade-in transition starting from 0 to avoid brightness flash
        opacity.setValue(0);

        Animated.timing(opacity, {
          toValue: 1,
          duration: 200, // Balanced, fast and smooth fade-in
          useNativeDriver: true,
        }).start();
      } else {
        // If returning from a modal, ensure values stay at active state
        opacity.setValue(1);
      }
    } else {
      // If another tab was activated, hide this tab immediately
      const isOtherTabActive = TAB_PATHS.includes(normalizedPathname);
      if (isOtherTabActive) {
        opacity.setValue(0);
      }
    }
  }, [normalizedPathname, isTabActive, tabPath]);

  return (
    <Animated.View style={[
      styles.container, 
      { 
        opacity,
        backgroundColor: COLORS.background 
      }
    ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
