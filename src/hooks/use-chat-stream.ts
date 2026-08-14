/**
 * SSE client for `POST /delivery/bot/chat/stream`, ported from the Mini App's `useChatStream`
 * (TrueGisClient/src/hooks/useChatStream.ts).
 *
 * React Native's own fetch buffers the whole body, so this uses `expo/fetch`, which exposes a
 * real `ReadableStream` on iOS and Android — the chunks arrive as the model writes them.
 */
import { fetch as streamingFetch } from 'expo/fetch';
import { useCallback, useEffect, useRef, useState } from 'react';

import { API_URL } from '@/constants/config';
import { authHeaders, refreshSession } from '@/services/api';
import type { ConversationEntry } from '@/types/chat';

const CHAT_STREAM_PATH = '/delivery/bot/chat/stream';

export type ThinkingPhase = 'idle' | 'connecting' | 'classifying' | 'streaming';

/** Which tool the server is running right now (`type: "status"` events). */
export type ToolStatus = { key: string | null; text: string | null };

export type StreamContext = {
  history: ConversationEntry[];
  chatId?: string;
  /** Partner name — the Mini App sends the same value under this legacy key. */
  deliveryFoodType?: string;
  specialPrompt?: string | null;
  lat?: number;
  lon?: number;
  userLanguage?: string;
  userDisplayName?: string;
};

export type StreamCompleteMeta = { suggestions?: string[] };

export class ChatStreamError extends Error {
  constructor(
    message: string,
    readonly errorName: string | null,
    readonly status: number
  ) {
    super(message);
    this.name = 'ChatStreamError';
  }
}

type StreamHandlers = {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string, meta?: StreamCompleteMeta) => void;
  onError?: (error: ChatStreamError | Error) => void;
  onChatId?: (chatId: string) => void;
  /** The server discards what it streamed so far (a tool superseded the draft). */
  onClearText?: () => void;
};

export function useChatStream(handlers: StreamHandlers = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState<ThinkingPhase>('idle');
  const [toolStatus, setToolStatus] = useState<ToolStatus>({ key: null, text: null });

  const abortRef = useRef<AbortController | null>(null);
  // Handlers are read through a ref so `streamMessage` never needs to be recreated.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setThinkingPhase('idle');
    setToolStatus({ key: null, text: null });
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const streamMessage = useCallback(async (message: string, context: StreamContext) => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    setThinkingPhase('connecting');

    const body = JSON.stringify({
      message: message.trim(),
      history: context.history,
      chatId: context.chatId,
      deliveryFoodType: context.deliveryFoodType,
      specialPrompt: context.specialPrompt ?? undefined,
      lat: context.lat,
      lon: context.lon,
      userLanguage: context.userLanguage,
      userDisplayName: context.userDisplayName,
    });

    const send = () =>
      streamingFetch(`${API_URL}${CHAT_STREAM_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...authHeaders(),
        },
        body,
        signal: controller.signal,
      });

    try {
      let response = await send();

      // Same single transparent retry as the REST layer.
      if (response.status === 401 && (await refreshSession()) === 'refreshed') {
        response = await send();
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
          error_full_name?: string;
          error_name?: string;
        };
        throw new ChatStreamError(
          payload.message || `HTTP ${response.status}`,
          payload.error_full_name || payload.error_name || null,
          response.status
        );
      }

      await consumeStream(response, controller, {
        setPhase: setThinkingPhase,
        setStatus: setToolStatus,
        handlers: handlersRef,
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      const failure = error instanceof Error ? error : new Error(String(error));
      // Without this the UI can only say "something went wrong" — log what actually broke.
      console.warn('[chat-stream] failed', {
        message: failure.message,
        errorName: failure instanceof ChatStreamError ? failure.errorName : null,
        status: failure instanceof ChatStreamError ? failure.status : null,
      });
      handlersRef.current.onError?.(failure);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsStreaming(false);
      setThinkingPhase('idle');
      setToolStatus({ key: null, text: null });
    }
  }, []);

  return { streamMessage, abort, isStreaming, thinkingPhase, toolStatus };
}

async function consumeStream(
  response: Awaited<ReturnType<typeof streamingFetch>>,
  controller: AbortController,
  deps: {
    setPhase: (phase: ThinkingPhase) => void;
    setStatus: (status: ToolStatus) => void;
    handlers: { current: StreamHandlers };
  }
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is empty');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let firstChunk = false;
  let suggestions: string[] = [];

  deps.setPhase('classifying');

  const processLine = (line: string) => {
    if (!line.startsWith('data: ')) return;

    const raw = line.slice(6).trim();
    if (!raw || raw === '[DONE]') return;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // malformed chunk — the stream keeps going
    }

    if (typeof parsed.chatId === 'string') {
      deps.handlers.current.onChatId?.(parsed.chatId);
      return;
    }
    if (parsed.type === 'status') {
      deps.setStatus({ key: parsed.key ?? null, text: parsed.text ?? null });
      return;
    }
    if (parsed.type === 'suggestions') {
      suggestions = Array.isArray(parsed.items)
        ? parsed.items.filter((item: unknown): item is string => typeof item === 'string' && !!item.trim())
        : [];
      return;
    }
    if (parsed.type === 'clear_text') {
      fullText = '';
      firstChunk = false;
      deps.setPhase('classifying');
      deps.handlers.current.onClearText?.();
      return;
    }

    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta) {
      if (!firstChunk) {
        firstChunk = true;
        deps.setPhase('streaming');
        deps.setStatus({ key: null, text: null });
      }
      fullText += delta;
      deps.handlers.current.onChunk?.(delta);
    }
  };

  while (!controller.signal.aborted) {
    const { done, value } = await reader.read();
    if (value?.length) buffer += decoder.decode(value, { stream: !done });

    const lines = buffer.split('\n');
    buffer = done ? '' : (lines.pop() ?? '');
    lines.forEach(processLine);

    if (done) break;
  }

  if (controller.signal.aborted) return;

  deps.handlers.current.onComplete?.(
    fullText,
    suggestions.length > 0 ? { suggestions } : undefined
  );
}
