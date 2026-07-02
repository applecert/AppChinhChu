import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Dimensions, Text,
  Platform, DeviceEventEmitter, Animated, PanResponder,
} from 'react-native';
import { Tabs, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GlassView } from '../../components/ui/GlassView';
import * as Haptics from 'expo-haptics';
import { COLORS, useThemeUpdate, TXT } from '../../constants/theme';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { SPRINGS, pulseAnim } from '../../constants/animations';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 40;
const TAB_COUNT = 4;
const TAB_WIDTH = (TAB_BAR_WIDTH - 16) / TAB_COUNT;

const TAB_CONFIG = [
  { name: 'index', icon: 'house',           iconActive: 'house.fill' },
  { name: 'sign',  icon: 'wrench',          iconActive: 'wrench.fill' },
  { name: 'apps',  icon: 'square.grid.2x2', iconActive: 'square.grid.2x2.fill' },
  { name: 'mmo',   icon: 'cart',            iconActive: 'cart.fill' },
] as const;

// ─── Single Tab Icon with independent micro-animations ───────────────────────
function TabIcon({ name, isFocused, index, slideAnim }: { name: string; isFocused: boolean; index: number; slideAnim: Animated.Value }) {
  const isLight = COLORS.background === '#F4F4F6';
  const config  = TAB_CONFIG.find(c => c.name === name);
  const symbol  = config ? (isFocused ? config.iconActive : config.icon) : 'house';

  const labelMap: Record<string, string> = {
    'index': TXT.langName === 'English' ? 'Home'      : 'Trang chủ',
    'sign':  TXT.langName === 'English' ? 'Creator'   : 'Ký App',
    'apps':  TXT.langName === 'English' ? 'Explore'   : 'Kho App',
    'mmo':   TXT.langName === 'English' ? 'Templates' : 'Chợ MMO',
  };
  const tabLabel = labelMap[name] || name;

  const iconOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.55)).current;

  const prevFocused = useRef(isFocused);

  useEffect(() => {
    if (isFocused && !prevFocused.current) {
      Animated.parallel([
        Animated.timing(labelOpacity,{ toValue: 1,    duration: 200, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1,    duration: 180, useNativeDriver: true }),
      ]).start();
    } else if (!isFocused && prevFocused.current) {
      Animated.parallel([
        Animated.timing(labelOpacity,{ toValue: 0.55, duration: 160, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 0.5,  duration: 180, useNativeDriver: true }),
      ]).start();
    }
    prevFocused.current = isFocused;
  }, [isFocused]);

  const activeColor   = isLight ? '#000000' : '#FFFFFF';
  const inactiveColor = isLight ? '#8E8E93' : 'rgba(255,255,255,0.45)';

  return (
    <View style={styles.iconWrapper}>
      <Animated.View style={{ opacity: iconOpacity }}>
        <IconSymbol name={symbol} size={21} color={isFocused ? activeColor : inactiveColor} />
      </Animated.View>
      <Animated.Text style={[
        styles.tabLabel,
        { color: isFocused ? activeColor : inactiveColor,
          fontWeight: isFocused ? '700' : '500',
          opacity: labelOpacity },
      ]}>
        {tabLabel}
      </Animated.Text>
    </View>
  );
}

