import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { verifyCheckoutTransaction } from "@/lib/huru/paystack";
import { applySuccessfulCreditPurchase } from "@/lib/huru/store";
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
    | { reference?: string }
    | null;

  if (!payload?.reference) {
    return jsonError(400, "invalid_request", "missing_reference", "reference is required.");
  }

  try {
    const verifiedData = await verifyCheckoutTransaction(payload.reference);

    if (verifiedData.status !== "success") {
      return jsonError(
        400,
        "billing_error",
        "payment_not_successful",
        `Transaction status: ${verifiedData.status ?? "unknown"}.`,
      );
    }

    await applySuccessfulCreditPurchase(payload.reference, {
      id:
        typeof verifiedData.id === "string" || typeof verifiedData.id === "number"
          ? verifiedData.id
          : null,
      status:
        typeof verifiedData.status === "string"
          ? verifiedData.status
          : "success",
      amount:
        typeof verifiedData.amount === "number"
          ? verifiedData.amount
          : null,
      currency:
        typeof verifiedData.currency === "string"
          ? verifiedData.currency
          : null,
      fees:
        typeof verifiedData.fees === "number"
          ? verifiedData.fees
          : null,
      gateway_response:
        typeof verifiedData.gateway_response === "string"
          ? verifiedData.gateway_response
          : null,
      paid_at:
        typeof verifiedData.paid_at === "string"
          ? verifiedData.paid_at
          : null,
      metadata:
        typeof verifiedData.metadata === "object" && verifiedData.metadata
          ? (verifiedData.metadata as Record<string, unknown>)
          : null,
      rawPayload: verifiedData as Record<string, unknown>,
    });

    return NextResponse.json(
      { verified: true, reference: payload.reference, credits_applied: true },
      { headers: rateLimit.headers },
    );
  } catch (error) {
    return jsonError(
      500,
      "billing_error",
      "verification_failed",
      error instanceof Error ? error.message : "Failed to verify transaction.",
    );
  }
}
