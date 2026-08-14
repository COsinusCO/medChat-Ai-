import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  subtitleColor?: 'textSecondary' | 'success';
  left?: ReactNode;
  right?: ReactNode;
  /** Rendered between `left` and the title — used by the chat header avatar. */
  leading?: ReactNode;
};

export function ScreenHeader({
  title,
  subtitle,
  subtitleColor = 'textSecondary',
  left,
  right,
  leading,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.two,
          paddingLeft: Spacing.two + insets.left,
          paddingRight: Spacing.two + insets.right,
          backgroundColor: theme.background,
          borderBottomColor: theme.separator,
        },
      ]}>
      {left}
      {leading}

      <View style={styles.titles}>
        <ThemedText type="bodyStrong" numberOfLines={1}>
          {title}
        </ThemedText>
        {!!subtitle && (
          <ThemedText type="caption" themeColor={subtitleColor} numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
      </View>

      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titles: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: Spacing.one,
  },
});
