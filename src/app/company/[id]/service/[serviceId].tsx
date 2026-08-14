import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollapseMore } from '@/components/company/collapse-more';
import { CompanyStackHeader } from '@/components/company/stack-header';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchInfoService } from '@/services/info-service';
import type { InfoService } from '@/types/chat';
import { currencyLabel, formatPrice } from '@/utils/price';

export default function ServiceScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId } = useCompany();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const [service, setService] = useState<InfoService | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    fetchInfoService(serviceId, companyId)
      .then(setService)
      .catch(() => setFailed(true));
  }, [serviceId, companyId]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground, paddingBottom: insets.bottom }]}>
      <CompanyStackHeader title={t('infoTabB')} onBack={() => router.back()} />
      {!service ? (
        <View style={styles.center}>
          {failed ? (
            <ThemedText style={{ textAlign: 'center' }}>{t('infoNotFound')}</ThemedText>
          ) : (
            <ActivityIndicator color={theme.buttonColor} />
          )}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <ThemedText type="heading">{service.name}</ThemedText>
          {!!service.description && <CollapseMore text={service.description} maxLength={90} />}
          {!!service.duration && (
            <ThemedText themeColor="hint">
              {service.duration} {t('minutesShort')}
            </ThemedText>
          )}
          <ThemedText type="heading">
            {formatPrice(service.promotion?.discounted_price ?? service.price)} {currencyLabel(service.currency)}
          </ThemedText>
          {!!service.promotion?.label && <ThemedText themeColor="hint">{service.promotion.label}</ThemedText>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: {
    margin: Spacing.three,
    padding: Spacing.three,
    borderRadius: CompanyRadius.card,
    gap: Spacing.two,
  },
});
