import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { getDashboardOverview } from "@/lib/huru/dashboard";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    const overview = token ? await getDashboardOverview(token) : null;

    if (!overview) {
      return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
    }

    return NextResponse.json(overview);
  } catch (error) {
    console.error("[huru/dashboard] failed to load dashboard:", error);
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
    const message = error instanceof Error ? error.message : "";
    const missingSchema =
      code === "PGRST205" ||
      code === "42P01" ||
      message.includes("Could not find the table") ||
      message.includes("schema cache");

    return jsonError(
      missingSchema ? 503 : 500,
      "internal_error",
      missingSchema ? "supabase_schema_missing" : "dashboard_load_failed",
      missingSchema
        ? "Google sign-in worked, but the Huru Supabase tables have not been migrated yet."
        : "You are signed in, but Huru could not load your dashboard.",
    );
  }
}
