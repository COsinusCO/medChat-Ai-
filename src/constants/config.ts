/**
 * Backend wiring. The app talks to exactly the same endpoints as the TrueGis Mini App —
 * see TrueGisClient/src/app/api/apiSlice.ts (v1) and trueGisHomeApi.ts (homepage/v1).
 */

const DEFAULT_API_BASE = 'https://dev.admin13.uz';

const host = (process.env.EXPO_PUBLIC_API_HOST ?? DEFAULT_API_BASE).replace(/\/$/, '');

/** Catalog / chat / auth gateway. */
export const API_URL = `${host}/v1`;
/** Home cards live on a separate service, same host. */
export const HOME_API_URL = `${host}/homepage/v1`;

/**
 * The single partner this app is scoped to: Shifo24 (`card.link` = `company_type`).
 * In the web client the user picks it from the partner grid; here it is the whole app.
 */
export const PARTNER_ID = '6932ea73d763c1eb641fe46f';

/** Shown until the partner card loads — its title in every language is the same. */
export const PARTNER_FALLBACK_NAME = 'Shifo24';

/** Identifies this client to `/auth/mobile/start`. */
export const APP_ID = 'medchat';

/**
 * Catalog search is a hard 100 km geo cut-off. The Mini App therefore always has coordinates
 * (`userLocationSlice` starts at 41, 69 — Tashkent) so a missing GPS grant cannot return an
 * empty page. Same default, same role.
 */
export const DEFAULT_SEARCH_COORDS = { lat: 41.310038, lon: 69.240071 };

/** Rough Uzbekistan bounding box — Shifo24's catalog is not useful outside it. */
export function isInServiceArea(lat: number, lon: number): boolean {
  return lat >= 37 && lat <= 46 && lon >= 55 && lon <= 74;
}

export function isUsableSearchCoords(
  lat?: number | null,
  lon?: number | null
): lat is number {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    !(lat === 0 && lon === 0) &&
    isInServiceArea(lat as number, lon as number)
  );
}
