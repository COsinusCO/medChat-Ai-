/**
 * User coordinates for catalog search.
 *
 * The gateway's company search is a hard 100 km `$geoWithin` — missing or out-of-region
 * coordinates come back as an empty page, not `LOCATION_REQUIRED`. The Mini App therefore
 * always has a Tashkent default (`userLocationSlice` starts at 41, 69). We do the same:
 * GPS is used when it lands inside Uzbekistan, otherwise search still runs from Tashkent.
 */
import * as Location from 'expo-location';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_SEARCH_COORDS, isUsableSearchCoords } from '@/constants/config';

export type Coordinates = { lat: number; lon: number };

export type LocationStatus = 'unknown' | 'granted' | 'denied';

type LocationValue = {
  /** Coordinates the catalog and the model should use. Never null. */
  coords: Coordinates;
  status: LocationStatus;
  /** True when GPS is missing or outside the service area and Tashkent is standing in. */
  usingFallback: boolean;
  /**
   * True until the permission prompt and the first fix have settled. Screens must not complain
   * about a missing location while this is set — `coords` is only the Tashkent placeholder yet.
   */
  resolving: boolean;
  /** The device's own position, once we have a usable one. Null while unknown or refused. */
  gps: Coordinates | null;
  /** Asks for permission if needed and refreshes GPS. Always returns search coordinates. */
  request: () => Promise<Coordinates>;
};

const LocationContext = createContext<LocationValue | null>(null);

const POSITION_TIMEOUT_MS = 8_000;

function toCoords(position: Location.LocationObject | null): Coordinates | null {
  if (!position) return null;
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location-timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Prefer a last-known fix only when it is already inside the service area (fast path on a
 * real device in Tashkent). Simulator / browser last-known is often Cupertino — skip it and
 * try a fresh reading, then let the caller fall back to Tashkent.
 */
async function readPosition(): Promise<Coordinates | null> {
  try {
    const last = toCoords(await Location.getLastKnownPositionAsync());
    if (last && isUsableSearchCoords(last.lat, last.lon)) return last;
  } catch {
    // Web and some simulators do not implement last-known.
  }

  try {
    const current = toCoords(
      await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        POSITION_TIMEOUT_MS
      )
    );
    if (current) return current;
  } catch {
    // Permission granted but the fix failed — Tashkent still lets search run.
  }

  return null;
}

function searchCoords(gps: Coordinates | null): Coordinates {
  if (gps && isUsableSearchCoords(gps.lat, gps.lon)) return gps;
  return DEFAULT_SEARCH_COORDS;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [gps, setGps] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>('unknown');
  const [resolving, setResolving] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const request = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        if (mounted.current) setStatus('denied');
        return searchCoords(gps);
      }

      const position = await readPosition();
      if (!mounted.current) return searchCoords(position);

      setStatus('granted');
      setGps(position);
      if (position && !isUsableSearchCoords(position.lat, position.lon)) {
        console.warn('[location] GPS is outside the catalog area, searching from Tashkent', position);
      }
      return searchCoords(position);
    } catch {
      if (mounted.current) setStatus('denied');
      return searchCoords(gps);
    }
  }, [gps]);

  /**
   * At boot: ask for permission straight away (reusing an existing grant silently) and take the
   * first fix. Search does not wait for this — Tashkent is already in `coords`, so the first
   * "find" cannot come back empty just because GPS is still spinning — but anything that shows
   * the user their own distance should wait for `resolving` to clear.
   */
  useEffect(() => {
    let cancelled = false;

    Location.getForegroundPermissionsAsync()
      .then(async (permission) => {
        if (cancelled) return;

        if (!permission.granted) {
          if (permission.canAskAgain) await request();
          else if (mounted.current) setStatus('denied');
          return;
        }

        const position = await readPosition();
        if (cancelled) return;

        setStatus('granted');
        setGps(position);
        if (position && !isUsableSearchCoords(position.lat, position.lon)) {
          console.warn('[location] GPS is outside the catalog area, searching from Tashkent', position);
        }
      })
      .catch(() => {
        if (!cancelled && mounted.current) setStatus('denied');
      })
      .finally(() => {
        if (!cancelled && mounted.current) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally once at mount — `request` is recreated when gps changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coords = searchCoords(gps);
  const usingFallback = !isUsableSearchCoords(gps?.lat, gps?.lon);

  const value = useMemo<LocationValue>(
    () => ({ coords, status, usingFallback, resolving, gps, request }),
    [coords, status, usingFallback, resolving, gps, request]
  );

  return <LocationContext value={value}>{children}</LocationContext>;
}

export function useUserLocation() {
  const value = use(LocationContext);
  if (!value) throw new Error('useUserLocation must be used inside <LocationProvider>');
  return value;
}
