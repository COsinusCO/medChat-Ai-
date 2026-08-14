/**
 * Chat orchestration: stream a reply, strip the tool JSON out of it, and run the catalog search
 * the assistant asks for. Mirrors the Mini App's AIFoodAssistant flow, minus the surfaces we do
 * not ship yet (images, voice, files, marketplace).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_SEARCH_COORDS, PARTNER_FALLBACK_NAME } from '@/constants/config';
import type { Coordinates } from '@/features/location/location-context';
import { useI18n } from '@/i18n';
import { useChatStream, type StreamCompleteMeta } from '@/hooks/use-chat-stream';
import { ApiError } from '@/services/api';
import { searchCompanies } from '@/services/catalog-service';
import { fetchChat } from '@/services/chat-service';
import type { ChatMessage, ConversationEntry } from '@/types/chat';
import { extractSearchParams, toDisplayText, toStreamingText } from '@/utils/ai-text';

const MAX_CLIENT_HISTORY = 30;

/**
 * A failed search is not an empty one: missing coordinates asks for permission, anything else
 * reports what actually broke instead of a silent "nothing found".
 */
function describeSearchFailure(error: unknown): Partial<ChatMessage> {
  if (error instanceof ApiError && error.errorName === 'LOCATION_REQUIRED') {
    return { needsLocation: true, searchResults: undefined };
  }

  const detail =
    error instanceof ApiError
      ? [error.errorName, `HTTP ${error.status}`, error.message].filter(Boolean).join(' · ')
      : error instanceof Error
        ? error.message
        : String(error);

  console.warn('[catalog-search] failed', detail);
  return { searchError: detail, searchResults: undefined };
}

export type UseChatOptions = {
  partnerName?: string | null;
  specialPrompt?: string | null;
  userDisplayName?: string | null;
  /** Catalog search needs coordinates; the assistant also ranks results by distance. */
  coords?: Coordinates | null;
};

