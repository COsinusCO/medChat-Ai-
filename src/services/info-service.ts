import { request } from '@/services/api';
import type { InfoPerson, InfoPersonComment, InfoService, InstagramData } from '@/types/chat';

type Paginated<T> = { data?: T[]; pagination?: { total?: number; pages?: number } };
type One<T> = { data?: T };

export async function fetchInfoPersonsAll(
  companyId: string,
  signal?: AbortSignal
): Promise<InfoPerson[]> {
  const response = await request<Paginated<InfoPerson> | InfoPerson[]>(
    '/delivery/bot/info-person',
    { query: { company_id: companyId }, signal }
  );
  return Array.isArray(response) ? response : (response?.data ?? []);
}

export async function fetchInfoPerson(
  id: string,
  companyId?: string,
  signal?: AbortSignal
): Promise<InfoPerson | null> {
  return request<InfoPerson>(`/delivery/bot/info-person/${id}`, {
    query: companyId ? { company_id: companyId } : undefined,
    signal,
  });
}

export async function fetchInfoServices(
  companyId: string,
  signal?: AbortSignal
): Promise<InfoService[]> {
  const response = await request<Paginated<InfoService> | InfoService[]>(
    '/delivery/bot/info-service',
    { query: { company_id: companyId }, signal }
  );
  return Array.isArray(response) ? response : (response?.data ?? []);
}

export async function fetchInfoService(
  id: string,
  companyId?: string,
  signal?: AbortSignal
): Promise<InfoService | null> {
  return request<InfoService>(`/delivery/bot/info-service/${id}`, {
    query: companyId ? { company_id: companyId } : undefined,
    signal,
  });
}

export async function fetchInfoSettings(
  companyId: string,
  signal?: AbortSignal
): Promise<{ service_phone?: string | null } | null> {
  return request<{ service_phone?: string | null }>('/delivery/bot/info-settings', {
    query: { company_id: companyId },
    signal,
  });
}

export async function fetchInfoPersonComments(
  personId: string,
  signal?: AbortSignal
): Promise<{ comments: InfoPersonComment[]; average?: number | null; total?: number }> {
  const response = await request<
    Paginated<InfoPersonComment> & { summary?: { average_rating?: number | null; total_reviews?: number } }
  >(`/delivery/bot/info-person-comment/${personId}`, {
    query: { page: 1, limit: 20 },
    raw: true,
    signal,
  });

  return {
    comments: response?.data ?? [],
    average: response?.summary?.average_rating ?? null,
    total: response?.summary?.total_reviews ?? response?.pagination?.total ?? 0,
  };
}

export async function sendInfoPersonComment(
  personId: string,
  review: { message: string; rating: number; images?: string[] }
): Promise<void> {
  await request(`/delivery/bot/info-person-comment/${personId}`, {
    method: 'POST',
    body: {
      message: review.message,
      rating: review.rating,
      ...(review.images?.length ? { images: review.images } : {}),
    },
  });
}

export async function deleteInfoPersonComment(commentId: string): Promise<void> {
  await request(`/delivery/bot/info-person-comment/comment/${commentId}`, { method: 'DELETE' });
}

export async function toggleSaveInfoPerson(id: string): Promise<boolean> {
  const response = await request<{ is_saved?: boolean }>(`/delivery/bot/info-person/${id}/save`, {
    method: 'POST',
  });
  return !!response?.is_saved;
}

export async function fetchPersonInstagram(
  id: string,
  signal?: AbortSignal
): Promise<InstagramData | null> {
  const response = await request<{ instagram_data?: InstagramData }>(
    `/delivery/bot/info-person/${id}/instagram`,
    { signal }
  );
  return response?.instagram_data ?? null;
}

export type OccupiedRange = { start: string; end: string };

export async function fetchOccupiedSlots(
  personId: string,
  date: string,
  signal?: AbortSignal
): Promise<OccupiedRange[]> {
  const response = await request<{ occupied?: OccupiedRange[] } | OccupiedRange[]>(
    '/delivery/bot/appointment/slots',
    { query: { person_id: personId, date }, signal }
  );
  return Array.isArray(response) ? response : (response?.occupied ?? []);
}

export async function createAppointment(body: {
  person_id: string;
  company_id?: string | null;
  date: string;
  start_time: string;
  duration_min: number;
  client_name: string;
  client_phone: string;
  service_ids?: string[];
  service_id?: string;
}): Promise<void> {
  await request('/delivery/bot/appointment', { method: 'POST', body });
}
