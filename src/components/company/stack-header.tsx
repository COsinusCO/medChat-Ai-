import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

/**
 * Inner company screens — back chevron, title, optional right action.
 *
 * Every screen that uses this header lives inside a sheet (`company/[id]` is already a modal).
 * The status-bar inset must not be applied here: it would double-count the notch and leave a
 * large empty band under the rounded top edge.
 */
export function CompanyStackHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.pageBackground,
          borderBottomColor: theme.separatorStrong,
        },
      ]}>
      <View style={styles.row}>
        <View style={styles.side}>
          <IconButton
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            accessibilityLabel={t('cancel')}
            onPress={onBack}
          />
        </View>
        <View style={styles.titles}>
          <ThemedText type="bodyStrong" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          {!!subtitle && (
            <ThemedText type="caption" themeColor="hint" numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          )}
        </View>
        <View style={[styles.side, styles.sideRight]}>{right ?? <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  side: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  titles: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
});
