import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const VISIBLE_MS = 2_000;
const FADE_MS = 180;

/** `SmallInfoToast` — a short confirmation pill that fades itself out. */
export function Toast({ message, onHide }: { message: string | null; onHide: () => void }) {
  const theme = useTheme();

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(onHide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onHide]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(FADE_MS)}
      exiting={FadeOut.duration(FADE_MS)}
      style={[styles.toast, { backgroundColor: theme.cardBackground }]}>
      <ThemedText type="smallBold" numberOfLines={2} style={styles.message}>
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.six,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: CompanyRadius.inner,
    zIndex: 20,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
  message: {
    textAlign: 'center',
  },
});
