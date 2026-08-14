import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FixedCta } from '@/components/company/fixed-cta';
import { ProductTile } from '@/components/company/product-tile';
import { CompanyStackHeader } from '@/components/company/stack-header';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useDeliveryAddress } from '@/features/address/address-context';
import { useBasket } from '@/features/basket/basket-context';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchDeliveryPrice } from '@/services/order-service';
import { fetchProducts } from '@/services/menu-service';
import type { MenuProduct } from '@/types/chat';
import { currencyLabel, formatPrice } from '@/utils/price';

const SERVICE_FEE = 4500;

export default function BasketScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId, company } = useCompany();
  const basket = useBasket();
  const { accepted } = useDeliveryAddress();
  const [more, setMore] = useState<MenuProduct[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);

  useEffect(() => {
    fetchProducts(companyId).then(setMore).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (!company || !accepted) return;
    const fixed =
      company.is_self_delivery && company.self_delivery_pricing_mode !== 'per_km'
        ? Number(company.default_delivery_price_inside_tashkent) || 0
        : null;
    if (fixed != null) {
      setDeliveryFee(fixed);
      return;
    }
    fetchDeliveryPrice({
      company_id: companyId,
      company_location: {
        lat: String(company.latitude ?? ''),
        long: String(company.longitude ?? ''),
      },
      delivery_address: { lat: String(accepted.lat), long: String(accepted.lon) },
      items_count: basket.items.length || 1,
    })
      .then((data) => setDeliveryFee(data?.delivery_price ?? 0))
      .catch(() => {});
  }, [company, accepted, basket.items.length, companyId]);

  const currency = basket.items[0]?.currency;

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CompanyStackHeader
        title={t('basket')}
        subtitle={company?.name}
        onBack={() => router.back()}
        right={
          basket.size > 0 ? (
            <Pressable
              onPress={() =>
                Alert.alert(t('clearBasketConfirm'), undefined, [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('clearBasket'), style: 'destructive', onPress: basket.clear },
                ])
              }
              hitSlop={8}
              style={styles.clear}>
              <ThemedText type="caption" themeColor="destructive">
                {t('clearBasket')}
              </ThemedText>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={{ padding: Spacing.three, paddingBottom: insets.bottom + 140 }}>
        {basket.items.map((item) => (
          <ProductTile
            key={item._id}
            product={item}
            horizontal
            onPress={() => router.push(`/company/${companyId}/product/${item._id}`)}
          />
        ))}

        {basket.size === 0 && (
          <View style={styles.empty}>
            <ThemedText type="heading" style={styles.emptyText}>
              {t('yourBasketEmpty')}
            </ThemedText>
            <ThemedText themeColor="hint" style={styles.emptyText}>
              {t('backToMenu')}
            </ThemedText>
          </View>
        )}

        <Pressable
          onPress={() => router.push(`/company/${companyId}/menu`)}
          style={[styles.openMenu, { backgroundColor: theme.fill }]}>
          <ThemedText type="smallBold" style={styles.menuLabel}>
            {t('openMenu')}
          </ThemedText>
        </Pressable>

        {basket.size > 0 && (
          <View style={[styles.totals, { backgroundColor: theme.cardBackground }]}>
            <Row label={t('earnCoins')} value={`+${Math.round(basket.subtotal / 1000)}`} />
            <Row
              label={company?.is_self_delivery ? t('deliveryFee') : t('yandexDelivery')}
              value={`${formatPrice(deliveryFee)} ${currencyLabel(currency)}`}
            />
          </View>
        )}

        {more.length > 0 && (
          <>
            <ThemedText type="heading" style={styles.moreTitle}>
              {t('somethingElse')}
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.more}>
              {[...more]
                .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
                .map((product) => (
                  <ProductTile
                    key={product._id}
                    product={product}
                    onPress={() => router.push(`/company/${companyId}/product/${product._id}`)}
                  />
                ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {basket.size > 0 && (
        <FixedCta
          label={`${t('placeOrder')} · ${formatPrice(basket.subtotal + SERVICE_FEE + deliveryFee)} ${currencyLabel(currency)}`}
          onPress={() => router.push(`/company/${companyId}/payment`)}
        />
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText themeColor="hint">{label}</ThemedText>
      <ThemedText type="bodyStrong">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  clear: {
    minWidth: 48,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  emptyText: { textAlign: 'center' },
  openMenu: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: CompanyRadius.button,
    marginVertical: Spacing.three,
  },
  menuLabel: { textAlign: 'center' },
  totals: { borderRadius: CompanyRadius.card, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  moreTitle: { marginTop: Spacing.four, marginBottom: Spacing.two },
  more: { gap: 12 },
});
