import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";
import { runtimeConfig } from "@/lib/huru/config";

// ── Types ──

export interface CachedResponse {
  body: Record<string, unknown>;
  model: string;
  creditsUsed: number;
  verified: boolean;
  verificationMode: string;
  provider: string;
}

// ── Per-Project Stats ──

interface ProjectCacheStats {
  hits: number;
  misses: number;
  creditsSaved: number;
}

const projectStats = new Map<string, ProjectCacheStats>();

function trackHit(projectId: string, creditsSaved: number): void {
  const s = projectStats.get(projectId) ?? { hits: 0, misses: 0, creditsSaved: 0 };
  s.hits++;
  s.creditsSaved += creditsSaved;
  projectStats.set(projectId, s);
}

function trackMiss(projectId: string): void {
  const s = projectStats.get(projectId) ?? { hits: 0, misses: 0, creditsSaved: 0 };
  s.misses++;
  projectStats.set(projectId, s);
}

// ── Global Stats ──

let totalHits = 0;
let totalMisses = 0;
let totalCreditsSaved = 0;

// ── Store (lazy init — reads config at first access, not import time) ──

let _store: LRUCache<string, CachedResponse> | null = null;

function store(): LRUCache<string, CachedResponse> {
  if (!_store) {
    _store = new LRUCache<string, CachedResponse>({
      max: runtimeConfig.cacheMaxEntries,
      ttl: runtimeConfig.cacheTtlMs,
      updateAgeOnGet: true,
      allowStale: false,
    });
  }
  return _store;
}

// ── Cache Key ──

export function buildCacheKey(
  projectId: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature?: number,
  maxTokens?: number,
): string {
  const canonical = JSON.stringify({
    p: projectId,
    m: model,
    msg: messages.map((m) => ({
      r: m.role,
      c: m.content.trim().replace(/\s+/g, " "),
    })),
    t: temperature ?? null,
    mt: maxTokens ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

// ── Read ──

export function getCachedResponse(
  cacheKey: string,
  projectId: string,
): CachedResponse | null {
  if (!runtimeConfig.cacheEnabled) return null;

  const cached = store().get(cacheKey);
  if (!cached) {
    totalMisses++;
    trackMiss(projectId);
    return null;
  }

  totalHits++;
  totalCreditsSaved += cached.creditsUsed;
  trackHit(projectId, cached.creditsUsed);
  return cached;
}

// ── Write ──

export function setCachedResponse(
  cacheKey: string,
  response: CachedResponse,
): void {
  if (!runtimeConfig.cacheEnabled) return;
  store().set(cacheKey, response);
}

// ── Stream Replay ──

export function replayCachedAsStream(
  cached: CachedResponse,
  requestId: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const metaEvent = { huru: { request_id: requestId } };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(metaEvent)}\n\n`),
      );

      const chunk = {
        id: cached.body.id ?? `chatcmpl-cached-${requestId}`,
        object: "chat.completion.chunk",
        created: cached.body.created ?? Math.floor(Date.now() / 1000),
        model: cached.model,
        choices: [
          {
            index: 0,
            delta: { role: "assistant", content: extractContent(cached.body) },
            finish_reason: "stop",
          },
        ],
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
      );

      const huruMeta = {
        huru: {
          request_id: requestId,
          credits_used: 0,
          verified: cached.verified,
          verification_mode: cached.verificationMode,
          provider: cached.provider,
          cached: true,
        },
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(huruMeta)}\n\n`),
      );

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

// ── SSE Delta Accumulator ──

export class SSEAccumulator {
  private buffer = "";
  private content = "";

  push(bytes: Uint8Array, decoder: TextDecoder): void {
    this.buffer += decoder.decode(bytes, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);

      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

      try {
        const parsed = JSON.parse(line.slice(6));
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string") this.content += delta;
      } catch {
        // skip non-JSON lines
      }
    }
  }

  result(): string {
    return this.content;
  }
}

// ── Bypass Check ──

export function shouldBypassCache(
  cacheControlHeader: string | null,
): boolean {
  if (!cacheControlHeader) return false;
  const lower = cacheControlHeader.toLowerCase();
  return lower.includes("no-cache") || lower.includes("no-store");
}

// ── Stats ──

export function getCacheStats() {
  const s = store();
  const total = totalHits + totalMisses;
  return {
    enabled: runtimeConfig.cacheEnabled,
    size: s.size,
    maxEntries: runtimeConfig.cacheMaxEntries,
    ttlSeconds: runtimeConfig.cacheTtlMs / 1000,
    hits: totalHits,
    misses: totalMisses,
    hitRate: total > 0 ? +(totalHits / total).toFixed(4) : 0,
    creditsSaved: totalCreditsSaved,
  };
}

export function getProjectCacheStats(projectId: string) {
  const s = projectStats.get(projectId);
  if (!s) return { hits: 0, misses: 0, hitRate: 0, creditsSaved: 0 };
  const total = s.hits + s.misses;
  return {
    hits: s.hits,
    misses: s.misses,
    hitRate: total > 0 ? +(s.hits / total).toFixed(4) : 0,
    creditsSaved: s.creditsSaved,
  };
}

// ── Internals ──

function extractContent(body: Record<string, unknown>): string {
  const choices = body.choices as
    | Array<{ message?: { content?: string } }>
    | undefined;
  return choices?.[0]?.message?.content ?? "";
}
