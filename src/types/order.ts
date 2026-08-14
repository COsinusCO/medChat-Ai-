import type { CompanyDetail, MenuProduct } from '@/types/chat';

export type DeliveryAddress = {
  address?: string;
  lat?: number | string;
  long?: number | string;
  house?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  comment?: string;
};

export type OrderItem = {
  product_id: string;
  quantity: number;
  price?: number;
  discounted_price?: number;
  total?: number;
  product: MenuProduct;
  discount?: MenuProduct['discount'];
};

export type CourierInfo = {
  _id?: string;
  name?: string;
  phone?: string | null;
  telegram_username?: string | null;
  image?: string | null;
};

export type CourierDelivery = {
  courier_id?: string;
  status?: 'assigned' | 'delivering' | 'arrived' | 'delivered';
  courier?: CourierInfo;
};

export type OrderDetail = {
  _id: string;
  company_id?: string;
  items: OrderItem[];
  total_amount?: number;
  discount_amount?: number;
  final_amount?: number;
  currency?: string;
  status: string;
  order_type?: string;
  delivery_address?: DeliveryAddress;
  created_at?: number;
  updated_at?: number;
  delivery_price?: number;
  door_to_door?: boolean;
  delivery_type?: 'yandex_delivery' | 'self_delivery';
  company?: CompanyDetail;
  yandex_delivery?: {
    eta?: number;
    performer_info?: { courier_name?: string };
  };
  courier_delivery?: CourierDelivery;
  payment?: { method?: string; status?: string };
};

export type TimelineEntry = {
  order_id: string;
  event_id: string;
  occurred_at: string;
  kind?: string;
  code: string;
  icon?: string;
  i18n?: Record<string, { title: string; subtitle: string | null }>;
};

export type DeliveryPrice = {
  delivery_price: number;
  eta?: number;
  distance_km?: number | null;
};

export type AcceptedAddress = {
  streetName: string;
  lat: number;
  lon: number;
  title?: string;
};

export type CreateOrderBody = {
  company_id: string;
  delivery_address: DeliveryAddress;
  client_phone_number: string;
  payment_method: string;
  payment_provider: string;
  order_type: string;
  door_to_door: boolean;
  items: { product_id: string; quantity: number }[];
};
