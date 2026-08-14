/**
 * Photo assembly for the company window, ported from the Mini App's
 * `app/utils/mergeCompanyPhotos.ts`: gallery first, then the cached Google/business photos, and
 * the logo only if the venue has almost nothing.
 */
import type { CompanyPhoto } from '@/types/chat';

const MIN_PHOTOS = 4;

export type PhotoFallback = {
  logo?: string | null;
  logoThumbnail?: string | null;
  image?: string | null;
  imageThumbnail?: string | null;
};

function photoKey(photo: CompanyPhoto): string | null {
  return photo.photo_id || photo.photo_url || photo.photo_url_large || null;
}

function appendUnique(merged: CompanyPhoto[], seen: Set<string>, list?: CompanyPhoto[] | null) {
  for (const photo of list ?? []) {
    if (!photo) continue;
    const key = photoKey(photo);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(photo);
  }
}

export function mergeCompanyPhotos(
  photosSample?: CompanyPhoto[] | null,
  photos?: CompanyPhoto[] | null,
  fallback?: PhotoFallback
): CompanyPhoto[] {
  const merged: CompanyPhoto[] = [];
  const seen = new Set<string>();

  appendUnique(merged, seen, photosSample);
  appendUnique(merged, seen, photos);

  if (merged.length < MIN_PHOTOS) {
    const url = [fallback?.image, fallback?.logo, fallback?.logoThumbnail, fallback?.imageThumbnail]
      .filter(Boolean)
      .at(0) as string | undefined;

    if (url) {
      appendUnique(merged, seen, [
        { photo_id: `company-fallback-${url}`, photo_url: url, photo_url_large: url },
      ]);
    }
  }

  return merged;
}

/** The largest URL a photo entry offers. */
export function photoUrl(photo: CompanyPhoto): string | undefined {
  return photo.photo_url_large || photo.photo_url;
}

/** Relative time in the Mini App's wording (`useTimeAgo`). */
export function timeAgo(
  timestamp: number | undefined,
  t: (key: 'daysAgo' | 'hoursAgo' | 'minutesAgo' | 'lessThanMinute', vars?: Record<string, string | number>) => string
): string {
  if (!timestamp) return '';

  const diffMinutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return t('daysAgo', { count: diffDays });
  if (diffHours > 0) return t('hoursAgo', { count: diffHours });
  if (diffMinutes > 0) return t('minutesAgo', { count: diffMinutes });
  return t('lessThanMinute');
}
