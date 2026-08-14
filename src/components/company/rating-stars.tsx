import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** `svg { fill: #d9d9d9 }` — an unlit star. */
const EMPTY_STAR = '#D9D9D9';

/** `RaitingStars` — five stars, gold up to `count`. Tappable when `onRate` is given. */
export function RatingStars({
  count,
  size = 24,
  gap = 5,
  onRate,
}: {
  count: number;
  size?: number;
  gap?: number;
  onRate?: (value: number) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: 5 }, (_, index) => (
        <Pressable
          key={index}
          accessibilityRole={onRate ? 'button' : undefined}
          disabled={!onRate}
          hitSlop={4}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onRate?.(index + 1);
          }}>
          <SymbolView
            name={{ ios: 'star.fill', android: 'star', web: 'star' }}
            size={size}
            tintColor={index < count ? theme.gold : EMPTY_STAR}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
