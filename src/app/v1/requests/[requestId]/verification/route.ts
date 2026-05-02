import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { authenticateProject, getRequest } from "@/lib/huru/store";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> },
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

  const { requestId } = await context.params;
  const record = await getRequest(project, requestId);
  if (!record) {
    return jsonError(404, "invalid_request", "request_not_found", "Request not found.");
  }

  return NextResponse.json(
    {
      request_id: record.id,
      verified: record.verification?.verified ?? false,
      verification_mode: record.verification?.verificationMode ?? "unknown",
      provider: {
        id: record.verification?.provider ?? "unknown",
        label: record.verification?.provider ?? "unknown",
      },
      attestation: {
        report_id: record.verification?.reportId ?? null,
        quote_hash: record.verification?.quoteHash ?? null,
        verified_at: record.verification?.verifiedAt ?? null,
      },
    },
    { headers: rateLimit.headers },
  );
}
