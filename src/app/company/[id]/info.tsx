import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanyStackHeader } from '@/components/company/stack-header';
import { FixedCta } from '@/components/company/fixed-cta';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchInfoPersonsAll,
  fetchInfoServices,
  fetchInfoSettings,
} from '@/services/info-service';
import type { InfoPerson, InfoService } from '@/types/chat';
import { telegramHref } from '@/utils/telegram';
import { currencyLabel, formatPrice } from '@/utils/price';

export default function InfoScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId } = useCompany();
  const [tab, setTab] = useState<'people' | 'services'>('people');
  const [people, setPeople] = useState<InfoPerson[] | null>(null);
  const [services, setServices] = useState<InfoService[] | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchInfoPersonsAll(companyId).then(setPeople).catch(() => setPeople([]));
    fetchInfoServices(companyId).then(setServices).catch(() => setServices([]));
    fetchInfoSettings(companyId).then((data) => setPhone(data?.service_phone ?? null)).catch(() => {});
  }, [companyId]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CompanyStackHeader title={t('infoTabA')} onBack={() => router.back()} />
      <View style={styles.tabs}>
        {(['people', 'services'] as const).map((id) => {
          const selected = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              style={[styles.tab, { backgroundColor: selected ? theme.buttonColor : theme.fill }]}>
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={{ color: selected ? theme.buttonTextColor : theme.text, textAlign: 'center' }}>
                {id === 'people' ? t('infoTabA') : t('infoTabB')}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.three, paddingBottom: insets.bottom + 100 }}>
        {tab === 'people' ? (
          people == null ? (
            <View style={styles.empty}>
              <ActivityIndicator color={theme.buttonColor} />
            </View>
          ) : people.length === 0 ? (
            <ThemedText themeColor="hint" style={styles.emptyText}>
              {t('infoEmpty')}
            </ThemedText>
          ) : (
            people.map((person) => (
              <Pressable
                key={person._id}
                onPress={() => router.push(`/company/${companyId}/person/${person._id}`)}
                style={[styles.card, { backgroundColor: theme.cardBackground }]}>
                <ThemedText type="bodyStrong">{person.name}</ThemedText>
                {!!person.specialty && (
                  <ThemedText themeColor="hint">{person.specialty}</ThemedText>
                )}
                {!!person.experience && (
                  <ThemedText type="caption">{person.experience}</ThemedText>
                )}
                {!!person.price && (
                  <ThemedText style={{ color: theme.buttonColor }}>
                    {formatPrice(person.price)} {currencyLabel(person.currency)}
                  </ThemedText>
                )}
              </Pressable>
            ))
          )
        ) : services == null ? (
          <View style={styles.empty}>
            <ActivityIndicator color={theme.buttonColor} />
          </View>
        ) : services.length === 0 ? (
          <ThemedText themeColor="hint" style={styles.emptyText}>
            {t('infoEmpty')}
          </ThemedText>
        ) : (
          services.map((service) => (
            <Pressable
              key={service._id}
              onPress={() => router.push(`/company/${companyId}/service/${service._id}`)}
              style={[styles.card, { backgroundColor: theme.cardBackground }]}>
              <ThemedText type="bodyStrong">{service.name}</ThemedText>
              {!!service.description && (
                <ThemedText numberOfLines={2} themeColor="hint">
                  {service.description}
                </ThemedText>
              )}
              <ThemedText>
                {formatPrice(service.promotion?.discounted_price ?? service.price)}{' '}
                {currencyLabel(service.currency)}
              </ThemedText>
            </Pressable>
          ))
        )}
      </ScrollView>

      {tab === 'services' && phone && (
        <FixedCta
          label={t('infoBookAction')}
          onPress={() => Linking.openURL(telegramHref(phone)).catch(() => {})}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: Spacing.two,
    borderRadius: CompanyRadius.button,
  },
  card: { padding: Spacing.three, borderRadius: CompanyRadius.card, marginBottom: Spacing.two, gap: 4 },
  empty: { paddingVertical: Spacing.five, alignItems: 'center' },
  emptyText: { textAlign: 'center', paddingVertical: Spacing.five },
});
