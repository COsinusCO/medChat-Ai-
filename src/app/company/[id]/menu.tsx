import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressSheet } from '@/components/company/address-sheet';
import { FixedCta } from '@/components/company/fixed-cta';
import { ProductTile } from '@/components/company/product-tile';
import { RatingStars } from '@/components/company/rating-stars';
import { CompanyStackHeader } from '@/components/company/stack-header';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, MaxContentWidth, Spacing } from '@/constants/theme';
import { useDeliveryAddress } from '@/features/address/address-context';
import { useBasket } from '@/features/basket/basket-context';
import { useCompany } from '@/features/company/company-context';
import { useUserLocation } from '@/features/location/location-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchStreetName } from '@/services/order-service';
import { fetchCategories, fetchProducts } from '@/services/menu-service';
import type { MenuCategory, MenuProduct } from '@/types/chat';
import { companyShareLink } from '@/utils/share-company';

export default function MenuScreen() {
  const theme = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId, company } = useCompany();
  const basket = useBasket();
  const { coords } = useUserLocation();
  const { accepted, setAccepted } = useDeliveryAddress();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, MenuProduct[]>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(companyId, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setCategories(list);
        setActive(list[0]?.name ?? null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [companyId]);

  useEffect(() => {
    const missing = categories.filter((category) => !productsByCategory[category._id]);
    if (missing.length === 0) return;
    const next = missing[0];
    const controller = new AbortController();
    fetchProducts(companyId, { categoryId: next._id }, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setProductsByCategory((current) => ({ ...current, [next._id]: items }));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProductsByCategory((current) => ({ ...current, [next._id]: [] }));
        }
      });
    return () => controller.abort();
  }, [categories, productsByCategory, companyId]);

  useEffect(() => {
    if (accepted) {
      setConfirmOpen(true);
      return;
    }
    fetchStreetName(coords.lat, coords.lon, language)
      .then((data) => {
        setAccepted({
          streetName: data?.streetName || data?.fullAddress || '',
          lat: coords.lat,
          lon: coords.lon,
        });
        setConfirmOpen(true);
      })
      .catch(() => setConfirmOpen(true));
  }, []);

  if (!company) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.pageBackground }]}>
        <ActivityIndicator color={theme.buttonColor} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CompanyStackHeader
        title={company.name}
        subtitle={company.street_address || company.address}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() =>
              Share.share({ message: `${company.name}\n${companyShareLink(companyId, 'menu')}` }).catch(
                () => {}
              )
            }
            hitSlop={8}
            style={styles.share}>
            <ThemedText type="caption" themeColor="link">
              {t('share')}
            </ThemedText>
          </Pressable>
        }
      />

      <View style={styles.ratingRow}>
        <RatingStars count={company.rating ?? 0} size={16} />
        <ThemedText type="caption" themeColor="hint">
          {t('ratingReviews', { count: company.review_count ?? 0 })}
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsBar}
        contentContainerStyle={styles.chips}>
        {categories.map((category) => {
          const selected = category.name === active;
          return (
            <Pressable
              key={category._id}
              onPress={() => {
                setActive(category.name);
                const y = offsets.current[category._id];
                if (y != null) scrollRef.current?.scrollTo({ y, animated: true });
              }}
              style={[
                styles.chip,
                { backgroundColor: selected ? theme.buttonColor : theme.fill },
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: selected ? theme.buttonTextColor : theme.text, textAlign: 'center' }}>
                {category.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: Spacing.three }}
        showsVerticalScrollIndicator={false}>
        {categories.map((category) => (
          <View
            key={category._id}
            onLayout={(event) => {
              offsets.current[category._id] = event.nativeEvent.layout.y;
            }}>
            <ThemedText type="heading" style={styles.catTitle}>
              {category.name}
            </ThemedText>
            <View style={styles.grid}>
              {(productsByCategory[category._id] ?? []).map((product) => (
                <ProductTile
                  key={product._id}
                  product={product}
                  onPress={() => router.push(`/company/${companyId}/product/${product._id}`)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {basket.size > 0 && (
        <FixedCta
          label={`${t('goToBasket')} · ${basket.size}`}
          onPress={() => router.push(`/company/${companyId}/basket`)}
        />
      )}

      {confirmOpen && (
        <View style={styles.confirmWrap}>
          <View style={[styles.confirm, { backgroundColor: theme.cardBackground }]}>
            <ThemedText type="heading" style={styles.confirmTitle}>
              {t('isThisTheCorrectAddress')}
            </ThemedText>
            <ThemedText themeColor="hint" style={styles.confirmTitle}>
              {accepted?.streetName || t('chooseAddress')}
            </ThemedText>
            <View style={styles.confirmBtns}>
              <Pressable
                onPress={() => {
                  setConfirmOpen(false);
                  setMapOpen(true);
                }}
                style={[styles.confirmBtn, { backgroundColor: theme.fill }]}>
                <ThemedText style={styles.confirmBtnText}>{t('no')}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setConfirmOpen(false)}
                style={[styles.confirmBtn, { backgroundColor: theme.buttonColor }]}>
                <ThemedText style={[styles.confirmBtnText, { color: theme.buttonTextColor }]}>{t('yes')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <AddressSheet
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
        onPicked={setAccepted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  share: {
    minWidth: 48,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  chipsBar: { flexGrow: 0 },
  chips: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, alignItems: 'center' },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CompanyRadius.button,
  },
  catTitle: { marginTop: Spacing.three, marginBottom: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  confirmWrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  confirm: { borderRadius: CompanyRadius.card, padding: Spacing.four, gap: Spacing.two },
  confirmTitle: { textAlign: 'center' },
  confirmBtns: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: CompanyRadius.button,
  },
  confirmBtnText: { fontWeight: '600', textAlign: 'center' },
});
