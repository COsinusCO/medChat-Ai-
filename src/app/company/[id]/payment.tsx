import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressSheet } from '@/components/company/address-sheet';
import { FixedCta } from '@/components/company/fixed-cta';
import { CompanyStackHeader } from '@/components/company/stack-header';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useDeliveryAddress } from '@/features/address/address-context';
import { useBasket } from '@/features/basket/basket-context';
import { useCompany } from '@/features/company/company-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import { createOrder, fetchDeliveryPrice } from '@/services/order-service';
import { currencyLabel, formatPrice } from '@/utils/price';

const SERVICE_FEE = 4500;

export default function PaymentScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { companyId, company } = useCompany();
  const basket = useBasket();
  const { accepted, setAccepted, save } = useDeliveryAddress();

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [doorToDoor, setDoorToDoor] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '+998');
  const [house, setHouse] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [comment, setComment] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState('');
  const [promoError, setPromoError] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [eta, setEta] = useState(0);
  const [sending, setSending] = useState(false);
  const [saveAsk, setSaveAsk] = useState(false);

  useEffect(() => {
    if (orderType === 'pickup' && company) {
      setAccepted({
        streetName: company.full_address || company.address || company.name,
        lat: company.latitude ?? 0,
        lon: company.longitude ?? 0,
      });
    }
  }, [orderType, company, setAccepted]);

  useEffect(() => {
    if (!company || !accepted || orderType === 'pickup') {
      setDeliveryFee(0);
      return;
    }
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
      door_to_door: doorToDoor,
    })
      .then((data) => {
        setDeliveryFee(data?.delivery_price ?? 0);
        setEta(data?.eta ?? 0);
      })
      .catch(() => {});
  }, [company, accepted, orderType, doorToDoor, basket.items.length, companyId]);

  const currency = basket.items[0]?.currency;
  const total =
    basket.subtotal + SERVICE_FEE + (orderType === 'delivery' ? deliveryFee : 0);

  const submit = async () => {
    if (!accepted?.streetName) {
      Alert.alert(t('chooseAddress'));
      return;
    }
    if (!phone.trim()) {
      Alert.alert(t('leavePhone'));
      return;
    }
    setSending(true);
    try {
      const result = await createOrder({
        company_id: companyId,
        delivery_address: {
          address: accepted.streetName,
          lat: accepted.lat,
          long: accepted.lon,
          house,
          entrance,
          floor,
          apartment,
          comment,
        },
        client_phone_number: phone.trim(),
        payment_method: 'cash',
        payment_provider: 'cash',
        order_type: orderType,
        door_to_door: orderType === 'delivery' ? doorToDoor : false,
        items: basket.items.map((item) => ({ product_id: item._id, quantity: item.amount })),
      });
      basket.clear();
      router.replace(`/company/${companyId}/order/${result.order_id}`);
    } catch (error) {
      const name = error instanceof ApiError ? error.errorName : '';
      Alert.alert(
        name === 'ADDRESS_OUTSIDE_TASHKENT' ? t('youAreOutsideTashkent') : t('error')
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <CompanyStackHeader title={t('orderTitle')} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: Spacing.three, paddingBottom: insets.bottom + 140 }}>
        <View style={styles.tabs}>
          {(['delivery', 'pickup'] as const).map((type) => {
            const selected = orderType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setOrderType(type)}
                style={[
                  styles.tab,
                  { backgroundColor: selected ? theme.buttonColor : theme.fill },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: selected ? theme.buttonTextColor : theme.text, textAlign: 'center' }}>
                  {type === 'delivery' ? t('deliveryTab') : t('pickupTab')}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText type="heading" style={styles.block}>
          {t('where')}
        </ThemedText>
        <Pressable
          onPress={() => setMapOpen(true)}
          style={[styles.field, { backgroundColor: theme.cardBackground }]}>
          <ThemedText>{accepted?.streetName || t('chooseAddress')}</ThemedText>
        </Pressable>

        {orderType === 'delivery' && (
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.switchRow}>
              <ThemedText type="bodyStrong">{t('fromDoorToDoor')}</ThemedText>
              <Switch value={doorToDoor} onValueChange={setDoorToDoor} />
            </View>
            {doorToDoor &&
              (
                [
                  ['house', house, setHouse],
                  ['entrance', entrance, setEntrance],
                  ['floor', floor, setFloor],
                  ['apartment', apartment, setApartment],
                ] as const
              ).map(([key, value, setter]) => (
                <TextInput
                  key={key}
                  placeholder={t(key)}
                  placeholderTextColor={theme.hint}
                  value={value}
                  onChangeText={setter}
                  style={[styles.input, { color: theme.text, borderColor: theme.separatorStrong }]}
                />
              ))}
          </View>
        )}

        <TextInput
          placeholder={orderType === 'delivery' ? t('commentToCourier') : t('addComment')}
          placeholderTextColor={theme.hint}
          value={comment}
          onChangeText={setComment}
          style={[styles.input, styles.area, { color: theme.text, backgroundColor: theme.cardBackground }]}
        />

        <View style={[styles.field, { backgroundColor: theme.cardBackground }]}>
          <ThemedText type="caption" themeColor="hint">
            {t('phoneOfRecipient')}
          </ThemedText>
          <TextInput
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={[styles.phone, { color: theme.text }]}
          />
        </View>

        <ThemedText type="heading" style={styles.block}>
          {t('payment')}
        </ThemedText>
        <View style={[styles.payRow, { backgroundColor: theme.fill }]}>
          <ThemedText type="bodyStrong">{t('cash')}</ThemedText>
        </View>
        <Pressable
          onPress={() => setPromoOpen(true)}
          style={[styles.field, { backgroundColor: theme.cardBackground }]}>
          <ThemedText>{t('promoCode')}</ThemedText>
        </Pressable>
        <View style={[styles.field, { backgroundColor: theme.cardBackground }]}>
          <ThemedText>{t('useTgcCoins')}</ThemedText>
          <ThemedText type="caption" themeColor="hint">
            {t('available0coins')}
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <ThemedText type="heading">{t('total')}</ThemedText>
          <Line
            label={t('orderAmount')}
            value={`${formatPrice(basket.subtotal)} ${currencyLabel(currency)}`}
            old={
              basket.subtotalWithoutDiscount > basket.subtotal
                ? formatPrice(basket.subtotalWithoutDiscount)
                : undefined
            }
          />
          {orderType === 'delivery' && (
            <Line
              label={t('deliveryFee')}
              value={`${formatPrice(deliveryFee)} ${currencyLabel(currency)}`}
              hint={!company?.is_self_delivery && eta ? `${Number(eta) + 15}–${Number(eta) + 20} ${t('minutes')}` : undefined}
            />
          )}
          <Line label={t('serviceFee')} value={`${formatPrice(SERVICE_FEE)} ${currencyLabel(currency)}`} />
          <Line label={t('total')} value={`${formatPrice(total)} ${currencyLabel(currency)}`} />
        </View>
      </ScrollView>

      {sending && (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.buttonColor} />
        </View>
      )}

      {basket.size > 0 && <FixedCta label={t('placeOrder')} onPress={submit} disabled={sending} />}

      <AddressSheet
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
        pickupAddress={
          company
            ? {
                streetName: company.full_address || company.address || company.name,
                lat: company.latitude ?? 0,
                lon: company.longitude ?? 0,
              }
            : null
        }
        onPicked={(address) => {
          setAccepted(address);
          if (orderType === 'delivery') setSaveAsk(true);
        }}
      />

      <BottomSheet visible={promoOpen} title={t('enterPromoCode')} onClose={() => setPromoOpen(false)}>
        <TextInput
          value={promo}
          onChangeText={(value) => {
            setPromo(value);
            setPromoError('');
          }}
          placeholder={t('promoCode')}
          placeholderTextColor={theme.hint}
          style={[styles.input, { color: theme.text, backgroundColor: theme.fill }]}
        />
        {!!promoError && <ThemedText themeColor="destructive">{promoError}</ThemedText>}
        <Pressable
          onPress={() => setPromoError(promo.trim() ? t('promoCodeNotFound') : '')}
          style={[styles.apply, { backgroundColor: theme.buttonColor }]}>
          <ThemedText style={{ color: theme.buttonTextColor, fontWeight: '600', textAlign: 'center' }}>{t('apply')}</ThemedText>
        </Pressable>
      </BottomSheet>

      <BottomSheet visible={saveAsk} title={t('saveLocationTitle')} onClose={() => setSaveAsk(false)}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setSaveAsk(false)}
            style={[styles.apply, { backgroundColor: theme.fill, flex: 1 }]}>
            <ThemedText style={{ fontWeight: '600', textAlign: 'center' }}>{t('no')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              if (accepted) save({ ...accepted, title: accepted.title || accepted.streetName });
              setSaveAsk(false);
            }}
            style={[styles.apply, { backgroundColor: theme.buttonColor, flex: 1 }]}>
            <ThemedText style={{ color: theme.buttonTextColor, fontWeight: '600', textAlign: 'center' }}>{t('yes')}</ThemedText>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

