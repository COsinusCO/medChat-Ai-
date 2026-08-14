import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Static config stays in `app.json`; this file only injects values that must not be committed.
 *
 * `GOOGLE_MAPS_API_KEY` becomes the `com.google.android.geo.API_KEY` manifest entry at prebuild.
 * Android's map view crashes the process without it, so when the key is unset the app drops to the
 * list-only layout instead of mounting a map — see `src/utils/expo-maps.ts`.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    name: config.name ?? 'MedChat',
    slug: config.slug ?? 'MedChat',
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: googleMapsApiKey },
      },
    },
    // `android.config` is stripped from the manifest the app reads at runtime, so the key's
    // presence has to travel separately. `extra` survives, and both are read from the same env
    // var here — they cannot disagree.
    extra: {
      ...config.extra,
      googleMapsConfigured: Boolean(googleMapsApiKey),
    },
  };
};
