/**
 * Parsing of the assistant's raw stream, ported from the Mini App
 * (TrueGisClient/src/components/Catalog/AIFoodAssistant/utils/textProcessing.ts).
 *
 * The model appends a JSON block when it wants the client to run a catalog search; we pull that
 * out and strip it (plus any prompt leakage) before rendering the text.
 */

export type SearchEntities = {
  specialization?: string;
  name?: string;
};

export type SearchFilters = {
  type?: string[];
};

export type SearchParams = {
  query: string;
  lat?: number;
  lon?: number;
  location?: string;
  filters?: SearchFilters;
  entities?: SearchEntities;
  /** Serialized `{ entities, filters }` for the `search_filters` query param. */
  search_filters?: string;
};

/** Last balanced `{...}` that carries the search markers. */
function findSearchJsonBounds(text: string): { start: number; end: number } | null {
  const anchor = Math.max(text.lastIndexOf('"searchQuery"'), text.lastIndexOf('"searchType"'));
  if (anchor < 0) return null;

  const start = text.lastIndexOf('{', anchor);
  if (start < 0) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start, end: i };
    }
  }
  return null;
}

function normalizeFilters(value: unknown): SearchFilters | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = (value as { type?: unknown }).type;
  if (!Array.isArray(raw)) return undefined;

  const type = raw
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().toLowerCase());

  return type.length > 0 ? { type } : undefined;
}

function normalizeEntities(value: unknown): SearchEntities | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;
  const entities: SearchEntities = {};

  if (typeof raw.specialization === 'string' && raw.specialization.trim()) {
    entities.specialization = raw.specialization.trim();
  }
  if (typeof raw.name === 'string' && raw.name.trim()) {
    entities.name = raw.name.trim();
  }

  return Object.keys(entities).length > 0 ? entities : undefined;
}

function serializeSearchFilters(params: SearchParams): string | undefined {
  const hasEntities = !!params.entities && Object.keys(params.entities).length > 0;
  const hasFilters = !!params.filters?.type?.length;
  if (!hasEntities && !hasFilters) return undefined;

  return JSON.stringify({ entities: params.entities ?? {}, filters: params.filters ?? {} });
}

export function extractSearchParams(text: string): SearchParams | null {
  const bounds = findSearchJsonBounds(text);
  if (!bounds) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.slice(bounds.start, bounds.end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }

  // Marketplace searches belong to the super app, not to a clinic assistant.
  if (parsed.searchType === 'listings') return null;

  const query = String(parsed.searchQuery ?? '').trim();
  if (!query) return null;

  const filters = normalizeFilters(parsed.filters);
  const entities = normalizeEntities(parsed.entities);
  const params: SearchParams = {
    query,
    ...(filters ? { filters } : null),
    ...(entities ? { entities } : null),
  };

  if (parsed.lat !== undefined && parsed.lon !== undefined) {
    const lat = parseFloat(String(parsed.lat));
    const lon = parseFloat(String(parsed.lon));
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
      params.lat = lat;
      params.lon = lon;
    }
  }
  if (typeof parsed.location === 'string' && parsed.location.trim()) {
    params.location = parsed.location.trim();
  }

  const searchFilters = serializeSearchFilters(params);
  if (searchFilters) params.search_filters = searchFilters;

  return params;
}

/** Drops system prompt fragments the model sometimes echoes back. */
export function removeInternalPromptLeak(text: string): string {
  if (!text) return text;

  return text
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/gi, '')
    .replace(/\[INTERNAL TASK[^\n]*\]\s*/gi, '')
    .trim();
}

/** Text as it should be shown: no search block, no trailing tool JSON. */
export function toDisplayText(text: string): string {
  let cleaned = removeInternalPromptLeak(text);

  const bounds = findSearchJsonBounds(cleaned);
  if (bounds) {
    cleaned = (
      cleaned.slice(0, bounds.start).trimEnd() + cleaned.slice(bounds.end + 1).replace(/^\s*/, '')
    ).trim();
  }

  return cleaned
    .replace(/\{[^}]*"suggestions"\s*:\s*\[[^\]]*\][^}]*\}\s*$/, '')
    .replace(/\{[^}]*"searchQuery"\s*:\s*"[^"]*"[^}]*\}\s*$/, '')
    .replace(/\{[^{}]*"imagePrompt"\s*:\s*"[^"]*"[^{}]*\}\s*$/, '')
    .trim();
}

/**
 * While streaming, the JSON block must never flash on screen — hide anything from the first
 * brace that looks like the start of a tool block.
 */
export function toStreamingText(text: string): string {
  const cleaned = removeInternalPromptLeak(text);
  const anchor = cleaned.search(/\{\s*"(searchQuery|searchType|suggestions|imagePrompt)"/);

  return (anchor >= 0 ? cleaned.slice(0, anchor) : cleaned).trimEnd();
}
