import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import type { InfoPerson, MenuProduct } from '@/types/chat';

/**
 * `MoreInteres` — the "you may like" strip of menu items, and `MoreInteresInfo` — the strip of
 * specialists. Both end with the Mini App's "Next" tile.
 */
export function MenuStrip({
  products,
  title,
  onProductPress,
  onNext,
}: {
  products: MenuProduct[];
  title: string;
  onProductPress?: (product: MenuProduct) => void;
  onNext?: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={styles.section}>
      <ThemedText style={styles.heading}>{title}</ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menuRow}>
        {products.map((product) => (
          <Pressable key={product._id} style={styles.product} onPress={() => onProductPress?.(product)}>
            <View style={[styles.productImage, { backgroundColor: theme.fill }]}>
              {product.imageThumbnail || product.image ? (
                <Image
                  source={{ uri: product.image || product.imageThumbnail }}
                  style={styles.fill}
                  contentFit="cover"
                  transition={150}
                />
              ) : null}

              {!!product.discount?.percent && (
                <View style={[styles.discount, { backgroundColor: theme.warning }]}>
                  <ThemedText style={styles.discountText}>-{product.discount.percent}%</ThemedText>
                </View>
              )}
            </View>

            <View style={styles.productText}>
              <ThemedText numberOfLines={1} style={styles.productName}>
                {product.name}
              </ThemedText>

              {!!product.weight && !!product.unit_measure && (
                <ThemedText style={[styles.productMeta, { color: theme.hint }]}>
                  {product.weight} {product.unit_measure}
                </ThemedText>
              )}

              {!!product.price && (
                <ThemedText style={styles.productPrice}>
                  {formatPrice(product.price)} {currencyLabel(product.currency)}
                </ThemedText>
              )}
            </View>
          </Pressable>
        ))}

        <Pressable
          onPress={onNext}
          style={[styles.nextTile, { backgroundColor: 'rgba(116,116,128,0.06)' }]}>
          <ThemedText style={[styles.nextText, { color: theme.hint }]}>{t('next')}</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function SpecialistStrip({
  persons,
  title,
  onPersonPress,
  onNext,
}: {
  persons: InfoPerson[];
  title: string;
  onPersonPress?: (person: InfoPerson) => void;
  onNext?: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={styles.section}>
      <ThemedText style={styles.heading}>{title}</ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.personRow}>
        {persons.map((person) => (
          <Pressable key={person._id} style={styles.person} onPress={() => onPersonPress?.(person)}>
            <View style={[styles.personAvatar, { backgroundColor: theme.primaryMuted }]}>
              {person.image ? (
                <Image
                  source={{ uri: person.image }}
                  style={styles.fill}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <SymbolView
                  name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                  size={30}
                  tintColor={theme.buttonColor}
                />
              )}
            </View>

            <ThemedText numberOfLines={2} style={styles.personName}>
              {person.name}
            </ThemedText>
            {!!person.specialty && (
              <ThemedText numberOfLines={1} style={[styles.personSpecialty, { color: theme.hint }]}>
                {person.specialty}
              </ThemedText>
            )}
            {!!person.price && (
              <ThemedText style={[styles.personPrice, { color: theme.buttonColor }]}>
                {formatPrice(person.price)} {person.currency}
              </ThemedText>
            )}
          </Pressable>
        ))}

        <Pressable
          onPress={onNext}
          style={[styles.personNext, { backgroundColor: 'rgba(116,116,128,0.06)' }]}>
          <ThemedText style={[styles.nextText, { color: theme.hint }]}>{t('next')}</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/** `formatPrice` — thousands separated the Russian way, as in the Mini App. */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price);
}

/** `newCurrency` — UZS is spelled `so\`m`, everything else lowercased. */
function currencyLabel(currency?: string): string {
  if (!currency) return '';
  return currency === 'UZS' ? 'so`m' : currency.toLowerCase();
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.three,
    borderRadius: CompanyRadius.card,
  },
  heading: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  menuRow: {
    gap: 12,
  },
  product: {
    width: 150,
  },
  productImage: {
    height: 150,
    borderRadius: CompanyRadius.inner,
    overflow: 'hidden',
  },
  discount: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Spacing.two,
  },
  discountText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productText: {
    padding: 5,
    gap: 1,
  },
  productName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.13,
  },
  productMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: -0.26,
  },
  nextTile: {
    width: 150,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: CompanyRadius.inner,
  },
  nextText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  personRow: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  person: {
    width: 80,
    alignItems: 'center',
    gap: Spacing.one,
  },
  personAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  personName: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  personSpecialty: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  personPrice: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  personNext: {
    width: 80,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: CompanyRadius.tile,
  },
});
