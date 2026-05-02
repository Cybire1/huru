import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorWithBody, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getBearerToken, getConsumerEmail, getConsumerName, getIdempotencyKey, makeRequestId } from "@/lib/huru/http";
import { createQuickCheckoutUrl } from "@/lib/huru/paystack";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { estimateTranscriptionCredits, runTranscription } from "@/lib/huru/runtime";
import {
  IdempotencyConflictError,
  authenticateProject,
  checkIdempotencyKey,
  failRequest,
  finalizeRequest,
  preReserveConsumerCredits,
  preReserveCredits,
  releaseConsumerReservedCredits,
  releaseReservedCredits,
  resolveConsumer,
  saveRequest,
  settleConsumerCredits,
  settleCredits,
} from "@/lib/huru/store";
import type { HuruConsumerRecord } from "@/lib/huru/types";

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  const project = await authenticateProject(token);
  if (!project) {
    return jsonError(401, "authentication_error", "invalid_api_key", "Invalid API key.");
  }

  const rateLimit = checkRateLimit(project.publicId);
  if (!rateLimit.allowed) {
    return jsonErrorWithHeaders(
      429,
      "rate_limit_error",
      "rate_limit_exceeded",
      "Rate limit exceeded. Please retry later.",
      rateLimit.headers,
    );
  }

  const idempotencyKey = getIdempotencyKey(request);
  if (idempotencyKey) {
    const existing = await checkIdempotencyKey(project, idempotencyKey);
    if (existing) {
      if (existing.status === "completed") {
        const body = existing.record.responseBody ?? {};
        return NextResponse.json(
          {
            ...body,
            huru: {
              request_id: existing.record.id,
              credits_used: existing.record.usage?.creditsUsed ?? 0,
              verified: existing.record.verification?.verified ?? false,
              verification_mode: existing.record.verification?.verificationMode ?? "unknown",
              provider: existing.record.verification?.provider ?? "unknown",
              idempotent_replay: true,
            },
          },
          { headers: { "x-request-id": existing.record.id, ...rateLimit.headers } },
        );
      }
      if (existing.status === "processing") {
        return jsonErrorWithHeaders(
          409,
          "invalid_request",
          "request_in_progress",
          "A request with this idempotency key is already being processed.",
          rateLimit.headers,
        );
      }
    }
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const model = formData?.get("model");

  if (!(file instanceof File)) {
    return jsonError(400, "invalid_request", "missing_file", "A file upload is required.");
  }

  if (model !== "huru/stt-1") {
    return jsonError(400, "invalid_request", "unsupported_model", "Unsupported model.");
  }

  const consumerEmail = getConsumerEmail(request);
  let consumer: HuruConsumerRecord | null = null;

  if (consumerEmail) {
    const consumerName = getConsumerName(request);
    consumer = await resolveConsumer(project, consumerEmail, consumerName ?? undefined);
  }

  const requestId = makeRequestId();
  const estimatedCredits = estimateTranscriptionCredits(file);

  if (consumer) {
    if (!(await preReserveConsumerCredits(consumer, estimatedCredits, requestId))) {
      const checkoutUrl = await createQuickCheckoutUrl(project, consumer).catch(() => "");
      return jsonErrorWithBody(
        402,
        "billing_error",
        "insufficient_credits",
        "Consumer does not have enough credits.",
        checkoutUrl ? { checkout_url: checkoutUrl } : {},
      );
    }
  } else {
    if (!(await preReserveCredits(project, estimatedCredits, requestId))) {
      return jsonError(
        402,
        "billing_error",
        "insufficient_credits",
        "Your project does not have enough credits.",
      );
    }
  }

  try {
    await saveRequest(project, {
      id: requestId,
      projectId: project.publicId,
      endpoint: "/v1/audio/transcriptions",
      method: "POST",
      model: "huru/stt-1",
      status: "processing",
      createdAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey ?? undefined,
      creditsReserved: estimatedCredits,
      consumerId: consumer?.id,
      consumerEmail: consumer?.email,
    });
  } catch (error) {
    if (consumer) {
      await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
    } else {
      await releaseReservedCredits(project, requestId, estimatedCredits);
    }
    if (error instanceof IdempotencyConflictError) {
      return jsonErrorWithHeaders(
        409,
        "invalid_request",
        "request_in_progress",
        "A request with this idempotency key is already being processed.",
        rateLimit.headers,
      );
    }
    throw error;
  }

  const doRelease = consumer
    ? () => releaseConsumerReservedCredits(consumer, requestId, estimatedCredits)
    : () => releaseReservedCredits(project, requestId, estimatedCredits);

  const doSettle = consumer
    ? (actual: number) => settleConsumerCredits(consumer, requestId, actual, estimatedCredits)
    : (actual: number) => settleCredits(project, requestId, actual, estimatedCredits);

  try {
    const result = await runTranscription(file);

    await doSettle(result.usage.creditsUsed);

    await finalizeRequest(
      requestId,
      result.usage,
      result.verification,
      result.body,
    );

    return NextResponse.json(
      {
        ...result.body,
        huru: {
          request_id: requestId,
          credits_used: result.usage.creditsUsed,
          verified: result.verification.verified,
          verification_mode: result.verification.verificationMode,
          provider: result.verification.provider,
        },
      },
      {
        headers: {
          "x-request-id": requestId,
          ...rateLimit.headers,
        },
      },
    );
  } catch (error) {
    await doRelease();
    await failRequest(
      requestId,
      "runtime_error",
      error instanceof Error ? error.message : String(error),
    );
    return jsonError(
      503,
      "provider_error",
      "provider_unavailable",
      error instanceof Error ? error.message : "Runtime unavailable.",
    );
  }
}
