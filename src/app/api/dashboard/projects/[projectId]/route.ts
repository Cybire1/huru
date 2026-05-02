import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { getDashboardProjectDetail } from "@/lib/huru/dashboard";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
  }

  const { projectId } = await context.params;
  const detail = await getDashboardProjectDetail(token, projectId);

  if (!detail) {
    return jsonError(404, "invalid_request", "project_not_found", "Project not found.");
  }

  return NextResponse.json(detail);
}
