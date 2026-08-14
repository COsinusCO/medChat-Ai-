/**
 * Presentation helpers for catalog companies, ported from the Mini App's place item
 * (AIFoodAssistantPlaceItem) so both clients read the same data identically.
 */
import type { Language } from '@/i18n/translations';
import type { CatalogCompany, LocalizedText } from '@/types/chat';

/** The full address starts with the company name — the web drops everything up to the first comma. */
export function shortAddress(company: CatalogCompany): string {
  const source = company.district || company.city || company.full_address || company.address;
  if (!source) return '';

  const firstComma = source.indexOf(',');
  return firstComma === -1 ? source : source.slice(firstComma + 1).trim();
}

/** `(139)` / `(1.2k)` */
export function formatReviewCount(count?: number | null): string {
  if (!count) return '';
  if (count < 1000) return `(${count})`;

  return `(${(count / 1000).toFixed(1).replace('.0', '')}k)`;
}

/** Meters below a kilometre, kilometres above it — same thresholds as the web. */
export function formatDistance(
  company: CatalogCompany,
  labels: { meters: string; kilometers: string }
): string {
  const meters = distanceInMeters(company);
  if (meters == null) return '';

  return meters > 999
    ? `${(meters / 1000).toFixed(1)} ${labels.kilometers}`
    : `${Math.round(meters)} ${labels.meters}`;
}

function distanceInMeters(company: CatalogCompany): number | null {
  const distance = company.distance;
  if (!distance) return null;
  if (typeof distance.distanceInMeters === 'number') return distance.distanceInMeters;

  if (typeof distance.distance === 'string') {
    const parsed = parseFloat(distance.distance.replace(/[^\d.]/g, ''));
    if (Number.isNaN(parsed)) return null;
    return /km/i.test(distance.distance) ? parsed * 1000 : parsed;
  }

  return null;
}

export function localizedText(
  value: LocalizedText | string | undefined,
  language: Language,
  fallback: string
): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value || fallback;

  // The catalog spells English as `eng` in button labels and as `en` elsewhere.
  return value[language] || value.eng || value.en || value.ru || value.uz || fallback;
}

export type CompanyAction =
  | { kind: 'call'; value: string }
  | { kind: 'telegram'; value: string }
  | { kind: 'web'; value: string }
  | { kind: 'menu'; value: string };

/**
 * What the primary button does, mirroring `handleOrder`: an explicit `button` config wins,
 * otherwise fall back to calling the company.
 */
export function resolveCompanyAction(company: CatalogCompany): CompanyAction | null {
  const button = company.button;

  if (!button?.value) {
    return company.phone_number ? { kind: 'call', value: company.phone_number } : null;
  }

  switch (button.type) {
    case 'call_number':
      return { kind: 'call', value: button.value };
    case 'link':
      return { kind: 'telegram', value: button.value };
    case 'web_url':
      return { kind: 'web', value: button.value };
    case 'inside_app':
      return { kind: 'menu', value: button.value };
    default:
      return company.phone_number ? { kind: 'call', value: company.phone_number } : null;
  }
}
