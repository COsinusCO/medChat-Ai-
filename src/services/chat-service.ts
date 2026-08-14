/**
 * Saved AI conversations — the same `/delivery/bot/chat` endpoints the Mini App's sidebar uses.
 */
import { request } from '@/services/api';
import type { ChatDetail, ChatSummary } from '@/types/chat';

export async function fetchChats(signal?: AbortSignal): Promise<ChatSummary[]> {
  return (await request<ChatSummary[]>('/delivery/bot/chat', { signal })) ?? [];
}

export async function fetchChat(chatId: string, signal?: AbortSignal): Promise<ChatDetail> {
  return request<ChatDetail>(`/delivery/bot/chat/${chatId}`, { signal });
}

export async function setChatFavorite(chatId: string, isFavorite: boolean): Promise<void> {
  await request(`/delivery/bot/chat/${chatId}/favorite`, {
    method: 'PUT',
    body: { is_favorite: isFavorite },
  });
}

export async function deleteChat(chatId: string): Promise<void> {
  await request(`/delivery/bot/chat/${chatId}`, { method: 'DELETE' });
}
