import type { CatalogCompany } from '@/types/chat';

export type MapPin = {
  company: CatalogCompany;
  coordinates: { latitude: number; longitude: number };
};

/** Same GeoJSON / lat-lon rules as the Mini App's `getPlaceLngLat`. Specialists stay off the map. */
export function getCompanyCoordinates(
  company: CatalogCompany
): { latitude: number; longitude: number } | null {
  if (company.result_type === 'info_person') return null;

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

export function mapPinsFrom(companies: CatalogCompany[]): MapPin[] {
  return companies
    .map((company) => ({ company, coordinates: getCompanyCoordinates(company) }))
    .filter(
      (pin): pin is MapPin => pin.coordinates != null
    );
}
