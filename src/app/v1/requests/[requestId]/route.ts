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
      id: record.id,
      object: "request",
      status: record.status,
      endpoint: record.endpoint,
      model: record.model,
      created_at: record.createdAt,
      completed_at: record.completedAt ?? null,
      usage: record.usage
        ? {
            credits_used: record.usage.creditsUsed,
            prompt_tokens: record.usage.promptTokens,
            completion_tokens: record.usage.completionTokens,
            total_tokens: record.usage.totalTokens,
          }
        : null,
      verification: record.verification
        ? {
            verified: record.verification.verified,
            mode: record.verification.verificationMode,
          }
        : null,
      error: record.errorCode
        ? {
            code: record.errorCode,
            message: record.errorMessage,
          }
        : null,
    },
    { headers: rateLimit.headers },
  );
}
