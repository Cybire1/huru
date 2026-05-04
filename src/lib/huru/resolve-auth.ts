import type { NextRequest } from "next/server";
import { isConsumerToken, verifyConsumerToken } from "@/lib/huru/consumer-token";
import { jsonError } from "@/lib/huru/errors";
import { getApiKey, getBearerToken, getConsumerEmail, getConsumerName } from "@/lib/huru/http";
import { authenticateProject, resolveConsumer } from "@/lib/huru/store";
import type { HuruConsumerRecord, HuruProjectRecord } from "@/lib/huru/types";

export type ResolvedAuth = {
  project: HuruProjectRecord;
  consumer: HuruConsumerRecord;
};

/**
 * Unified auth resolver supporting two flows:
 *
 * 1. Consumer token flow (new SDK):
 *    - Authorization: Bearer ct_eyJ...
 *    - X-Huru-Api-Key: sk_test_...
 *
 * 2. Legacy API key flow:
 *    - Authorization: Bearer sk_test_...
 *    - X-Consumer-Email: user@example.com
 */
export async function resolveRequestAuth(
  request: NextRequest,
): Promise<ResolvedAuth | Response> {
  const bearerToken = getBearerToken(request);

  if (!bearerToken) {
    return jsonError(
      401,
      "authentication_error",
      "missing_credentials",
      "Authorization header is required.",
    );
  }

  // Flow 1: Consumer token (ct_ prefix)
  if (isConsumerToken(bearerToken)) {
    const apiKey = getApiKey(request);
    if (!apiKey) {
      return jsonError(
        401,
        "authentication_error",
        "missing_api_key",
        "X-Huru-Api-Key header is required when using a consumer token.",
      );
    }

    const project = await authenticateProject(apiKey);
    if (!project) {
      return jsonError(
        401,
        "authentication_error",
        "invalid_api_key",
        "Invalid API key.",
      );
    }

    const payload = await verifyConsumerToken(bearerToken);
    if (!payload) {
      return jsonError(
        401,
        "authentication_error",
        "invalid_consumer_token",
        "Consumer token is invalid or expired.",
      );
    }

    // Ensure the consumer token was issued for this project
    if (payload.pid !== project.publicId) {
      return jsonError(
        403,
        "permission_error",
        "token_project_mismatch",
        "Consumer token does not belong to this project.",
      );
    }

    const consumer = await resolveConsumer(
      project,
      payload.email,
      undefined,
      "google",
      payload.sub,
    );

    return { project, consumer };
  }

  // Flow 2: Legacy API key flow (sk_ prefix)
  const project = await authenticateProject(bearerToken);
  if (!project) {
    return jsonError(
      401,
      "authentication_error",
      "invalid_api_key",
      "Invalid API key.",
    );
  }

  const consumerEmail = getConsumerEmail(request);
  if (!consumerEmail) {
    return jsonError(
      400,
      "invalid_request",
      "missing_consumer",
      "X-Consumer-Email header is required. Each API call must be tied to a paying user.",
    );
  }

  const consumerName = getConsumerName(request);
  const consumer = await resolveConsumer(
    project,
    consumerEmail,
    consumerName ?? undefined,
  );

  return { project, consumer };
}

export function isAuthError(result: ResolvedAuth | Response): result is Response {
  return result instanceof Response;
}
