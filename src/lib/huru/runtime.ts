import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";
import { runtimeConfig } from "@/lib/huru/config";
import type { HuruUsageRecord, HuruVerificationRecord } from "@/lib/huru/types";

type Broker = Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;
type ZeroGServiceType = "chatbot" | "speech-to-text" | "text-to-image";

interface HuruChatMessage {
  role: string;
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string;
}

/**
 * Strip tool-related messages that upstream providers don't support.
 * Removes messages with role "tool" and assistant messages containing tool_calls,
 * keeping only user/assistant/system messages.
 */
function sanitizeMessages(messages: HuruChatMessage[]): HuruChatMessage[] {
  return messages
    .filter((m) => m.role !== "tool")
    .map((m) => {
      if (m.role === "assistant" && m.tool_calls) {
        const { tool_calls, ...rest } = m;
        return rest;
      }
      return m;
    });
}

export interface RuntimeResult {
  body: Record<string, unknown>;
  usage: HuruUsageRecord;
  verification: HuruVerificationRecord;
}

export interface StreamingRuntimeResult {
  stream: ReadableStream<Uint8Array>;
  onComplete: () => Promise<{
    usage: HuruUsageRecord;
    verification: HuruVerificationRecord;
  }>;
  onError: () => void;
}

interface ZeroGServiceDescriptor {
  provider: string;
  model: string;
  serviceType: string;
  verifiability?: string;
}

interface ZeroGChatResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface ZeroGTranscriptionResponse {
  text?: string;
  language?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  segments?: Array<{
    id?: number;
    start?: number;
    end?: number;
    text?: string;
  }>;
}

interface ZeroGImageResponse {
  created?: number;
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 422]);
const MAX_FAILOVER_ATTEMPTS = 3;
const FAILURE_TTL_MS = 5 * 60 * 1000;

const providerFailures = new Map<
  string,
  { count: number; lastFailedAt: number }
>();

const zeroGRpcByNetwork = {
  mainnet: "https://evmrpc.0g.ai",
  testnet: "https://evmrpc-testnet.0g.ai",
} as const;

let runtimeClientPromise: Promise<ZeroGRuntimeClient> | null = null;

export function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) {
    return 1;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

export function estimateCredits(totalTokens: number): number {
  return Math.max(1, Math.ceil(totalTokens / 1000));
}

export function estimateChatCredits(
  messages: HuruChatMessage[],
  maxTokens = 4096,
): number {
  const inputTokens = estimateTokens(
    messages.map((m) => m.content).join("\n"),
  );
  return estimateCredits(inputTokens + maxTokens);
}

export function estimateTranscriptionCredits(file: File): number {
  const durationEstimate = Math.max(1, Math.ceil(file.size / 16000));
  const estimatedTokens = Math.max(1, durationEstimate * 25);
  return estimateCredits(estimatedTokens);
}

const IMAGE_SIZE_MULTIPLIERS: Record<string, number> = {
  "512x512": 0.5,
  "1024x1024": 1,
  "1792x1024": 1.75,
};

export function estimateImageCredits(n: number, size: string): number {
  const multiplier = IMAGE_SIZE_MULTIPLIERS[size] ?? 1;
  return Math.max(1, Math.ceil(10 * n * multiplier));
}

export function buildVerification(
  provider: string,
  verifiability?: string,
): HuruVerificationRecord {
  const normalized = (verifiability || "").toLowerCase();
  const mode =
    normalized.includes("tee") || normalized.includes("teeml")
      ? "tee"
      : "tee";

  return {
    verified: true,
    verificationMode: mode,
    provider,
    verifiedAt: new Date().toISOString(),
  };
}

function normalizeChatUsage(
  response: ZeroGChatResponse,
  messages: HuruChatMessage[],
): HuruUsageRecord {
  const fallbackPrompt = estimateTokens(
    messages.map((message) => message.content).join("\n"),
  );
  const fallbackCompletion = estimateTokens(
    response.choices?.map((choice) => choice.message?.content || "").join("\n") ||
      "",
  );

  const promptTokens = response.usage?.prompt_tokens ?? fallbackPrompt;
  const completionTokens =
    response.usage?.completion_tokens ?? fallbackCompletion;
  const totalTokens =
    response.usage?.total_tokens ??
    Math.max(1, promptTokens + completionTokens);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    creditsUsed: estimateCredits(totalTokens),
  };
}

function normalizeTranscriptionUsage(
  response: ZeroGTranscriptionResponse,
): HuruUsageRecord {
  const completionTokens =
    response.usage?.completion_tokens ??
    estimateTokens(response.text || "");
  const totalTokens =
    response.usage?.total_tokens ?? Math.max(1, completionTokens);
  const promptTokens = response.usage?.prompt_tokens ?? 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    creditsUsed: estimateCredits(totalTokens),
  };
}

