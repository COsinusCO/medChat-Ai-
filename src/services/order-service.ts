import { request } from '@/services/api';
import type { Language } from '@/i18n/translations';
import type {
  CreateOrderBody,
  DeliveryPrice,
  OrderDetail,
  TimelineEntry,
} from '@/types/order';

type Envelope<T> = { data?: T; message?: string; error_name?: string };

export type StreetName = {
  streetName: string;
  fullAddress?: string;
  city?: string;
};

export async function fetchStreetName(
  lat: number,
  lon: number,
  language: Language,
  signal?: AbortSignal
): Promise<StreetName | null> {
  const response = await request<Envelope<StreetName> | StreetName>(
    '/common/bot/address/geocoding',
    { query: { lat, long: lon, language }, raw: true, signal }
  );

  if (!response) return null;
  if ('data' in response && response.data?.streetName) return response.data;
  if ('streetName' in response && response.streetName) return response;
  return null;
}

export async function fetchDeliveryPrice(
  body: {
    company_id?: string;
    company_location: { lat: string; long: string };
    delivery_address: { lat: string; long: string };
    items_count: number;
    door_to_door?: boolean;
  },
  signal?: AbortSignal
): Promise<DeliveryPrice | null> {
  const response = await request<DeliveryPrice>('/delivery/mobile/order/delivery-price-checker', {
    method: 'POST',
    body,
    signal,
  });
  return response ?? null;
}

export async function createOrder(body: CreateOrderBody): Promise<{ order_id: string; payment?: { url?: string } }> {
  const response = await request<{ order_id: string; payment?: { url?: string } }>(
    '/delivery/bot/order',
    { method: 'POST', body }
  );
  if (!response?.order_id) throw new Error('Order was not created');
  return response;
}

export async function fetchOrder(id: string, signal?: AbortSignal): Promise<OrderDetail | null> {
  return request<OrderDetail>(`/delivery/mobile/order/${id}`, { signal });
}

export async function fetchOrderTimeline(
  id: string,
  signal?: AbortSignal
): Promise<TimelineEntry[]> {
  const response = await request<TimelineEntry[] | { data?: TimelineEntry[] }>(
    `/delivery/mobile/order/${id}/timeline`,
    { signal }
  );
  return Array.isArray(response) ? response : (response?.data ?? []);
}
