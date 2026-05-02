import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken, makeRequestId } from "@/lib/huru/http";
import {
  estimateChatCredits,
  runChatCompletion,
} from "@/lib/huru/runtime";
import {
  failRequest,
  finalizeRequest,
  preReserveCredits,
  releaseReservedCredits,
  saveRequest,
  settleCredits,
} from "@/lib/huru/store";
import { resolvePlaygroundProject } from "@/lib/huru/dashboard";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const sessionToken = getBearerToken(request);
  if (!sessionToken) {
    return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
  }

  const { projectId } = await context.params;
  const project = await resolvePlaygroundProject(sessionToken, projectId);
  if (!project) {
    return jsonError(404, "invalid_request", "project_not_found", "Project not found.");
  }

  const payload = (await request.json().catch(() => null)) as
    | { model?: string; messages?: Array<{ role: string; content: string }> }
    | null;

  if (!payload?.model || payload.model !== "huru/chat-1") {
    return jsonError(400, "invalid_request", "unsupported_model", "Unsupported model.");
  }
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return jsonError(400, "invalid_request", "missing_messages", "At least one message is required.");
  }

  const requestId = makeRequestId();
  const estimatedCredits = estimateChatCredits(payload.messages);

  if (!(await preReserveCredits(project, estimatedCredits, requestId))) {
    return jsonError(402, "billing_error", "insufficient_credits", "Your project does not have enough credits.");
  }

  await saveRequest(project, {
    id: requestId,
    projectId: project.publicId,
    endpoint: "/v1/chat/completions",
    method: "POST",
    model: payload.model,
    status: "processing",
    createdAt: new Date().toISOString(),
    creditsReserved: estimatedCredits,
  });

  try {
    const result = await runChatCompletion({
      model: payload.model,
      messages: payload.messages,
    });

    await settleCredits(project, requestId, result.usage.creditsUsed, estimatedCredits);

    await finalizeRequest(requestId, result.usage, result.verification, result.body);

    return NextResponse.json({
      ...result.body,
      huru: {
        request_id: requestId,
        credits_used: result.usage.creditsUsed,
        verified: result.verification.verified,
        verification_mode: result.verification.verificationMode,
        provider: result.verification.provider,
      },
    }, {
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    await releaseReservedCredits(project, requestId, estimatedCredits);
    await failRequest(requestId, "runtime_error", error instanceof Error ? error.message : String(error));
    return jsonError(503, "provider_error", "provider_unavailable", error instanceof Error ? error.message : "Runtime unavailable.");
  }
}