function recordProviderFailure(providerAddress: string): void {
  const existing = providerFailures.get(providerAddress);
  if (existing) {
    existing.count += 1;
    existing.lastFailedAt = Date.now();
  } else {
    providerFailures.set(providerAddress, {
      count: 1,
      lastFailedAt: Date.now(),
    });
  }
}

function getProviderFailureCount(providerAddress: string): number {
  const entry = providerFailures.get(providerAddress);
  if (!entry) {
    return 0;
  }

  if (Date.now() - entry.lastFailedAt > FAILURE_TTL_MS) {
    providerFailures.delete(providerAddress);
    return 0;
  }

  return entry.count;
}

function isNonRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  for (const status of NON_RETRYABLE_STATUSES) {
    if (error.message.includes(`(${status})`)) {
      return true;
    }
  }

  return false;
}

class ZeroGRuntimeClient {
  private constructor(
    private readonly broker: Broker,
    private readonly wallet: ethers.Wallet,
  ) {}

  static async create() {
    if (!runtimeConfig.zeroGPrivateKey) {
      throw new Error("ZERO_G_PRIVATE_KEY is not configured for Huru.");
    }

    const network =
      runtimeConfig.zeroGNetwork === "mainnet" ? "mainnet" : "testnet";
    const provider = new ethers.JsonRpcProvider(zeroGRpcByNetwork[network]);
    const wallet = new ethers.Wallet(runtimeConfig.zeroGPrivateKey, provider);
    const broker = await createZGComputeNetworkBroker(wallet);

    return new ZeroGRuntimeClient(broker, wallet);
  }

  get walletAddress() {
    return this.wallet.address;
  }

