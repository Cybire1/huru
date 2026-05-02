import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { authenticateProject, getConsumer } from "@/lib/huru/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consumerId: string }> },
) {
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

  const { consumerId } = await params;
  const consumer = await getConsumer(project, consumerId);
  if (!consumer) {
    return jsonError(404, "invalid_request", "consumer_not_found", "Consumer not found.");
  }

  return NextResponse.json(
    {
      id: consumer.id,
      email: consumer.email,
      name: consumer.name ?? null,
      credits_balance: consumer.creditsBalance,
      created_at: consumer.createdAt,
    },
    { headers: rateLimit.headers },
  );
}
