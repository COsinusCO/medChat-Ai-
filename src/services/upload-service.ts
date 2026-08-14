/**
 * Image uploads go to the home-cards service's bucket endpoint — the same `POST /uploads/single`
 * the Mini App's `useUploadToBucketMutation` calls before attaching photos to a review.
 */
import { HOME_API_URL } from '@/constants/config';
import { ApiError, authHeaders } from '@/services/api';

/** The bucket only accepts this fixed set of folders; reviews use `products`, as the web does. */
type BucketFolder = 'advertising' | 'icons' | 'products' | 'user' | 'videos';

type UploadResponse = { success?: boolean; message?: string; data?: { url?: string } };

export type LocalImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

/** Uploads one picked image and returns its public URL. */
export async function uploadImage(
  image: LocalImage,
  folder: BucketFolder = 'products',
  signal?: AbortSignal
): Promise<string> {
  const form = new FormData();

  // React Native's FormData takes the file descriptor itself, not a Blob.
  form.append('image', {
    uri: image.uri,
    name: image.fileName || fileNameFrom(image.uri),
    type: image.mimeType || 'image/jpeg',
  } as unknown as Blob);
  form.append('folder', folder);

  const response = await fetch(`${HOME_API_URL}/uploads/single`, {
    method: 'POST',
    // No `Content-Type`: fetch has to set it itself so the multipart boundary is included.
    headers: { Accept: 'application/json', ...authHeaders() },
    body: form,
    signal,
  });

  const payload = (await response.json().catch(() => ({}))) as UploadResponse;

  if (!response.ok || !payload.data?.url) {
    throw new ApiError(payload.message || 'Upload failed', response.status);
  }

  return payload.data.url;
}

function fileNameFrom(uri: string): string {
  const last = uri.split('/').pop() || 'photo.jpg';
  return last.includes('.') ? last : `${last}.jpg`;
}
