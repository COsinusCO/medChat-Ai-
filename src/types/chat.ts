import type { SearchParams } from '@/utils/ai-text';

export type LocalizedText = Partial<Record<'uz' | 'cyrl' | 'ru' | 'en' | 'eng', string>>;

export type CompanyDistance = {
  /** Human readable, e.g. `9.01 km`. */
  distance?: string;
  duration?: string;
  walking_duration?: string;
  distanceInMeters?: number;
};

export type CompanyPhoto = {
  photo_id?: string;
  photo_url?: string;
  photo_url_large?: string;
};

/** Weekday → time spans, e.g. `{ Monday: ["9 AM-6 PM"] }`. */
export type WorkingHours = Partial<Record<string, string[]>>;

/** A clinic / doctor card returned by `/delivery/bot/company/search`. */
export type CatalogCompany = {
  _id: string;
  name: string;
  type?: string;
  subtypes?: string[];
  rating?: number;
  review_count?: number;
  address?: string;
  full_address?: string;
  district?: string;
  city?: string;
  phone_number?: string;
  website?: string;
  description?: string;
  is_open?: boolean;
  is_partner?: boolean;
  logo?: string;
  logoThumbnail?: string;
  image?: string;
  imageThumbnail?: string;
  discount_percent?: number;
  distance?: CompanyDistance;
  latitude?: number;
  longitude?: number;
  location?: { coordinates?: [number, number] };
  working_hours?: WorkingHours;
  photos_sample?: CompanyPhoto[];
  button?: { name?: LocalizedText; type?: string; value?: string };
};

export type CompanyMetro = { name?: string; distance?: CompanyDistance };

export type SocialMedia = Partial<
  Record<'telegram' | 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'whatsApp', string | null>
>;

/** `about.details` — `{ "Service options": { Delivery: true, … }, … }`, keys vary per company. */
export type CompanyAbout = {
  summary?: string | null;
  details?: Record<string, Record<string, boolean> | null>;
};

export type CompanyBanner = { _id?: string; image?: string; imageThumbnail?: string };

/** `GET /delivery/bot/company/:id` — the same shape plus the fields only the card needs. */
export type CompanyDetail = CatalogCompany & {
  photos?: CompanyPhoto[];
  photo_count?: number;
  nearest_metro?: CompanyMetro;
  /** The metro nearest the venue itself, as opposed to `nearest_metro` (nearest to the user). */
  company_nearest_metro?: CompanyMetro;
  instagram_data?: InstagramData;
  is_favorite?: boolean;
  support_number?: string;
  about?: CompanyAbout;
  social_media?: SocialMedia;
  mobile_apps?: { ios?: string | null; android?: string | null };
  email?: string | null;
  /** Google Maps reviews page — the "Google" link under the rating. */
  reviews_link?: string;
  logo_icon_light?: string;
  logo_icon_dark?: string;
  street_address?: string;
  banners?: CompanyBanner[];
  has_menu?: boolean;
  is_self_delivery?: boolean;
  default_delivery_price_inside_tashkent?: number;
  self_delivery_pricing_mode?: 'fixed' | 'per_km';
  self_delivery_price_per_km?: number;
  is_orders_self_service?: boolean;
  requester_name?: string;
  requester_phone_number?: string;
  requester_position?: string;
};

export type InstagramPost = {
  id?: string;
  pk?: string | number;
  image_url?: string;
  video_url?: string;
  is_video?: boolean;
};

export type InstagramStory = {
  id?: string;
  pk?: string | number;
  image_url?: string;
  video_url?: string;
  is_video?: boolean;
  media_type?: number;
  taken_at?: number;
  video_duration?: number;
};

export type InstagramData = {
  username?: string;
  posts?: InstagramPost[];
  stories?: InstagramStory[];
};

