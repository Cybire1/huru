import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { createDashboardProject } from "@/lib/huru/dashboard";

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        name?: string;
        slug?: string;
        environment?: "test" | "live";
      }
    | null;

  if (!payload?.name?.trim()) {
    return jsonError(400, "invalid_request", "missing_name", "Project name is required.");
  }

  const created = await createDashboardProject(token, {
    name: payload.name,
    slug: payload.slug,
    environment: payload.environment,
  });

  if (!created) {
    return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
  }

  return NextResponse.json(created, { status: 201 });
}
