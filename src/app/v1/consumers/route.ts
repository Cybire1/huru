import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { authenticateProject, listConsumers } from "@/lib/huru/store";

export async function GET(request: NextRequest) {
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

  const consumers = await listConsumers(project);

  return NextResponse.json(
    {
      object: "list",
      data: consumers.map((c) => ({
        id: c.id,
        email: c.email,
        name: c.name ?? null,
        credits_balance: c.creditsBalance,
        created_at: c.createdAt,
      })),
    },
    { headers: rateLimit.headers },
  );
}
