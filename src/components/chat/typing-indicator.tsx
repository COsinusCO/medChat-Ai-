import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DOTS = [0, 1, 2];
const DOT_DURATION = 400;

export function TypingIndicator() {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View
        style={[styles.bubble, { backgroundColor: theme.bubbleIn, borderColor: theme.border }]}
        accessibilityRole="progressbar"
        accessibilityLabel="Собеседник печатает">
        {DOTS.map((index) => (
          <Dot key={index} index={index} color={theme.textMuted} />
        ))}
      </View>
    </View>
  );
}

function Dot({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * DOT_DURATION * 0.5,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DOT_DURATION }),
          withTiming(0, { duration: DOT_DURATION })
        ),
        -1,
        false
      )
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ translateY: -progress.value * 3 }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.half,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    borderRadius: Radius.bubble,
    borderBottomLeftRadius: Radius.small / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
  },
});
