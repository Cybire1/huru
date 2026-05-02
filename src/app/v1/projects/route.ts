import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { authenticateProject, createProject, listProjects } from "@/lib/huru/store";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

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

  const projects = await listProjects(project);
  return NextResponse.json(
    {
      object: "list",
      data: projects.map((item) => ({
        id: item.publicId,
        name: item.name,
        environment: item.environment,
        credits_balance: item.creditsBalance,
        api_key_prefix: item.apiKey.slice(0, 16),
        created_at: item.createdAt,
      })),
    },
    { headers: rateLimit.headers },
  );
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  const owner = await authenticateProject(token);
  if (!owner) {
    return jsonError(401, "authentication_error", "invalid_api_key", "Invalid API key.");
  }

  const rateLimit = checkRateLimit(owner.publicId);
  if (!rateLimit.allowed) {
    return jsonErrorWithHeaders(
      429,
      "rate_limit_error",
      "rate_limit_exceeded",
      "Rate limit exceeded. Please retry later.",
      rateLimit.headers,
    );
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

  const created = await createProject(owner, {
    name: payload.name.trim(),
    slug: payload.slug ? normalizeSlug(payload.slug) : undefined,
    environment: payload.environment ?? owner.environment,
  });

  return NextResponse.json(
    {
      id: created.publicId,
      name: created.name,
      environment: created.environment,
      api_key: created.apiKey,
      api_key_prefix: created.apiKey.slice(0, 16),
      credits_balance: created.creditsBalance,
      created_at: created.createdAt,
    },
    { status: 201, headers: rateLimit.headers },
  );
}
