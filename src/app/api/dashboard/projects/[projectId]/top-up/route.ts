import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { createDashboardTopUpCheckout } from "@/lib/huru/dashboard";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        packId?: string;
        successUrl?: string;
        cancelUrl?: string;
      }
    | null;

  if (!payload?.packId) {
    return jsonError(400, "invalid_request", "missing_pack_id", "packId is required.");
  }

  const { projectId } = await context.params;

  let session;
  try {
    session = await createDashboardTopUpCheckout(
      token,
      projectId,
      payload.packId,
      payload.successUrl,
      payload.cancelUrl,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed.";
    console.error("[top-up]", message);
    return jsonError(500, "internal_error", "checkout_failed", message);
  }

  if (!session) {
    return jsonError(404, "invalid_request", "project_not_found", "Project not found.");
  }

  return NextResponse.json(session, { status: 201 });
}
