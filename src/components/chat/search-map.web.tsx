import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MapPin } from '@/components/chat/map-pins';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

type SearchMapProps = {
  pins: MapPin[];
  interactive?: boolean;
  onMarkerPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Mini App `MapResultsBubble` — MapLibre + OpenFreeMap, so search in the web chat gets the same
 * map card as TrueGis. Native builds use `search-map.tsx` (expo-maps) instead.
 */
export function SearchMap({ pins, interactive = true, onMarkerPress, style }: SearchMapProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onMarkerPressRef = useRef(onMarkerPress);
  onMarkerPressRef.current = onMarkerPress;

  const ids = pins.map((pin) => pin.company._id).join(',');

  useEffect(() => {
    const container = host.current;
    if (!container || pins.length === 0) return;

    const first = pins[0].coordinates;
    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [first.longitude, first.latitude],
      zoom: 12,
      pitch: 20,
      attributionControl: false,
      interactive,
    });
    mapRef.current = map;

    const handleLoad = () => {
      const bounds = new maplibregl.LngLatBounds();

      pins.forEach((pin) => {
        const lngLat: [number, number] = [pin.coordinates.longitude, pin.coordinates.latitude];
        bounds.extend(lngLat);

        const el = document.createElement('div');
        el.textContent = pin.company.name.trim().charAt(0).toUpperCase() || '•';
        Object.assign(el.style, {
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#208AEF',
          color: '#fff',
          fontWeight: '700',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
          cursor: 'pointer',
        });
        el.onclick = (event) => {
          event.stopPropagation();
          onMarkerPressRef.current?.(pin.company._id);
        };

        markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map));
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 13, duration: 0 });
      }
    };

    map.once('load', handleLoad);

    return () => {
      map.off('load', handleLoad);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // pins is read inside; ids is the stable key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, interactive]);

  return (
    <View style={[styles.fill, style]}>
      <div ref={host} style={webFill} />
    </View>
  );
}

const webFill = { width: '100%', height: '100%' } as const;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
