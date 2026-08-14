import { memo, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { CompanyCard } from '@/components/chat/company-card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogCompany } from '@/types/chat';
import { getExpoMaps } from '@/utils/expo-maps';

const MAP_HEIGHT = 240;
const DEFAULT_ZOOM = 11;

/** Null in Expo Go — search still lists the cards underneath. */
const maps = getExpoMaps();

/** GeoJSON stores `[longitude, latitude]`; some records only carry the flat fields. */
function getCoordinates(company: CatalogCompany): { latitude: number; longitude: number } | null {
  const pair = company.location?.coordinates;
  if (Array.isArray(pair) && pair.length >= 2) {
    const [longitude, latitude] = pair;
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) return { latitude, longitude };
  }

  if (Number.isFinite(company.latitude) && Number.isFinite(company.longitude)) {
    return { latitude: Number(company.latitude), longitude: Number(company.longitude) };
  }

  return null;
}

type MapResultsProps = {
  companies: CatalogCompany[];
  onSelect: (company: CatalogCompany) => void;
  onAction: (company: CatalogCompany) => void;
};

/**
 * Search results on a map with the clinics listed underneath — the native counterpart of the
 * Mini App's `MapResultsBubble`. Tapping a pin scrolls its card into focus; tapping a card opens
 * the company.
 */
export const MapResults = memo(function MapResults({
  companies,
  onSelect,
  onAction,
}: MapResultsProps) {
  const theme = useTheme();
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const pins = useMemo(
    () =>
      companies
        .map((company) => ({ company, coordinates: getCoordinates(company) }))
        .filter((pin): pin is { company: CatalogCompany; coordinates: NonNullable<ReturnType<typeof getCoordinates>> } => !!pin.coordinates),
    [companies]
  );

  const camera = useMemo(() => {
    if (pins.length === 0) return undefined;

    const latitude = pins.reduce((sum, pin) => sum + pin.coordinates.latitude, 0) / pins.length;
    const longitude = pins.reduce((sum, pin) => sum + pin.coordinates.longitude, 0) / pins.length;

    return { coordinates: { latitude, longitude }, zoom: DEFAULT_ZOOM };
  }, [pins]);

  const ordered = useMemo(() => {
    if (!focusedId) return companies;
    const focused = companies.find((company) => company._id === focusedId);
    if (!focused) return companies;

    return [focused, ...companies.filter((company) => company._id !== focusedId)];
  }, [companies, focusedId]);

  return (
    <View style={styles.container}>
      {maps && pins.length > 0 && (
        <View style={[styles.map, { borderColor: theme.border }]}>
          {Platform.OS === 'ios' ? (
            <maps.AppleMaps.View
              style={StyleSheet.absoluteFill}
              cameraPosition={camera}
              markers={pins.map((pin) => ({
                id: pin.company._id,
                coordinates: pin.coordinates,
                title: pin.company.name,
                monogram: pin.company.name.trim().charAt(0).toUpperCase(),
                tintColor: theme.primary,
              }))}
              onMarkerClick={(marker) => setFocusedId(marker.id ?? null)}
            />
          ) : (
            <maps.GoogleMaps.View
              style={StyleSheet.absoluteFill}
              cameraPosition={camera}
              markers={pins.map((pin) => ({
                id: pin.company._id,
                coordinates: pin.coordinates,
                title: pin.company.name,
              }))}
              onMarkerClick={(marker) => setFocusedId(marker.id ?? null)}
            />
          )}
        </View>
      )}

      <View style={styles.cards}>
        {ordered.map((company) => (
          <CompanyCard
            key={company._id}
            company={company}
            onPress={onSelect}
            onAction={onAction}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  map: {
    height: MAP_HEIGHT,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cards: {
    gap: Spacing.two,
  },
});
