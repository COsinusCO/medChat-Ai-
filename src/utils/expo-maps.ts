/**
 * `expo-maps` is a native module. Expo Go (and any dev client built before the plugin was added)
 * does not ship `ExpoMaps`, so a static `import` / a bare `require()` red-screens the app.
 *
 * Probe with `requireOptionalNativeModule` first — that returns `null` instead of throwing —
 * and only then load the JS package.
 */
import { requireOptionalNativeModule } from 'expo';

export type ExpoMapsPackage = typeof import('expo-maps');

export function getExpoMaps(): ExpoMapsPackage | null {
  if (!requireOptionalNativeModule('ExpoMaps')) return null;

  // Native module is present, so the package's `requireNativeModule('ExpoMaps')` will resolve.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-maps') as ExpoMapsPackage;
}
