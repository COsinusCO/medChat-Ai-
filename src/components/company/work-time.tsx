import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { WorkingHours } from '@/types/chat';
import { resolveWorkingHours } from '@/utils/working-hours';

/**
 * `WorkTime` — "Open · until 18:00" / "Closing in 12 minutes" / "Closed · tomorrow 09:00",
 * with the status word in green while open.
 */
export function WorkTime({ hours }: { hours?: WorkingHours }) {
  const theme = useTheme();
  const { t } = useI18n();
  const status = resolveWorkingHours(hours, t);

  if (!hours || Object.keys(hours).length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.text}>{t('workTimeNotSpecified')}</ThemedText>
      </View>
    );
  }

  const until = status.hours.split('–')[1];

  return (
    <View style={styles.container}>
      {status.isOpen ? (
        status.closingIn ? (
          <>
            <ThemedText style={[styles.text, { color: theme.warning }]}>{t('closingIn')}</ThemedText>
            <ThemedText style={styles.text}>{status.closingIn}</ThemedText>
          </>
        ) : (
          <>
            <ThemedText style={[styles.text, { color: theme.statusOpen }]}>{t('open')}</ThemedText>
            <ThemedText style={styles.text}>
              {until ? t('openUntil', { time: until }) : t('open24Hours')}
            </ThemedText>
          </>
        )
      ) : (
        <>
          <ThemedText style={[styles.text, { color: theme.destructive }]}>{t('closed')}</ThemedText>
          <ThemedText style={styles.text}>{status.willOpenAt ?? t('closedToday')}</ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // `.mainInfo__timeDistance__workTime .mainInfo__openHours` — stacked and centred.
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 50,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: -0.48,
    textAlign: 'center',
  },
});
