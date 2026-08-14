import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BrandLogo } from './brand-logo';

const BRAND_COLOR = '#208AEF';
const FADE_DURATION = 350;

/**
 * Covers the app in the brand colour until it is ready, then cross-fades away. `hold` keeps it up
 * while the stored session is restored, so the app never flashes an empty screen or the login
 * screen before we know whether the user is signed in.
 */
export function SplashGate({ hold = false }: { hold?: boolean }) {
  const [hidden, setHidden] = useState(false);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    if (hold || hidden) return;

    let cancelled = false;

    SplashScreen.hideAsync().finally(() => {
      if (cancelled) return;

      opacity.value = withTiming(0, { duration: FADE_DURATION }, (finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setHidden, true);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [hidden, hold, opacity]);

  if (hidden) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, animatedStyle]}>
      <BrandLogo variant="icon" style={styles.brand} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  brand: {
    width: 128,
    height: 128,
  },
});
