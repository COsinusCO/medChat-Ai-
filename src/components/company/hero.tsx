import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** `header { height: 280px }` */
const HERO_HEIGHT = 280;

/** `CustomSwiper autoplayDelay={14000}` — the progress bar tracks the same interval. */
const AUTOPLAY_MS = 14_000;

/** `$bgColor` / `$secondBgColor` in header.scss — the filled and unfilled progress bars. */
const BAR_FILL = 'rgba(255,255,255,0.9)';
const BAR_TRACK = 'rgba(0,0,0,0.3)';

/**
 * The company hero: a full-bleed photo pager with story-style progress bars and a photo counter,
 * matching the Mini App's `Header` + `CustomSwiper`. Tapping a slide opens it fullscreen.
 */
export function CompanyHero({
  photos,
  /** `header { position: sticky; top: 0 }` — how far the page has scrolled, so the hero stays
   * pinned while the opaque card below slides over it. */
  scrollOffset,
}: {
  photos: string[];
  scrollOffset?: { value: number };
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [fullscreenAt, setFullscreenAt] = useState<number | null>(null);
  const [scroller, setScroller] = useState<ScrollView | null>(null);

  const progress = useSharedValue(0);

  const stickyStyle = useAnimatedStyle(() => ({
    // Never above its resting place, so an overscroll bounce still drags it down.
    transform: [{ translateY: Math.max(scrollOffset?.value ?? 0, 0) }],
  }));

  // Autoplay, and with it the bar that shows how long the current slide still has.
  useEffect(() => {
    if (photos.length < 2 || fullscreenAt !== null) return;

    progress.value = 0;
    progress.value = withTiming(1, { duration: AUTOPLAY_MS, easing: Easing.linear });

    const timer = setTimeout(() => {
      const next = (index + 1) % photos.length;
      scroller?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, AUTOPLAY_MS);

    return () => clearTimeout(timer);
  }, [index, photos.length, width, fullscreenAt, progress, scroller]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  if (photos.length === 0) {
    return (
      <Animated.View
        style={[styles.hero, { width, backgroundColor: theme.cardBackground }, stickyStyle]}>
        <View style={[styles.empty, { backgroundColor: theme.primaryMuted }]}>
          <SymbolView
            name={{ ios: 'cross.case.fill', android: 'health_and_safety', web: 'health_and_safety' }}
            size={48}
            tintColor={theme.buttonColor}
          />
        </View>
      </Animated.View>
    );
  }

  return (
    <>
      <Animated.View style={[styles.hero, { width }, stickyStyle]}>
        <ScrollView
          ref={setScroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}>
          {photos.map((url, position) => (
            <Pressable key={`${url}-${position}`} onPress={() => setFullscreenAt(index)}>
              <Image
                source={{ uri: url }}
                style={[styles.slide, { width }]}
                contentFit="cover"
                transition={200}
              />
            </Pressable>
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <>
            <ProgressBars count={photos.length} index={index} progress={progress} />

            <View style={styles.counter} pointerEvents="none">
              <SymbolView
                name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                size={18}
                tintColor="#FFFFFF"
              />
              <ThemedText style={styles.counterText}>{photos.length}</ThemedText>
            </View>
          </>
        )}
      </Animated.View>

      {fullscreenAt !== null && (
        <FullscreenPhotos
          key={fullscreenAt}
          photos={photos}
          startAt={fullscreenAt}
          onClose={() => setFullscreenAt(null)}
        />
      )}
    </>
  );
}

/** `.custom-pagination` — one flexible bar per slide, filling as the slide plays out. */
function ProgressBars({
  count,
  index,
  progress,
}: {
  count: number;
  index: number;
  progress: { value: number };
}) {
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <View style={styles.pagination} pointerEvents="none">
      {Array.from({ length: count }, (_, position) => (
        <View key={position} style={styles.bullet}>
          <View style={[styles.bar, { backgroundColor: position < index ? BAR_FILL : BAR_TRACK }]} />
          {position === index && (
            <Animated.View
              style={[styles.bar, styles.barFill, { backgroundColor: BAR_FILL }, fillStyle]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

/** `.fullscreen-overlay` — the same pager on the app background, tap anywhere to close. */
function FullscreenPhotos({
  photos,
  startAt,
  onClose,
}: {
  photos: string[];
  startAt: number;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(startAt);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.fullscreen, { backgroundColor: theme.pageBackground }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startAt * width, y: 0 }}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }>
          {photos.map((url, position) => (
            <Pressable key={`${url}-${position}`} onPress={onClose}>
              <Image
                source={{ uri: url }}
                style={{ width, height }}
                contentFit="contain"
                transition={150}
              />
            </Pressable>
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <View style={[styles.fullscreenPagination, { bottom: insets.bottom + 10 }]}>
            {photos.map((url, position) => (
              <View key={`${url}-${position}`} style={styles.bullet}>
                <View
                  style={[styles.bar, { backgroundColor: position <= index ? BAR_FILL : BAR_TRACK }]}
                />
              </View>
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.fullscreenClose, { top: insets.top + Spacing.two }]}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={18}
            tintColor={theme.text}
          />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: HERO_HEIGHT,
    // `header { margin-bottom: 2px }` — the hairline gap between the hero and the info card.
    marginBottom: 2,
    borderRadius: CompanyRadius.card,
    overflow: 'hidden',
    // `header { z-index: 0 }` — everything below it is painted on top.
    zIndex: 0,
  },
  slide: {
    height: HERO_HEIGHT,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagination: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  bullet: {
    flex: 1,
    height: 3,
    marginRight: 20,
    justifyContent: 'flex-end',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderRadius: 20,
  },
  barFill: {
    // Grows from the left edge, like the `countingBar` keyframes.
    transformOrigin: 'left',
  },
  counter: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  counterText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    letterSpacing: -0.32,
    color: '#FFFFFF',
  },
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenPagination: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  fullscreenClose: {
    position: 'absolute',
    right: Spacing.three,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
