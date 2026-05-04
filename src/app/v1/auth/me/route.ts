import { type NextRequest, NextResponse } from "next/server";
import { verifyConsumerToken } from "@/lib/huru/consumer-token";
import { jsonError } from "@/lib/huru/errors";
import { getApiKey, getBearerToken } from "@/lib/huru/http";
import { authenticateProject, getConsumer, resolveConsumer } from "@/lib/huru/store";

export async function GET(request: NextRequest) {
  const bearerToken = getBearerToken(request);
  if (!bearerToken) {
    return jsonError(
      401,
      "authentication_error",
      "missing_credentials",
      "Authorization header is required.",
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

  const apiKey = getApiKey(request);
  if (!apiKey) {
    return jsonError(
      401,
      "authentication_error",
      "missing_api_key",
      "X-Huru-Api-Key header is required.",
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

  if (payload.pid !== project.publicId) {
    return jsonError(
      403,
      "permission_error",
      "token_project_mismatch",
      "Consumer token does not belong to this project.",
    );
  }

  // Try to get existing consumer by ID first, fall back to resolve by email
  let consumer = await getConsumer(project, payload.sub);
  if (!consumer) {
    consumer = await resolveConsumer(project, payload.email);
  }

  if (!consumer) {
    return jsonError(
      404,
      "invalid_request",
      "consumer_not_found",
      "Consumer not found.",
    );
  }

  return NextResponse.json({
    id: consumer.id,
    email: consumer.email,
    name: consumer.name ?? null,
    credits_balance: consumer.creditsBalance,
    project_id: project.publicId,
  });
}
