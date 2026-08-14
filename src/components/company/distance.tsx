import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Radius, Spacing } from '@/constants/theme';
import { useUserLocation } from '@/features/location/location-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { CompanyDetail } from '@/types/chat';

/** `transition: transform 0.4s ease-in-out` on `.distance-flip-inner`. */
const FLIP_MS = 400;

/**
 * `Distance` — a card that flips on tap: the distance on the front, the walking and driving
 * times on the back. Without a real fix it becomes the Mini App's "turn on location" prompt.
 */
export function Distance({ company }: { company: CompanyDetail }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { usingFallback, resolving, request } = useUserLocation();
  const [flipped, setFlipped] = useState(false);

  // Declarative: both faces animate towards whatever `flipped` currently says.
  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: withTiming(flipped ? '180deg' : '0deg', { duration: FLIP_MS }) },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: withTiming(flipped ? '360deg' : '180deg', { duration: FLIP_MS }) },
    ],
  }));

  // While the permission prompt and the first fix are still settling there is nothing to warn
  // about — the card just shows its loading state, as the web does before the distance lands.
  if (usingFallback && !resolving) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => request()}
        style={({ pressed }) => [styles.warning, pressed && styles.pressed]}>
        <View style={styles.warningIcon}>
          <SymbolView
            name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
            size={18}
            tintColor="#FEF3C7"
          />
        </View>
        <ThemedText style={styles.warningText}>{t('turnOnlocation')}</ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => setFlipped((value) => !value)}
      style={styles.container}>
      <Animated.View style={[styles.face, frontStyle]}>
        <ThemedText style={styles.label}>{t('distance')}</ThemedText>
        <ThemedText style={[styles.value, { color: theme.hint }]}>
          {company.distance?.distance || t('loading')}
        </ThemedText>
      </Animated.View>

      <Animated.View style={[styles.face, styles.back, backStyle]}>
        <View style={styles.durations}>
          <View style={styles.duration}>
            <SymbolView
              name={{ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' }}
              size={15}
              tintColor={theme.text}
            />
            <ThemedText style={styles.durationText}>
              {company.distance?.walking_duration}
            </ThemedText>
          </View>

          <ThemedText style={[styles.durationText, { color: theme.hint }]}>•</ThemedText>

          <View style={styles.duration}>
            <SymbolView
              name={{ ios: 'car.fill', android: 'directions_car', web: 'directions_car' }}
              size={15}
              tintColor={theme.text}
            />
            <ThemedText style={styles.durationText}>{company.distance?.duration}</ThemedText>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    justifyContent: 'center',
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    backfaceVisibility: 'hidden',
  },
  back: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: Spacing.one,
  },
  value: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
  durations: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    fontSize: 14,
    lineHeight: 18,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 50,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: CompanyRadius.inner,
    backgroundColor: '#FFE815E6',
  },
  warningIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  warningText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: -0.13,
    color: '#92400E',
  },
  pressed: {
    opacity: 0.75,
  },
});