/** `GET /delivery/bot/comment/get-by-company/:id` */
export type CompanyComment = {
  _id: string;
  message: string;
  rating: number;
  images?: string[];
  status?: string;
  created_at: number;
  user: {
    telegram_name?: string;
    telegram_profile_photo?: { image?: string } | null;
  };
  replies?: {
    reply_id: string;
    message: string;
    reply_date?: number;
    /** `root` is the TrueGis team, anything else is the venue's owner. */
    reply_from?: string;
  }[];
};

export type ProductDiscount = {
  percent?: number;
  price?: number;
  discounted_price?: number;
} | null;

/** `GET /delivery/bot/product` — a menu item of a partner. */
export type MenuProduct = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  imageThumbnail?: string;
  price?: number;
  currency?: string;
  weight?: number | string;
  unit_measure?: string;
  discount?: ProductDiscount;
  active?: boolean;
  company_id?: string;
  category_id?: string;
  amount?: number;
  similar_products?: MenuProduct[];
};

export type MenuCategory = {
  _id: string;
  name: string;
  image?: string;
  imageThumbnail?: string;
};

export type InfoPersonSchedule = {
  day?: string;
  dayIndex?: number;
  startTime: string;
  endTime: string;
  type?: 'work' | 'break' | 'unavailable';
};

export type PersonaGalleryItem = {
  id: string;
  url: string;
  type?: 'image' | 'video';
  thumbnail?: string | null;
};

export type InfoPromotion = {
  discounted_price: number;
  percent?: number;
  label?: string | null;
};

export type InfoService = {
  _id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  duration?: number | null;
  promotion?: InfoPromotion | null;
  company_id?: string | null;
};

/** `GET /delivery/bot/info-person` — a specialist of a partner. */
export type InfoPerson = {
  _id: string;
  name: string;
  specialty?: string;
  experience?: string | null;
  description?: string | null;
  image?: string | null;
  phone?: string | null;
  address?: string | null;
  location?: { type?: string; coordinates?: [number, number] } | null;
  schedule?: InfoPersonSchedule[];
  price?: number | null;
  priceLabel?: string | null;
  currency?: string;
  telegram_username?: string | null;
  telegram_name?: string | null;
  gallery?: PersonaGalleryItem[];
  instagram?: string | null;
  instagram_data?: Pick<InstagramData, 'stories' | 'username'> | null;
  is_saved?: boolean;
  company?: { _id?: string; name?: string; phone_number?: string | null } | null;
  services?: InfoService[];
};

export type InfoPersonComment = {
  _id: string;
  person_id?: string;
  message: string;
  rating: number;
  images?: string[];
  status?: 'pending' | 'accepted' | 'rejected';
  created_at: number;
  isOwn?: boolean;
  user?: { name?: string; image?: string | null };
  replies?: { reply_id: string; message: string; reply_from?: string; reply_date?: number }[];
};

export type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  isStreaming?: boolean;
  /** Set while the client runs the catalog search the assistant asked for. */
  isSearching?: boolean;
  searchParams?: SearchParams;
  searchResults?: CatalogCompany[];
  /** Follow-up prompts parsed server-side and delivered as a `suggestions` SSE event. */
  suggestions?: string[];
  /** The catalog refused the search because it has no coordinates. */
  needsLocation?: boolean;
  /** The search itself failed — kept apart from "searched, found nothing". */
  searchError?: string;
  hasError?: boolean;
  errorName?: string;
  /** Technical reason, shown under the error so failures are diagnosable. */
  errorDetail?: string;
  /** The prompt that produced this turn — lets the user retry it. */
  sourceText?: string;
  createdAt: number;
};

/** A saved conversation in the history drawer. */
export type ChatSummary = {
  id: string;
  title: string;
  updated_at: number;
  created_at: number;
  is_favorite?: boolean;
  section?: 'today' | 'yesterday' | 'older';
};

export type ChatDetail = ChatSummary & {
  messages: { role: string; content: string }[];
};

/** One entry of the horizontal chip marquee — a medical specialty of this partner. */
export type IndustryType = {
  _id: string;
  label: string;
  icon?: string | null;
};

export type ConversationEntry = { role: 'user' | 'assistant'; content: string };
