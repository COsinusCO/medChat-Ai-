/**
 * `expo-maps` is a native module. Expo Go (and any dev client built before the plugin was added)
 * does not ship `ExpoMaps`, so a static `import` / a bare `require()` red-screens the app.
 *
 * Probe with `requireOptionalNativeModule` first — that returns `null` instead of throwing —
 * and only then load the JS package.
 */
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ExpoMapsPackage = typeof import('expo-maps');

/**
 * `GoogleMaps.View` throws `IllegalStateException: API key not found` from the native UI thread
 * when `com.google.android.geo.API_KEY` is missing from the manifest. That kills the process before
 * any JS error boundary sees it, so the view must never mount without a key. Apple Maps needs none.
 */
function isAndroidMapsKeyMissing(): boolean {
  if (Platform.OS !== 'android') return false;

  // Not `android.config.googleMaps.apiKey` — Expo strips that from the runtime manifest.
  // `app.config.ts` mirrors its presence into `extra` for exactly this check.
  return Constants.expoConfig?.extra?.googleMapsConfigured !== true;
}

export function getExpoMaps(): ExpoMapsPackage | null {
  if (!requireOptionalNativeModule('ExpoMaps')) return null;
  if (isAndroidMapsKeyMissing()) return null;

  // Native module is present, so the package's `requireNativeModule('ExpoMaps')` will resolve.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-maps') as ExpoMapsPackage;
}
