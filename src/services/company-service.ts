/**
 * Company card data — the same endpoints the Mini App's MainPage/HomePage load before rendering
 * the company page (`companySlice`, `menuSlice`, `infoApiSlice`).
 */
import { request } from '@/services/api';
import type {
  CompanyComment,
  CompanyDetail,
  InfoPerson,
  InstagramData,
  MenuProduct,
} from '@/types/chat';

export async function fetchCompany(
  id: string,
  coords?: { lat?: number | null; lon?: number | null },
  signal?: AbortSignal
): Promise<CompanyDetail> {
  return request<CompanyDetail>(`/delivery/bot/company/${id}`, {
    query: { lat: coords?.lat ?? null, long: coords?.lon ?? null },
    signal,
  });
}

/** Stories power the ring around the logo; posts extend the gallery, as in the web. */
export async function fetchCompanyInstagram(
  id: string,
  signal?: AbortSignal
): Promise<InstagramData | null> {
  const response = await request<{ instagram_data?: InstagramData }>(
    `/delivery/bot/company/${id}/instagram`,
    { signal }
  );
  return response?.instagram_data ?? null;
}

/** Toggles the bookmark. The gateway flips the current state, so there is nothing to send. */
export async function toggleFavorite(id: string): Promise<void> {
  await request(`/delivery/bot/favorite/favorite/${id}`, {
    method: 'POST',
    body: { type: 'company' },
  });
}

type Paginated<T> = { data?: T[]; pagination?: { total?: number; pages?: number } };

export async function fetchCompanyComments(
  id: string,
  limit: number,
  signal?: AbortSignal
): Promise<{ comments: CompanyComment[]; total: number; pages: number }> {
  // `pagination.total` decides whether the block renders at all, so keep the envelope.
  const response = await request<Paginated<CompanyComment>>(
    `/delivery/bot/comment/get-by-company/${id}`,
    { query: { limit }, raw: true, signal }
  );

  return {
    comments: response?.data ?? [],
    total: response?.pagination?.total ?? 0,
    pages: response?.pagination?.pages ?? 0,
  };
}

/**
 * Post a review. The gateway derives `thumbnails` from `images` itself, but the Mini App sends
 * them anyway, so we match it. Answers 409 `PENDING_COMMENT_EXISTS` when the user already has one
 * awaiting moderation for this company.
 */
export async function sendCompanyComment(
  companyId: string,
  review: { message: string; rating: number; images: string[] }
): Promise<void> {
  await request(`/delivery/bot/comment/${companyId}`, {
    method: 'POST',
    body: {
      message: review.message,
      rating: review.rating,
      images: review.images,
      thumbnails: review.images,
    },
  });
}

/** The first few menu items — the "you may like" strip, shown only for `inside_app` partners. */
export async function fetchMenu(
  companyId: string,
  limit: number,
  signal?: AbortSignal
): Promise<MenuProduct[]> {
  const response = await request<Paginated<MenuProduct> | MenuProduct[]>('/delivery/bot/product', {
    query: { company_id: companyId, limit },
    signal,
  });

  return Array.isArray(response) ? response : (response?.data ?? []);
}

export type TaxiPrice = {
  estimatedTime?: number;
  currency?: string;
  options?: { price?: number }[];
};

/** Yandex Go's estimate for the ride, shown in the taxi sheet. */
export async function fetchTaxiPrice(
  from: { lat: number; lon: number },
  to: { lat?: number; lon?: number },
  signal?: AbortSignal
): Promise<TaxiPrice | null> {
  if (to.lat == null || to.lon == null) return null;

  return request<TaxiPrice>('/common/bot/taxi-price/checker/', {
    query: {
      'from_address[lat]': from.lat,
      'from_address[long]': from.lon,
      'to_address[lat]': to.lat,
      'to_address[long]': to.lon,
    },
    signal,
  });
}

/** The venue's specialists — the "Specialists" strip. */
export async function fetchInfoPersons(
  companyId: string,
  limit: number,
  signal?: AbortSignal
): Promise<InfoPerson[]> {
  const response = await request<Paginated<InfoPerson> | InfoPerson[]>(
    '/delivery/bot/info-person',
    { query: { company_id: companyId, limit }, signal }
  );

  return Array.isArray(response) ? response : (response?.data ?? []);
}