function Line({
  label,
  value,
  old,
  hint,
}: {
  label: string;
  value: string;
  old?: string;
  hint?: string;
}) {
  return (
    <View style={styles.line}>
      <View>
        <ThemedText themeColor="hint">{label}</ThemedText>
        {!!hint && (
          <ThemedText type="caption" themeColor="hint">
            {hint}
          </ThemedText>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {!!old && (
          <ThemedText type="caption" themeColor="hint" style={{ textDecorationLine: 'line-through' }}>
            {old}
          </ThemedText>
        )}
        <ThemedText type="bodyStrong">{value}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: CompanyRadius.button,
  },
  block: { marginBottom: Spacing.two, marginTop: Spacing.three },
  field: { padding: Spacing.three, borderRadius: CompanyRadius.inner, marginBottom: Spacing.two, gap: 4 },
  card: { padding: Spacing.three, borderRadius: CompanyRadius.card, gap: Spacing.three, marginBottom: Spacing.three },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  input: {
    borderRadius: CompanyRadius.button,
    padding: Spacing.three,
    fontSize: 16,
    marginTop: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  area: { minHeight: 72, textAlignVertical: 'top', borderWidth: 0 },
  phone: { fontSize: 18, fontWeight: '600', paddingTop: 4 },
  payRow: { padding: Spacing.three, borderRadius: CompanyRadius.inner, marginBottom: Spacing.two },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  apply: {
    marginTop: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: CompanyRadius.button,
  },
});
