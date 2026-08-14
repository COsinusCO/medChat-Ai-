import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductTile } from '@/components/company/product-tile';
import { CompanyStackHeader } from '@/components/company/stack-header';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchOrder, fetchOrderTimeline } from '@/services/order-service';
import type { OrderDetail, TimelineEntry } from '@/types/order';
import { telegramHref } from '@/utils/telegram';
import { currencyLabel, formatPrice } from '@/utils/price';

const STEPS = [
  { key: 'pending', label: 'orderCreated' },
  { key: 'accepted', label: 'orderAccepted' },
  { key: 'preparing', label: 'orderPreparing' },
  { key: 'ready', label: 'orderReady' },
  { key: 'on_the_way', label: 'orderOnWay' },
  { key: 'delivered', label: 'orderDeliveredStatus' },
  { key: 'completed', label: 'orderCompleted' },
] as const;

const PICKUP_STEPS = STEPS.slice(0, 4).map((step, index) =>
  index === 3 ? { ...step, label: 'orderReadyToTake' as const } : step
);

export default function OrderStatusScreen() {
  const theme = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId } = useCompany();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [failed, setFailed] = useState(false);
  const [positions, setPositions] = useState(false);

  const load = () => {
    if (!orderId) return;
    fetchOrder(orderId)
      .then((loaded) => setOrder(loaded))
      .catch(() => setFailed(true));
    fetchOrderTimeline(orderId).then(setTimeline).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    if (['delivered', 'completed', 'cancelled', 'rejected'].includes(order.status)) return;
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [order?.status, orderId]);

  const steps = useMemo(() => {
    if (order?.delivery_type === 'self_delivery' && !order.courier_delivery) return PICKUP_STEPS;
    return STEPS;
  }, [order]);

  if (!order) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.pageBackground }]}>
        {failed ? (
          <ThemedText themeColor="hint" style={{ textAlign: 'center' }}>
            {t('orderNotFound')}
          </ThemedText>
        ) : (
          <ActivityIndicator color={theme.buttonColor} />
        )}
      </View>
    );
  }

  const current = steps.findIndex((step) => step.key === order.status);
  const number = (orderId || order._id).slice(-8);
  const courier = order.courier_delivery?.courier;
  const support = order.company?.support_number;
  const langKey = language.startsWith('uz') ? 'uz' : language.startsWith('en') ? 'en' : 'ru';

  const openSupport = () => {
    const contact = courier?.telegram_username || support;
    if (!contact) {
      return;
    }
    Linking.openURL(telegramHref(contact)).catch(() => {});
  };

  const call = () => {
    const phone = courier?.phone || support;
    if (phone) Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => {});
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CompanyStackHeader
        title={`${t('orderNumber')} ${number}`}
        onBack={() => router.replace(`/company/${companyId}`)}
      />
      <ScrollView contentContainerStyle={{ padding: Spacing.three, paddingBottom: insets.bottom + 40 }}>
        {steps.map((step, index) => {
          const done = index < current;
          const now = index === current;
          const last = index === steps.length - 1;
          return (
            <View key={step.key} style={styles.step}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: now || done ? theme.buttonColor : theme.fill },
                  ]}
                />
                {!last && (
                  <View
                    style={[
                      styles.railLine,
                      { backgroundColor: done ? theme.buttonColor : theme.fill },
                    ]}
                  />
                )}
              </View>
              <ThemedText style={[styles.stepLabel, { fontWeight: now ? '700' : '500' }]}>
                {order.status === 'cancelled' && index === 1 ? t('orderCancelled') : t(step.label)}
              </ThemedText>
            </View>
          );
        })}

        <Pressable
          onPress={() => setPositions(true)}
          style={[styles.row, { backgroundColor: theme.cardBackground }]}>
          <ThemedText type="bodyStrong">{t('viewPositions')}</ThemedText>
        </Pressable>

        <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="heading">
              {courier?.name ||
                order.yandex_delivery?.performer_info?.courier_name ||
                order.company?.name}
            </ThemedText>
            <ThemedText themeColor="hint">
              {courier
                ? t(
                    order.courier_delivery?.status === 'delivering'
                      ? 'courierDelivering'
                      : order.courier_delivery?.status === 'arrived'
                        ? 'courierArrived'
                        : order.courier_delivery?.status === 'delivered'
                          ? 'courierDeliveredStatus'
                          : 'courierAssigned'
                  )
                : order.yandex_delivery?.eta
                  ? `${t('approximately')} ${order.yandex_delivery.eta} ${t('minutes')}`
                  : order.company?.address}
            </ThemedText>
          </View>
          <Pressable
            onPress={openSupport}
            style={[styles.iconBtn, { backgroundColor: theme.fill }]}>
            <ThemedText>💬</ThemedText>
          </Pressable>
          <Pressable onPress={call} style={[styles.iconBtn, { backgroundColor: theme.fill }]}>
            <ThemedText>📞</ThemedText>
          </Pressable>
        </View>

        {timeline.length > 0 && (
          <View style={{ marginTop: Spacing.four }}>
            <ThemedText type="heading">{t('orderHistory')}</ThemedText>
            {timeline.map((entry) => {
              const tr = entry.i18n?.[langKey] ?? entry.i18n?.ru;
              return (
                <View key={entry.event_id} style={styles.history}>
                  <ThemedText type="bodyStrong">{tr?.title ?? entry.code}</ThemedText>
                  {!!tr?.subtitle && (
                    <ThemedText type="caption" themeColor="hint">
                      {tr.subtitle}
                    </ThemedText>
                  )}
                  <ThemedText type="caption" themeColor="hint">
                    {new Date(entry.occurred_at).toLocaleString()}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {positions && (
        <View style={styles.sheet}>
          <View style={[styles.sheetCard, { backgroundColor: theme.pageBackground }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.separatorStrong }]} />
            <View style={styles.sheetHeader}>
              <ThemedText type="heading" style={styles.sheetTitle}>
                {t('orderTitle')}
              </ThemedText>
              <Pressable onPress={() => setPositions(false)} hitSlop={8} style={styles.sheetClose}>
                <ThemedText themeColor="hint">{t('cancel')}</ThemedText>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: Spacing.three }}>
              <ThemedText type="heading">{order.company?.name}</ThemedText>
              {order.items.map((item) => (
                <ProductTile key={item.product._id} product={{ ...item.product, amount: item.quantity }} horizontal />
              ))}
              <ThemedText type="heading" style={{ marginTop: Spacing.three }}>
                {t('deliveryDetails')}
              </ThemedText>
              <ThemedText themeColor="hint">
                {order.order_type === 'delivery'
                  ? order.delivery_address?.address
                  : t('pickupAt')}{' '}
                · {formatPrice(order.final_amount)} {currencyLabel(order.currency)}
              </ThemedText>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, minHeight: 36 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  railLine: { width: 2, flex: 1, minHeight: 18, marginTop: 2, borderRadius: 1 },
  stepLabel: { flex: 1, paddingTop: 2, paddingBottom: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: CompanyRadius.card,
    marginTop: Spacing.three,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  history: { paddingVertical: Spacing.two, gap: 2 },
  sheet: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheetCard: {
    flex: 1,
    marginTop: 56,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    marginTop: Spacing.two,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 48,
  },
  sheetTitle: { flex: 1, textAlign: 'center' },
  sheetClose: { position: 'absolute', right: Spacing.three, padding: Spacing.two },
});
