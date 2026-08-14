import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CompanyRadius, Spacing } from '@/constants/theme';
import { useDeliveryAddress } from '@/features/address/address-context';
import { useUserLocation } from '@/features/location/location-context';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { fetchStreetName } from '@/services/order-service';
import type { AcceptedAddress } from '@/types/order';
import { getExpoMaps } from '@/utils/expo-maps';

const maps = getExpoMaps();

export function AddressSheet({
  visible,
  onClose,
  onPicked,
  pickupAddress,
}: {
  visible: boolean;
  onClose: () => void;
  onPicked: (address: AcceptedAddress) => void;
  pickupAddress?: AcceptedAddress | null;
}) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const { coords, request } = useUserLocation();
  const { saved, save } = useDeliveryAddress();

  const [lat, setLat] = useState(coords.lat);
  const [lon, setLon] = useState(coords.lon);
  const [street, setStreet] = useState('');
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLat(coords.lat);
    setLon(coords.lon);
    reverse(coords.lat, coords.lon);
  }, [visible]);

  const reverse = (nextLat: number, nextLon: number) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setLoading(true);
      fetchStreetName(nextLat, nextLon, language)
        .then((data) => setStreet(data?.streetName || data?.fullAddress || ''))
        .catch(() => setStreet(''))
        .finally(() => setLoading(false));
    }, 400);
  };

  const pick = (address: AcceptedAddress, persist?: boolean) => {
    if (persist && title.trim()) save({ ...address, title: title.trim() });
    onPicked(address);
    onClose();
  };

  const useGps = async () => {
    const next = await request();
    setLat(next.lat);
    setLon(next.lon);
    reverse(next.lat, next.lon);
  };

  const MapView =
    maps && Platform.OS === 'ios'
      ? maps.AppleMaps.View
      : maps && Platform.OS === 'android'
        ? maps.GoogleMaps.View
        : null;

  return (
    <BottomSheet visible={visible} title={t('chooseAddress')} onClose={onClose}>
      {pickupAddress && (
        <Pressable
          onPress={() => pick(pickupAddress)}
          style={[styles.row, { backgroundColor: theme.fill }]}>
          <ThemedText type="smallBold">{t('pickupAt')}</ThemedText>
          <ThemedText type="caption" themeColor="hint">
            {pickupAddress.streetName}
          </ThemedText>
        </Pressable>
      )}

      {MapView && (
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            cameraPosition={{ coordinates: { latitude: lat, longitude: lon }, zoom: 16 }}
            onCameraMove={(event) => {
              const nextLat = event.coordinates.latitude;
              const nextLon = event.coordinates.longitude;
              if (nextLat == null || nextLon == null) return;
              setLat(nextLat);
              setLon(nextLon);
              reverse(nextLat, nextLon);
            }}
          />
          <View style={styles.pin} pointerEvents="none">
            <ThemedText style={{ fontSize: 28 }}>📍</ThemedText>
          </View>
        </View>
      )}

      {MapView ? (
        <ThemedText type="caption" themeColor="hint" style={styles.hint}>
          {t('mapHint')}
        </ThemedText>
      ) : null}

      <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
        {loading ? (
          <ActivityIndicator color={theme.buttonColor} />
        ) : (
          <ThemedText>{street || t('chooseAddress')}</ThemedText>
        )}
      </View>

      <Pressable onPress={useGps} style={[styles.row, { backgroundColor: theme.fill }]}>
        <ThemedText type="smallBold">{t('currentLocation')}</ThemedText>
      </Pressable>

      {saved.length > 0 && (
        <>
          <ThemedText type="heading" style={styles.section}>
            {t('savedAddresses')}
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.saved}>
            {saved.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => pick(item)}
                style={[styles.savedChip, { backgroundColor: theme.fill }]}>
                <ThemedText type="smallBold">{item.title}</ThemedText>
                <ThemedText type="caption" themeColor="hint" numberOfLines={2}>
                  {item.streetName}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      <TextInput
        placeholder={t('locationName')}
        placeholderTextColor={theme.hint}
        value={title}
        onChangeText={setTitle}
        style={[styles.input, { backgroundColor: theme.fill, color: theme.text }]}
      />

      <Pressable
        disabled={!street}
        onPress={() =>
          pick({ streetName: street, lat, lon }, true)
        }
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.buttonColor },
          (pressed || !street) && styles.pressed,
        ]}>
        <ThemedText style={{ color: theme.buttonTextColor, fontWeight: '600', textAlign: 'center' }}>
          {t('useThisAddress')}
        </ThemedText>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    height: 220,
    borderRadius: CompanyRadius.inner,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  map: {
    flex: 1,
  },
  pin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -14,
    marginTop: -28,
  },
  hint: {
    marginBottom: Spacing.two,
  },
  row: {
    padding: Spacing.three,
    borderRadius: CompanyRadius.inner,
    marginBottom: Spacing.two,
    gap: 4,
  },
  section: {
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  saved: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  savedChip: {
    width: 160,
    padding: Spacing.two,
    borderRadius: CompanyRadius.button,
    gap: 4,
  },
  input: {
    borderRadius: CompanyRadius.button,
    padding: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.three,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: CompanyRadius.button,
  },
  pressed: {
    opacity: 0.7,
  },
});
