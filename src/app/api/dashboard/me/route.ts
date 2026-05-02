import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { getDashboardOverview } from "@/lib/huru/dashboard";

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  const overview = token ? await getDashboardOverview(token) : null;

  if (!overview) {
    return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
  }

  return NextResponse.json(overview);
}
