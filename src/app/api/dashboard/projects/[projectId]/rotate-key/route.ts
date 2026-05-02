import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { rotateDashboardProjectKey } from "@/lib/huru/dashboard";

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

  const { projectId } = await context.params;
  const rotated = await rotateDashboardProjectKey(token, projectId);

  if (!rotated) {
    return jsonError(404, "invalid_request", "project_not_found", "Project not found.");
  }

  return NextResponse.json(rotated, { status: 201 });
}
