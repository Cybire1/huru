import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { createConsumerCheckoutSession } from "@/lib/huru/paystack";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { authenticateProject, getConsumer } from "@/lib/huru/store";

export async function POST(
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

  const payload = (await request.json().catch(() => null)) as
    | {
        pack_id?: string;
        success_url?: string;
        cancel_url?: string;
      }
    | null;

  if (!payload?.pack_id) {
    return jsonError(400, "invalid_request", "missing_pack_id", "pack_id is required.");
  }

  try {
    const session = await createConsumerCheckoutSession({
      project,
      consumer,
      packId: payload.pack_id,
      successUrl: payload.success_url,
      cancelUrl: payload.cancel_url,
    });
    return NextResponse.json(session, { status: 201, headers: rateLimit.headers });
  } catch (error) {
    return jsonError(
      400,
      "billing_error",
      "checkout_initialization_failed",
      error instanceof Error ? error.message : "Failed to initialize checkout.",
    );
  }
}
