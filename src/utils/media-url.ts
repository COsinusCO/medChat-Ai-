import { API_HOST } from '@/constants/config';

const GOOGLE_IMG_HOST = /(googleusercontent|ggpht)\.com/i;

/** A stored reference is a path only if it has a directory separator or a file extension. */
const PATH_LIKE = /[/\\]|\.[a-z0-9]{2,5}$/i;

/**
 * Same Google Places sizing the Mini App applies (`googlePhotoUrl.ts`). Unsized
 * `lh3.googleusercontent.com` URLs often 403 or arrive as a 4000px original.
 */
export function sizeGooglePhotoUrl(url: string, spec = 'w320'): string {
  if (!url || !GOOGLE_IMG_HOST.test(url)) return url;
  const base = url.replace(/=[-\w]+$/, '');
  return `${base}=${spec}`;
}

/**
 * Mini App `getValidatedUrl`: relative catalog paths live on the gateway host, not on the
 * device. Without this prefix search cards and the company hero get an unusable URI.
 */
export function mediaUrl(url?: string | null, spec = 'w320'): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  let absolute = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    // Opaque handles (a Telegram `file_id`, say) are not paths. Prefixing the host would only
    // produce a 404, and Android's okhttp throws outright on a schemeless URL — report "no media"
    // so callers fall back to their placeholder.
    if (!PATH_LIKE.test(trimmed)) return '';

    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    absolute = `${API_HOST}${path}`;
  } else if (trimmed.startsWith('http://')) {
    absolute = `https://${trimmed.slice(7)}`;
  }

  return sizeGooglePhotoUrl(absolute, spec);
}