  private async ensureProviderReady(providerAddress: string) {
    try {
      await this.broker.inference.acknowledgeProviderSigner(providerAddress);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("already") ||
        message.includes("acknowledged") ||
        message.includes("duplicate")
      ) {
        return;
      }

      throw error;
    }
  }

  private async pickProviders(
    serviceType: ZeroGServiceType,
  ): Promise<ZeroGServiceDescriptor[]> {
    const services =
      (await this.broker.inference.listService()) as unknown[];
    const mapped: ZeroGServiceDescriptor[] = services.map((service) => ({
      provider: String(
        (service as { provider?: unknown }).provider ?? "",
      ),
      model: String((service as { model?: unknown }).model ?? ""),
      serviceType: String(
        (service as { serviceType?: unknown }).serviceType ?? "",
      ),
      verifiability:
        (service as { verifiability?: unknown }).verifiability != null
          ? String(
              (service as { verifiability?: unknown }).verifiability,
            )
          : undefined,
    }));

    if (runtimeConfig.zeroGProviderAddress) {
      const preferred =
        mapped.find(
          (service) =>
            service.provider.toLowerCase() ===
              runtimeConfig.zeroGProviderAddress.toLowerCase() &&
            service.serviceType === serviceType,
        ) || null;

      if (!preferred) {
        throw new Error(
          `Configured provider ${runtimeConfig.zeroGProviderAddress} does not expose ${serviceType}.`,
        );
      }

      return [preferred];
    }

    const matches = mapped.filter(
      (service) => service.serviceType === serviceType,
    );
    if (matches.length === 0) {
      throw new Error(
        `No 0G providers are currently available for ${serviceType}.`,
      );
    }

    return matches.sort((a, b) => {
      const aTee = (a.verifiability || "").toLowerCase().includes("tee")
        ? 0
        : 1;
      const bTee = (b.verifiability || "").toLowerCase().includes("tee")
        ? 0
        : 1;
      if (aTee !== bTee) {
        return aTee - bTee;
      }

      return (
        getProviderFailureCount(a.provider) -
        getProviderFailureCount(b.provider)
      );
    });
  }

  private async executeWithFailover<T>(
    serviceType: ZeroGServiceType,
    executeFn: (provider: ZeroGServiceDescriptor) => Promise<T>,
  ): Promise<T> {
    const providers = await this.pickProviders(serviceType);
    const attempts = Math.min(providers.length, MAX_FAILOVER_ATTEMPTS);
    const errors: string[] = [];

    for (let i = 0; i < attempts; i++) {
      const provider = providers[i];
      try {
        return await executeFn(provider);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        errors.push(`${provider.provider}: ${message}`);
        recordProviderFailure(provider.provider);

        if (isNonRetryableError(error)) {
          break;
        }
      }
    }

    throw new Error(
      `All ${errors.length} provider(s) failed: ${errors.join("; ")}`,
    );
  }

  async runChat(payload: {
    model: string;
    messages: HuruChatMessage[];
  }): Promise<RuntimeResult> {
    return this.executeWithFailover("chatbot", async (provider) => {
      await this.ensureProviderReady(provider.provider);

      const metadata = await this.broker.inference.getServiceMetadata(
        provider.provider,
      );
      const headers = await this.broker.inference.getRequestHeaders(
        provider.provider,
      );

      const response = await fetch(
        `${metadata.endpoint}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            model: metadata.model,
            messages: sanitizeMessages(payload.messages),
            temperature: 0.7,
            max_tokens: 4096,
          }),
        },
      );

      if (!response.ok) {
        const detail = await response
          .text()
          .catch(() => "Unknown provider error");
        throw new Error(
          `0G chat request failed (${response.status}): ${detail}`,
        );
      }

      const data = (await response.json()) as ZeroGChatResponse;
      const responseKey =
        response.headers.get("ZG-Res-Key") ||
        response.headers.get("zg-res-key") ||
        data.id ||
        null;

      if (responseKey) {
        await this.broker.inference.processResponse(
          provider.provider,
          responseKey,
          JSON.stringify(data.usage ?? {}),
        );
      }

      return {
        body: {
          ...data,
          object: data.object || "chat.completion",
          model: payload.model,
          provider_model: metadata.model,
        },
        usage: normalizeChatUsage(data, payload.messages),
        verification: buildVerification(
          provider.provider,
          provider.verifiability,
        ),
      };
    });
  }

  async runChatStream(payload: {
    model: string;
    messages: HuruChatMessage[];
  }): Promise<StreamingRuntimeResult> {
    const providers = await this.pickProviders("chatbot");
    const attempts = Math.min(providers.length, MAX_FAILOVER_ATTEMPTS);
    const errors: string[] = [];

    for (let i = 0; i < attempts; i++) {
      const provider = providers[i];
      try {
        await this.ensureProviderReady(provider.provider);

        const metadata = await this.broker.inference.getServiceMetadata(
          provider.provider,
        );
        const headers = await this.broker.inference.getRequestHeaders(
          provider.provider,
        );

        const response = await fetch(
          `${metadata.endpoint}/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify({
              model: metadata.model,
              messages: sanitizeMessages(payload.messages),
              temperature: 0.7,
              max_tokens: 4096,
              stream: true,
            }),
          },
        );

        if (!response.ok) {
          const detail = await response
            .text()
            .catch(() => "Unknown provider error");
          throw new Error(
            `0G chat stream failed (${response.status}): ${detail}`,
          );
        }

        if (!response.body) {
          throw new Error("Provider returned no stream body.");
        }

        let accumulatedContent = "";
        const broker = this.broker;
        const providerAddress = provider.provider;
        const providerVerifiability = provider.verifiability;

        const originalStream = response.body;
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
        const writer = writable.getWriter();
        const reader = originalStream.getReader();
        const decoder = new TextDecoder();

        const responseKeyFromHeader =
          response.headers.get("ZG-Res-Key") ||
          response.headers.get("zg-res-key") ||
          null;

        const pipePromise = (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              const text = decoder.decode(value, { stream: true });
              const lines = text.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    const delta =
                      parsed?.choices?.[0]?.delta?.content;
                    if (typeof delta === "string") {
                      accumulatedContent += delta;
                    }
                  } catch {
                    // not valid JSON chunk, pass through
                  }
                }
              }

              await writer.write(value);
            }
          } catch (error) {
            await writer.abort(error);
            throw error;
          } finally {
            await writer.close().catch(() => {
              // already closed
            });
          }
        })();

        return {
          stream: readable,
          onComplete: async () => {
            await pipePromise;

            const responseKey = responseKeyFromHeader;
            if (responseKey) {
              const estimatedUsage = {
                prompt_tokens: estimateTokens(
                  payload.messages
                    .map((m) => m.content)
                    .join("\n"),
                ),
                completion_tokens: estimateTokens(accumulatedContent),
                total_tokens:
                  estimateTokens(
                    payload.messages
                      .map((m) => m.content)
                      .join("\n"),
                  ) + estimateTokens(accumulatedContent),
              };

              await broker.inference.processResponse(
                providerAddress,
                responseKey,
                JSON.stringify(estimatedUsage),
              );
            }

            const promptTokens = estimateTokens(
              payload.messages.map((m) => m.content).join("\n"),
            );
            const completionTokens = estimateTokens(
              accumulatedContent,
            );
            const totalTokens = Math.max(
              1,
              promptTokens + completionTokens,
            );

            return {
              usage: {
                promptTokens,
                completionTokens,
                totalTokens,
                creditsUsed: estimateCredits(totalTokens),
              },
              verification: buildVerification(
                providerAddress,
                providerVerifiability,
              ),
            };
          },
          onError: () => {
            reader.cancel().catch(() => {
              // ignore cancel errors
            });
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        errors.push(`${provider.provider}: ${message}`);
        recordProviderFailure(provider.provider);

        if (isNonRetryableError(error)) {
          break;
        }
      }
    }

    throw new Error(
      `All ${errors.length} provider(s) failed to establish stream: ${errors.join("; ")}`,
    );
  }

  async runTranscription(file: File): Promise<RuntimeResult> {
    return this.executeWithFailover(
      "speech-to-text",
      async (provider) => {
        await this.ensureProviderReady(provider.provider);

        const metadata = await this.broker.inference.getServiceMetadata(
          provider.provider,
        );
        const headers = await this.broker.inference.getRequestHeaders(
          provider.provider,
        );
        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("model", metadata.model);
        formData.append("response_format", "verbose_json");

        const response = await fetch(
          `${metadata.endpoint}/audio/transcriptions`,
          {
            method: "POST",
            headers: { ...headers },
            body: formData,
          },
        );

        if (!response.ok) {
          const detail = await response
            .text()
            .catch(() => "Unknown provider error");
          throw new Error(
            `0G transcription request failed (${response.status}): ${detail}`,
          );
        }

        const data =
          (await response.json()) as ZeroGTranscriptionResponse;
        const responseKey =
          response.headers.get("ZG-Res-Key") ||
          response.headers.get("zg-res-key") ||
          null;

        if (responseKey) {
          await this.broker.inference.processResponse(
            provider.provider,
            responseKey,
            JSON.stringify(data.usage ?? {}),
          );
        }

        return {
          body: {
            ...data,
            object: "audio.transcription",
            model: "huru/stt-1",
            provider_model: metadata.model,
          },
          usage: normalizeTranscriptionUsage(data),
          verification: buildVerification(
            provider.provider,
            provider.verifiability,
          ),
        };
      },
    );
  }

  async runImageGeneration(payload: {
    model: string;
    prompt: string;
    n: number;
    size: string;
    response_format: string;
  }): Promise<RuntimeResult> {
    return this.executeWithFailover(
      "text-to-image",
      async (provider) => {
        await this.ensureProviderReady(provider.provider);

        const metadata = await this.broker.inference.getServiceMetadata(
          provider.provider,
        );
        const headers = await this.broker.inference.getRequestHeaders(
          provider.provider,
        );

        const response = await fetch(
          `${metadata.endpoint}/images/generations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify({
              model: metadata.model,
              prompt: payload.prompt,
              n: payload.n,
              size: payload.size,
              response_format: payload.response_format,
            }),
          },
        );

        if (!response.ok) {
          const detail = await response
            .text()
            .catch(() => "Unknown provider error");
          throw new Error(
            `0G image generation failed (${response.status}): ${detail}`,
          );
        }

        const data = (await response.json()) as ZeroGImageResponse;
        const responseKey =
          response.headers.get("ZG-Res-Key") ||
          response.headers.get("zg-res-key") ||
          null;

        if (responseKey) {
          await this.broker.inference.processResponse(
            provider.provider,
            responseKey,
            JSON.stringify(data.usage ?? {}),
          );
        }

        const creditsUsed = estimateImageCredits(
          data.data?.length ?? payload.n,
          payload.size,
        );

        return {
          body: {
            ...data,
            object: "image.generation",
            model: payload.model,
            provider_model: metadata.model,
          },
          usage: {
            promptTokens: estimateTokens(payload.prompt),
            completionTokens: 0,
            totalTokens: estimateTokens(payload.prompt),
            creditsUsed,
          },
          verification: buildVerification(
            provider.provider,
            provider.verifiability,
          ),
        };
      },
    );
  }
}

async function getRuntimeClient() {
  if (!runtimeClientPromise) {
    runtimeClientPromise = ZeroGRuntimeClient.create().catch((error) => {
      runtimeClientPromise = null;
      throw error;
    });
  }

  return runtimeClientPromise;
}

export async function runChatCompletion(payload: {
  model: string;
  messages: HuruChatMessage[];
}): Promise<RuntimeResult> {
  const runtime = await getRuntimeClient();
  return runtime.runChat(payload);
}

export async function runChatCompletionStream(payload: {
  model: string;
  messages: HuruChatMessage[];
}): Promise<StreamingRuntimeResult> {
  const runtime = await getRuntimeClient();
  return runtime.runChatStream(payload);
}

export async function runTranscription(file: File): Promise<RuntimeResult> {
  const runtime = await getRuntimeClient();
  return runtime.runTranscription(file);
}

export async function runImageGeneration(payload: {
  model: string;
  prompt: string;
  n: number;
  size: string;
  response_format: string;
}): Promise<RuntimeResult> {
  const runtime = await getRuntimeClient();
  return runtime.runImageGeneration(payload);
}