// ─── Floating Tab Bar ─────────────────────────────────────────────────────────
function FloatingTabBar({ state, descriptors, navigation }: any) {
  useThemeUpdate();
  const isLight = COLORS.background === '#F4F4F6';

  // Vertical translation (hide/show)
  const translateY = useRef(new Animated.Value(0)).current;
  // Overall bar scale: slight "breath" on show
  const barScale   = useRef(new Animated.Value(1)).current;
  // Bar opacity for very smooth transitions
  const barOpacity = useRef(new Animated.Value(1)).current;
  
  // Stretch factor ranging from negative (left pull) to positive (right pull)
  const barStretch = useRef(new Animated.Value(0)).current;
  // Dedicated interaction scale value for zoom, separating it from main show/hide bounce to prevent stutter
  const barInteractScale = useRef(new Animated.Value(1)).current;

  // Liquid droplet animation values
  const slideAnim = useRef(new Animated.Value(state.index)).current;
  const stretchAnim = useRef(new Animated.Value(1)).current;
  const flattenAnim = useRef(new Animated.Value(1)).current;
  const isDragging = useRef(false);

  // ⚠️ Fix closure bug: PanResponder is created once but state/navigation change.
  // Store latest values in refs so gesture handlers always read fresh data.
  const stateRef = useRef(state);
  const navigationRef = useRef(navigation);
  const visibleRoutesRef = useRef<any[]>([]);
  useEffect(() => {
    stateRef.current = state;
    navigationRef.current = navigation;
  });

  const showBar = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0,   ...SPRINGS.float }),
      Animated.spring(barScale,   { toValue: 1,   ...SPRINGS.bounce }),
      Animated.timing(barOpacity, { toValue: 1,   duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const hideBar = useCallback(() => {
    // Giữ thanh tab bar luôn hiển thị, không tự động trượt xuống ẩn đi
  }, []);

  useEffect(() => {
    const showSub = DeviceEventEmitter.addListener('showTabBar', showBar);
    const hideSub = DeviceEventEmitter.addListener('hideTabBar', hideBar);
    return () => { showSub.remove(); hideSub.remove(); };
  }, [showBar, hideBar]);

  // Always re-show when active tab changes
  useEffect(() => { showBar(); }, [state.index]);

  const animatePill = (toIndex: number) => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: toIndex,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(stretchAnim, {
          toValue: 1.35,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(stretchAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        })
      ]),
      Animated.sequence([
        Animated.timing(flattenAnim, {
          toValue: 0.8,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(flattenAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        })
      ])
    ]).start();
  };

  useEffect(() => {
    if (!isDragging.current) {
      animatePill(state.index);
    }
  }, [state.index]);

  const visibleRoutes = state.routes.filter((route: any) =>
    TAB_CONFIG.some(c => c.name === route.name)
  );
  // Keep the ref in sync on every render
  visibleRoutesRef.current = visibleRoutes;

  const lastHoveredIndex = useRef(state.index);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        isDragging.current = true;
        slideAnim.stopAnimation();
        stretchAnim.stopAnimation();
        flattenAnim.stopAnimation();
        
        const localX = gestureState.x0 - 20;
        const targetIndex = Math.min(Math.max(Math.floor((localX - 8) / TAB_WIDTH), 0), TAB_COUNT - 1);
        
        lastHoveredIndex.current = targetIndex;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: targetIndex,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }),
          // Tactile scale-up zoom of entire container on touch (stutter-free separate value)
          Animated.spring(barInteractScale, {
            toValue: 1.035,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          })
        ]).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        const localX = gestureState.moveX - 20;
        const floatIndex = (localX - 8 - TAB_WIDTH / 2) / TAB_WIDTH;
        const clampedIndex = Math.min(Math.max(floatIndex, 0), TAB_COUNT - 1);
        
        slideAnim.setValue(clampedIndex);
        
        // Calculate rubber-band offset when dragging past boundaries (0 and 3)
        let excess = 0;
        if (floatIndex < 0) {
          excess = floatIndex;
        } else if (floatIndex > TAB_COUNT - 1) {
          excess = floatIndex - (TAB_COUNT - 1);
        }
        // Clamp excess to [-0.8, 0.8] for safe maximum stretch bounds
        const clampedExcess = Math.min(Math.max(excess, -0.8), 0.8);
        barStretch.setValue(clampedExcess * 0.15); // Multiply by 0.15 for rubber-band resistance
        
        const hoveredIndex = Math.min(Math.max(Math.floor((localX - 8) / TAB_WIDTH), 0), TAB_COUNT - 1);
        if (hoveredIndex !== lastHoveredIndex.current) {
          lastHoveredIndex.current = hoveredIndex;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        
        stretchAnim.setValue(1.15);
        flattenAnim.setValue(0.9);
      },
      onPanResponderRelease: (evt, gestureState) => {
        isDragging.current = false;

        // ✅ Always read from refs to get FRESH state (fixes closure stale bug)
        const currentState = stateRef.current;
        const currentNavigation = navigationRef.current;
        const currentRoutes = visibleRoutesRef.current;

        // Calculate exact X position on release using starting coordinate and delta
        const finalX = gestureState.x0 + gestureState.dx - 20;
        const finalIndex = Math.min(Math.max(Math.floor((finalX - 8) / TAB_WIDTH), 0), TAB_COUNT - 1);

        // Instantly snap droplet to target index to prevent getting stuck in the middle
        animatePill(finalIndex);

        // Spring reset container zoom and stretch factors back to resting defaults
        Animated.parallel([
          Animated.spring(barInteractScale, {
            toValue: 1.0,
            friction: 5,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(barStretch, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          })
        ]).start();

        const targetRoute = currentRoutes[finalIndex];
        if (!targetRoute) return;

        // Use fresh state.index to check if we're already on this tab
        const currentRouteName = currentState.routes[currentState.index]?.name;
        const isAlreadyFocused = currentRouteName === targetRoute.name;

        const event = currentNavigation.emit({
          type: 'tabPress',
          target: targetRoute.key,
          canPreventDefault: true,
        });

        if (!isAlreadyFocused && !event.defaultPrevented) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          currentNavigation.navigate(targetRoute.name);
        } else {
          // Snap back if same tab or navigation prevented
          animatePill(currentState.index);
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        animatePill(state.index);
        
        // Reset scale and stretch factors on termination
        Animated.parallel([
          Animated.spring(barInteractScale, {
            toValue: 1.0,
            friction: 5,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(barStretch, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          })
        ]).start();
      }
    })
  ).current;

  const pillWidth = TAB_WIDTH - 8;
  const pillLeftOffset = 12;

  // Deriving off-center elastic stretching using scaleX and translateX combinations
  const barScaleX = barStretch.interpolate({
    inputRange: [-0.15, 0, 0.15],
    outputRange: [1.15, 1, 1.15],
    extrapolate: 'clamp',
  });

  const barTranslateX = barStretch.interpolate({
    inputRange: [-0.15, 0, 0.15],
    outputRange: [
      -0.15 * (TAB_BAR_WIDTH / 2),
      0,
      0.15 * (TAB_BAR_WIDTH / 2)
    ],
    extrapolate: 'clamp',
  });

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [
      0 * TAB_WIDTH + pillLeftOffset,
      1 * TAB_WIDTH + pillLeftOffset,
      2 * TAB_WIDTH + pillLeftOffset,
      3 * TAB_WIDTH + pillLeftOffset,
    ]
  });

  return (
    <Animated.View style={[
      styles.tabBarContainer,
      { transform: [{ translateY }, { translateX: barTranslateX }, { scale: barScale }, { scale: barInteractScale }, { scaleX: barScaleX }], opacity: barOpacity },
    ]}>
      {/* Liquid Glass pill */}
      <View style={[
        styles.tabBarOuter,
        isLight ? styles.tabBarOuterLight : styles.tabBarOuterDark,
      ]}>
        <GlassView
          intensity={isLight ? 85 : 55}
          tint={isLight ? 'light' : 'dark'}
          style={styles.blurFill}
        >
          {/* Shared Liquid Glass Droplet Pill with Refraction Glow */}
          <Animated.View
            style={[
              styles.sharedPill,
              {
                left: 0,
                transform: [
                  { translateX },
                  { scaleX: stretchAnim },
                  { scaleY: flattenAnim }
                ],
                shadowColor: isLight ? '#007AFF' : '#5856D6',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: isLight ? 0.35 : 0.5,
                shadowRadius: 12,
              }
            ]}
          >
            {/* Core Volumetric Glass Droplet */}
            <GlassView
              intensity={isLight ? 95 : 80}
              tint={isLight ? 'light' : 'dark'}
              style={[StyleSheet.absoluteFill, {
                borderRadius: 30, // Stadium capsule rounded corners (half of height 60)
                backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 30, 0.85)',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)',
              }]}
            >
              {/* Bottom shadow of droplet for 3D depth */}
              <View style={{
                position: 'absolute',
                bottom: 3,
                left: 14,
                right: 14,
                height: 3,
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.15)',
                borderRadius: 1.5
              }} />
            </GlassView>
          </Animated.View>

          <View style={styles.tabRow} {...panResponder.panHandlers}>
            {visibleRoutes.map((route: any, idx: number) => {
              const isFocused = state.routes[state.index].name === route.name;
              return (
                <View
                  key={route.name}
                  style={[styles.tabItem, { width: TAB_WIDTH }]}
                >
                  <TabIcon name={route.name} isFocused={isFocused} index={idx} slideAnim={slideAnim} />
                </View>
              );
            })}
          </View>
        </GlassView>
      </View>
    </Animated.View>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function TabLayout() {
  useThemeUpdate();
  const isLight = COLORS.background === '#F4F4F6';

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <Tabs 
        tabBar={(props) => <FloatingTabBar {...props} />} 
        screenOptions={{ headerShown: false }}
        {...({ sceneContainerStyle: { backgroundColor: COLORS.background } } as any)}
      >
        <Tabs.Screen name="index"   options={{ title: 'Trang chủ' }} />
        <Tabs.Screen name="sign"    options={{ title: 'Ký App' }} />
        <Tabs.Screen name="apps"    options={{ title: 'Kho App' }} />
        <Tabs.Screen name="mmo"     options={{ title: 'Chợ MMO' }} />
      </Tabs>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 22,
    width: '100%',
    alignItems: 'center',
    zIndex: 999,
  },
  tabBarOuter: {
    width: TAB_BAR_WIDTH,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
  },
  tabBarOuterDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(10,10,12,0.75)',
  },
  tabBarOuterLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(0,0,0,0.04)',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  blurFill: {
    flex: 1,
    position: 'relative',
  },

  tabRow: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  sharedPill: {
    position: 'absolute',
    width: TAB_WIDTH - 8,
    height: 60,
    borderRadius: 30,
    top: 4,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});