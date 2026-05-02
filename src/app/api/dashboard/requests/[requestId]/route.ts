import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { getDashboardRequestDetail } from "@/lib/huru/dashboard";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
  }

  const { requestId } = await context.params;
  const detail = await getDashboardRequestDetail(token, requestId);

  if (!detail) {
    return jsonError(404, "invalid_request", "request_not_found", "Request not found.");
  }

  return NextResponse.json(detail);
}
