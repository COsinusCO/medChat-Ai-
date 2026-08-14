import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTranslate } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { IndustryType } from '@/types/chat';

/** Chips are split into rows the same way the Mini App does it. */
const ROW_SIZE = 8;
/** The web marquee takes 50s to travel one full copy of the row. */
const ROW_DURATION = 50_000;

type WelcomeProps = {
  industryTypes: IndustryType[];
  onPickIndustry: (label: string) => void;
};

export const ChatWelcome = memo(function ChatWelcome({
  industryTypes,
  onPickIndustry,
}: WelcomeProps) {
  const theme = useTheme();
  const t = useTranslate();

  const rows: IndustryType[][] = [];
  for (let i = 0; i < industryTypes.length; i += ROW_SIZE) {
    rows.push(industryTypes.slice(i, i + ROW_SIZE));
  }

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.bubbleText}>{t('welcomeMessage')}</ThemedText>
        <ThemedText style={styles.emoji}>👇</ThemedText>
      </View>

      <View style={styles.rows}>
        {rows.map((row, rowIndex) => (
          <MarqueeRow key={rowIndex} items={row} onPick={onPickIndustry} />
        ))}
      </View>
    </View>
  );
});

/**
 * One endlessly scrolling row. The items are rendered twice and the track slides by exactly one
 * copy, so the seam is invisible — the same trick as the CSS `scrollHorizontal` keyframes.
 */
function MarqueeRow({
  items,
  onPick,
}: {
  items: IndustryType[];
  onPick: (label: string) => void;
}) {
  const [copyWidth, setCopyWidth] = useState(0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (copyWidth <= 0) return;

    // Speed follows the row's width so short and long rows drift at the same pace.
    const duration = (copyWidth / 600) * ROW_DURATION;
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-copyWidth, { duration, easing: Easing.linear }),
      -1,
      false
    );

    return () => cancelAnimation(offset);
  }, [copyWidth, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    // The track holds two copies plus one gap between them.
    const width = (event.nativeEvent.layout.width - Spacing.two) / 2;
    setCopyWidth((current) => (Math.abs(current - width) > 1 ? width : current));
  };

  return (
    <View style={styles.rowViewport} pointerEvents="box-none">
      <Animated.View style={[styles.rowTrack, animatedStyle]} onLayout={handleLayout}>
        {[...items, ...items].map((item, index) => (
          <Chip
            key={`${item._id}-${index}`}
            item={item}
            onPress={() => onPick(item.label)}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function Chip({ item, onPress }: { item: IndustryType; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      {!!item.icon && (
        <Image source={{ uri: item.icon }} style={styles.chipIcon} contentFit="contain" />
      )}
      <ThemedText type="small">{item.label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.six,
    gap: Spacing.four,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radius.bubble,
    borderBottomLeftRadius: Radius.small / 2,
  },
  bubbleText: {
    fontSize: 17,
    lineHeight: 24,
  },
  emoji: {
    fontSize: 18,
  },
  rows: {
    gap: Spacing.two + 4,
  },
  rowViewport: {
    overflow: 'hidden',
  },
  rowTrack: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.bubble,
  },
  chipIcon: {
    width: 20,
    height: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
