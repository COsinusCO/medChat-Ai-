import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollapseMore } from '@/components/company/collapse-more';
import { ProductTile } from '@/components/company/product-tile';
import { QtyStepper } from '@/components/company/qty-stepper';
import { CompanyStackHeader } from '@/components/company/stack-header';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useBasket } from '@/features/basket/basket-context';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchProduct } from '@/services/menu-service';
import type { MenuProduct } from '@/types/chat';
import { currencyLabel, formatPrice, productUnitPrice } from '@/utils/price';

export default function ProductScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId } = useCompany();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const basket = useBasket();
  const [product, setProduct] = useState<MenuProduct | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    fetchProduct(productId, companyId, controller.signal)
      .then((loaded) => !controller.signal.aborted && setProduct(loaded))
      .catch(() => !controller.signal.aborted && setFailed(true));
    return () => controller.abort();
  }, [productId, companyId]);

  if (!product) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.pageBackground }]}>
        {failed ? (
          <ThemedText themeColor="hint">{t('productNotFound')}</ThemedText>
        ) : (
          <ActivityIndicator color={theme.buttonColor} />
        )}
      </View>
    );
  }

  const count = basket.countOf(product._id);
  const unavailable = product.active === false;

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CompanyStackHeader title={product.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120, padding: Spacing.three }}>
        <View style={[styles.hero, { backgroundColor: theme.fill }]}>
          {(product.image || product.imageThumbnail) && (
            <Image
              source={{ uri: product.image || product.imageThumbnail }}
              style={styles.heroImage}
              contentFit="cover"
            />
          )}
          {!!product.discount?.percent && (
            <View style={[styles.badge, { backgroundColor: theme.warning }]}>
              <ThemedText style={styles.badgeText}>-{product.discount.percent}%</ThemedText>
            </View>
          )}
        </View>
        {!!product.description && <CollapseMore text={product.description} maxLength={90} />}
        <ThemedText type="heading" style={styles.price}>
          {formatPrice(productUnitPrice(product))} {currencyLabel(product.currency)}
        </ThemedText>
        {unavailable && (
          <ThemedText themeColor="destructive">{t('outStock')}</ThemedText>
        )}

        {(product.similar_products?.length ?? 0) > 0 && (
          <>
            <ThemedText type="heading" style={styles.similar}>
              {t('similarProducts')}
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {product.similar_products!.map((item) => (
                <ProductTile
                  key={item._id}
                  product={item}
                  onPress={() => router.push(`/company/${companyId}/product/${item._id}`)}
                />
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.bar,
          {
            paddingBottom: insets.bottom + Spacing.two,
            backgroundColor: theme.cardBackground,
            borderTopColor: theme.separatorStrong,
          },
        ]}>
        <QtyStepper
          count={count}
          disabled={unavailable}
          onInc={() => basket.add(product)}
          onDec={() => basket.removeOne(product)}
        />
        <Pressable
          disabled={unavailable}
          onPress={() => {
            if (count === 0) basket.add(product);
            else router.push(`/company/${companyId}/menu`);
          }}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: theme.buttonColor },
            (pressed || unavailable) && styles.pressed,
          ]}>
          <ThemedText style={{ color: theme.buttonTextColor, fontWeight: '600', textAlign: 'center' }}>
            {unavailable ? t('outStock') : count ? t('done') : t('addToBasket')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  price: { marginTop: Spacing.three },
  similar: { marginTop: Spacing.four, marginBottom: Spacing.two },
  row: { gap: 12 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopLeftRadius: CompanyRadius.inner,
    borderTopRightRadius: CompanyRadius.inner,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: CompanyRadius.button,
  },
  pressed: { opacity: 0.7 },
  hero: {
    height: 260,
    borderRadius: CompanyRadius.card,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  heroImage: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Spacing.two,
  },
  badgeText: { color: '#FFFFFF', fontWeight: '700' },
});
