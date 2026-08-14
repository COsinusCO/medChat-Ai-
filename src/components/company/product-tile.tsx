import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { QtyStepper } from '@/components/company/qty-stepper';
import { ThemedText } from '@/components/themed-text';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useBasket } from '@/features/basket/basket-context';
import { useTheme } from '@/hooks/use-theme';
import type { MenuProduct } from '@/types/chat';
import { currencyLabel, formatPrice, productUnitPrice } from '@/utils/price';

export function ProductTile({
  product,
  onPress,
  horizontal,
}: {
  product: MenuProduct;
  onPress?: () => void;
  horizontal?: boolean;
}) {
  const theme = useTheme();
  const basket = useBasket();
  const count = basket.countOf(product._id);
  const unavailable = product.active === false;
  const image = product.imageThumbnail || product.image;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        horizontal ? styles.horizontal : styles.card,
        horizontal && { borderBottomColor: theme.separatorStrong },
        pressed && styles.pressed,
      ]}>
      <View style={[horizontal ? styles.hImage : styles.image, { backgroundColor: theme.fill }]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.fill} contentFit="cover" transition={150} />
        ) : null}
        {!!product.discount?.percent && (
          <View style={[styles.discount, { backgroundColor: theme.warning }]}>
            <ThemedText style={styles.discountText}>-{product.discount.percent}%</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <ThemedText numberOfLines={2} style={styles.name}>
          {product.name}
        </ThemedText>
        {!!product.weight && (
          <ThemedText style={[styles.meta, { color: theme.hint }]}>
            {product.weight} {product.unit_measure ?? ''}
          </ThemedText>
        )}
        <ThemedText style={styles.price}>
          {formatPrice(productUnitPrice(product))} {currencyLabel(product.currency)}
        </ThemedText>
        {unavailable && (
          <ThemedText style={{ color: theme.destructive }} type="caption">
            —
          </ThemedText>
        )}
        {!unavailable && (
          <QtyStepper
            count={count}
            onInc={() => basket.add(product)}
            onDec={() => basket.removeOne(product)}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
  },
  horizontal: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  image: {
    height: 150,
    borderRadius: CompanyRadius.inner,
    overflow: 'hidden',
  },
  hImage: {
    width: 88,
    height: 88,
    borderRadius: CompanyRadius.inner,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
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
  body: {
    paddingTop: 6,
    gap: 2,
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  price: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
