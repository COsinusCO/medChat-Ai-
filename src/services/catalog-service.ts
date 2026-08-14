/**
 * Catalog reads — the same endpoints the Mini App's catalogApiSlice uses, scoped to our partner.
 */
import {
  DEFAULT_SEARCH_COORDS,
  HOME_API_URL,
  PARTNER_ID,
  isUsableSearchCoords,
} from '@/constants/config';
import { request } from '@/services/api';
import type { Language } from '@/i18n/translations';
import type { CatalogCompany, IndustryType } from '@/types/chat';
import type { SearchParams } from '@/utils/ai-text';

type LocalizedName = Partial<Record<Language, string>>;

type IndustryTypeResponse = {
  _id: string;
  name: LocalizedName;
  image?: string | null;
}[];

type CompanySearchResponse = {
  results: CatalogCompany[];
  pagination?: { hasNext?: boolean; total?: number };
};

type HomeCard = {
  _id: string;
  link: string;
  cardType: string;
  title: LocalizedName;
  description?: LocalizedName;
  img?: string;
  prompt?: string;
};

type HomeCardsResponse = {
  grouped?: { items?: HomeCard[] }[];
  withoutDescriptionEn?: HomeCard[];
};

export type PartnerCard = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  /** `card.prompt` — passed to the model as `specialPrompt`, exactly as the Mini App does. */
  prompt: string | null;
};

function localized(value: LocalizedName | undefined, language: Language): string {
  if (!value) return '';
  return value[language] || value.uz || value.ru || value.en || '';
}

/** Medical specialties of this partner — the chips on the welcome screen. Public endpoint. */
export async function fetchIndustryTypes(
  language: Language,
  signal?: AbortSignal
): Promise<IndustryType[]> {
  const data = await request<IndustryTypeResponse>('/delivery/bot/types', {
    query: { company_type: PARTNER_ID },
    auth: false,
    signal,
  });

  return (data ?? []).map((item) => ({
    _id: item._id,
    label: localized(item.name, language),
    icon: item.image ?? null,
  }));
}

/**
 * Clinic search the assistant asks for. Always scoped to this partner's `company_type`.
 *
 * Coordinates are mandatory and the 100 km geo filter is a hard cut-off: GPS in the simulator
 * (Cupertino) or a missing fix used to return a silent empty page. Named-place coords from the
 * model win when they are inside Uzbekistan; otherwise the device; otherwise Tashkent.
 */
export async function searchCompanies(
  params: SearchParams,
  options: { lat?: number | null; lon?: number | null; limit?: number; signal?: AbortSignal } = {}
): Promise<CatalogCompany[]> {
  const coords = isUsableSearchCoords(params.lat, params.lon)
    ? { lat: params.lat, lon: params.lon as number }
    : isUsableSearchCoords(options.lat, options.lon)
      ? { lat: options.lat, lon: options.lon as number }
      : DEFAULT_SEARCH_COORDS;

  const response = await request<CompanySearchResponse>('/delivery/bot/company/search', {
    query: {
      query: params.query,
      page: 1,
      limit: options.limit ?? 10,
      latitude: coords.lat,
      longitude: coords.lon,
      company_type: PARTNER_ID,
      search_filters: params.search_filters,
    },
    signal: options.signal,
  });

  return response?.results ?? [];
}

/** The partner card itself — its title feeds the input placeholder, its prompt the model. */
export async function fetchPartnerCard(
  language: Language,
  signal?: AbortSignal
): Promise<PartnerCard | null> {
  const response = await fetch(`${HOME_API_URL}/cards?isActive=true&cardType=open_page`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as HomeCardsResponse;
  const cards = [
    ...(payload.grouped ?? []).flatMap((group) => group.items ?? []),
    ...(payload.withoutDescriptionEn ?? []),
  ];
  const card = cards.find((item) => item.link === PARTNER_ID);
  if (!card) return null;

  return {
    id: card.link,
    name: localized(card.title, language),
    description: localized(card.description, language) || null,
    image: card.img ?? null,
    prompt: card.prompt?.trim() ? card.prompt : null,
  };
}