export function useChat({ partnerName, specialPrompt, userDisplayName, coords }: UseChatOptions) {
  const { language } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  const historyRef = useRef<ConversationEntry[]>([]);
  const streamingIdRef = useRef<string | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const rawTextRef = useRef('');
  // Read through refs so the search callbacks stay stable across position updates.
  const coordsRef = useRef<Coordinates | null>(coords ?? DEFAULT_SEARCH_COORDS);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sendRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    coordsRef.current = coords ?? DEFAULT_SEARCH_COORDS;
    messagesRef.current = messages;
  });

  const pushHistory = useCallback((role: ConversationEntry['role'], content: string) => {
    historyRef.current.push({ role, content });
    if (historyRef.current.length > MAX_CLIENT_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_CLIENT_HISTORY);
    }
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...patch } : message))
    );
  }, []);

  /** Runs the search the model requested and attaches the clinics to its message. */
  const runSearch = useCallback(
    async (messageId: string, rawText: string) => {
      const params = extractSearchParams(rawText);
      if (!params) return;

      patchMessage(messageId, {
        isSearching: true,
        searchParams: params,
        needsLocation: false,
        searchError: undefined,
      });

      try {
        const results = await searchCompanies(params, {
          lat: coordsRef.current?.lat,
          lon: coordsRef.current?.lon,
        });
        patchMessage(messageId, { isSearching: false, searchResults: results });
      } catch (error) {
        patchMessage(messageId, { isSearching: false, ...describeSearchFailure(error) });
      }
    },
    [patchMessage]
  );

  /** Retry after the user granted location. */
  const retrySearch = useCallback(
    (messageId: string) => {
      const message = messagesRef.current.find((item) => item.id === messageId);
      if (!message?.searchParams) return;

      patchMessage(messageId, { isSearching: true, needsLocation: false });

      searchCompanies(message.searchParams, {
        lat: coordsRef.current?.lat,
        lon: coordsRef.current?.lon,
      })
        .then((results) => patchMessage(messageId, { isSearching: false, searchResults: results }))
        .catch((error) =>
          patchMessage(messageId, { isSearching: false, ...describeSearchFailure(error) })
        );
    },
    [patchMessage]
  );

  const handleChunk = useCallback(
    (chunk: string) => {
      const id = streamingIdRef.current;
      if (!id) return;

      rawTextRef.current += chunk;
      patchMessage(id, { text: toStreamingText(rawTextRef.current), isStreaming: true });
    },
    [patchMessage]
  );

  const handleComplete = useCallback(
    (fullText: string, meta?: StreamCompleteMeta) => {
      const id = streamingIdRef.current;
      streamingIdRef.current = null;
      if (!id) return;

      const displayText = toDisplayText(fullText);
      patchMessage(id, {
        text: displayText,
        isStreaming: false,
        suggestions: meta?.suggestions,
      });
      pushHistory('assistant', displayText);
      runSearch(id, fullText);
    },
    [patchMessage, pushHistory, runSearch]
  );

  const handleError = useCallback(
    (error: Error & { errorName?: string | null; status?: number }) => {
      const id = streamingIdRef.current;
      streamingIdRef.current = null;
      if (!id) return;

      const detail = [error.errorName, error.status ? `HTTP ${error.status}` : null, error.message]
        .filter(Boolean)
        .join(' · ');

      patchMessage(id, {
        isStreaming: false,
        hasError: true,
        errorName: error.errorName ?? undefined,
        errorDetail: detail || undefined,
      });
    },
    [patchMessage]
  );

  const handleChatId = useCallback((incoming: string) => {
    if (chatIdRef.current) return;
    chatIdRef.current = incoming;
    setChatId(incoming);
  }, []);

  const handleClearText = useCallback(() => {
    rawTextRef.current = '';
    const id = streamingIdRef.current;
    if (id) patchMessage(id, { text: '' });
  }, [patchMessage]);

  const { streamMessage, abort, isStreaming, thinkingPhase, toolStatus } = useChatStream({
    onChunk: handleChunk,
    onComplete: handleComplete,
    onError: handleError,
    onChatId: handleChatId,
    onClearText: handleClearText,
  });

  const send = useCallback(
    async (rawInput: string) => {
      const text = rawInput.trim();
      if (!text || isStreaming) return;

      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        text,
        isUser: true,
        createdAt: Date.now(),
      };
      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        text: '',
        isUser: false,
        isStreaming: true,
        createdAt: Date.now(),
        sourceText: text,
      };

      setMessages((current) => [...current, userMessage, assistantMessage]);
      pushHistory('user', text);
      streamingIdRef.current = assistantMessage.id;
      rawTextRef.current = '';

      await streamMessage(text, {
        // The last entry is the message we are sending — the server appends it itself.
        history: historyRef.current.slice(0, -1),
        chatId: chatIdRef.current ?? undefined,
        deliveryFoodType: partnerName ?? PARTNER_FALLBACK_NAME,
        specialPrompt,
        lat: coordsRef.current?.lat,
        lon: coordsRef.current?.lon,
        userLanguage: language.slice(0, 2),
        userDisplayName: userDisplayName ?? undefined,
      });
    },
    [isStreaming, language, partnerName, pushHistory, specialPrompt, streamMessage, userDisplayName]
  );

  /** Re-send the prompt behind a failed turn, dropping the failed message first. */
  const retrySend = useCallback(
    (messageId: string) => {
      const message = messagesRef.current.find((item) => item.id === messageId);
      const text = message?.sourceText;
      if (!text) return;

      setMessages((current) => current.filter((item) => item.id !== messageId));
      // The failed turn never made it into the history, so just send it again.
      sendRef.current?.(text);
    },
    []
  );

  useEffect(() => {
    sendRef.current = send;
  });

  const startNewChat = useCallback(() => {
    abort();
    streamingIdRef.current = null;
    rawTextRef.current = '';
    historyRef.current = [];
    chatIdRef.current = null;
    setChatId(null);
    setIsFavorite(false);
    setMessages([]);
  }, [abort]);

  /** Opens a saved conversation from the history drawer. */
  const openChat = useCallback(
    async (id: string) => {
      abort();
      setIsLoadingChat(true);

      try {
        const chat = await fetchChat(id);
        const restored: ChatMessage[] = [];
        historyRef.current = [];

        chat.messages
          .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
          .forEach((entry, index) => {
            const isUser = entry.role === 'user';
            const text = isUser ? entry.content : toDisplayText(entry.content);
            restored.push({
              id: `${id}-${index}`,
              text,
              isUser,
              createdAt: chat.created_at,
            });
            pushHistory(isUser ? 'user' : 'assistant', text);
          });

        streamingIdRef.current = null;
        rawTextRef.current = '';
        chatIdRef.current = chat.id;
        setChatId(chat.id);
        setIsFavorite(!!chat.is_favorite);
        setMessages(restored);
      } finally {
        setIsLoadingChat(false);
      }
    },
    [abort, pushHistory]
  );

  return {
    messages,
    chatId,
    isFavorite,
    setIsFavorite,
    isLoadingChat,
    isStreaming,
    thinkingPhase,
    toolStatus,
    send,
    retrySend,
    abort,
    startNewChat,
    openChat,
    retrySearch,
  };
}
