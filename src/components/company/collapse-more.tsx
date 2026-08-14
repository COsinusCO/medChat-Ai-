import { useState } from 'react';
import { Pressable, StyleSheet, View, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

/**
 * `CollapseMore` — text cut to `maxLength` characters with a trailing link that expands it.
 * Collapsed the link is `--link-color`, expanded it turns into a muted "Collapse".
 */
export function CollapseMore({
  text,
  maxLength = 90,
  textStyle,
}: {
  text?: string | null;
  maxLength?: number;
  textStyle?: TextStyle;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const shouldCollapse = text.length > maxLength;
  const shown = expanded || !shouldCollapse ? text : `${text.substring(0, maxLength)}...`;

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.text, textStyle]}>{shown}</ThemedText>

      {shouldCollapse && (
        <Pressable
          accessibilityRole="button"
          hitSlop={6}
          onPress={() => setExpanded((value) => !value)}>
          <ThemedText style={[styles.link, { color: expanded ? theme.hint : theme.link }]}>
            {expanded ? t('collapse') : t('more')}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: Spacing.one,
  },
  text: {
    flexShrink: 1,
  },
  link: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.15,
  },
});
