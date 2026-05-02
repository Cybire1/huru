import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { createCheckoutSession } from "@/lib/huru/paystack";
import { authenticateProject } from "@/lib/huru/store";

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

  const payload = (await request.json().catch(() => null)) as
    | {
        pack_id?: string;
        email?: string;
        success_url?: string;
        cancel_url?: string;
      }
    | null;

  if (!payload?.pack_id) {
    return jsonError(400, "invalid_request", "missing_pack_id", "pack_id is required.");
  }

  if (!payload.email) {
    return jsonError(400, "invalid_request", "missing_email", "email is required.");
  }

  try {
    const session = await createCheckoutSession({
      project,
      packId: payload.pack_id,
      email: payload.email,
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
