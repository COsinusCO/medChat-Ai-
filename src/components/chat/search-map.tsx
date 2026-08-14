import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { getExpoMaps } from '@/utils/expo-maps';

import type { MapPin } from '@/components/chat/map-pins';

const maps = getExpoMaps();

type SearchMapProps = {
  pins: MapPin[];
  interactive?: boolean;
  onMarkerPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

/** Native Apple / Google map. Null in Expo Go — the parent still lists the cards. */
export function SearchMap({ pins, interactive = true, onMarkerPress, style }: SearchMapProps) {
  const theme = useTheme();

  if (!maps || pins.length === 0) return null;

  const latitude = pins.reduce((sum, pin) => sum + pin.coordinates.latitude, 0) / pins.length;
  const longitude = pins.reduce((sum, pin) => sum + pin.coordinates.longitude, 0) / pins.length;
  const camera = { coordinates: { latitude, longitude }, zoom: 12 };

  const markers = pins.map((pin) => ({
    id: pin.company._id,
    coordinates: pin.coordinates,
    title: pin.company.name,
    monogram: pin.company.name.trim().charAt(0).toUpperCase(),
    tintColor: theme.primary,
  }));

  return (
    <View style={[styles.fill, style]} pointerEvents={interactive ? 'auto' : 'none'}>
      {Platform.OS === 'ios' ? (
        <maps.AppleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={camera}
          markers={markers}
          onMarkerClick={(marker) => onMarkerPress?.(marker.id ?? '')}
        />
      ) : (
        <maps.GoogleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={camera}
          markers={markers}
          onMarkerClick={(marker) => onMarkerPress?.(marker.id ?? '')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
