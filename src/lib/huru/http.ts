import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export function makeRequestId(): string {
  return `req_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function getIdempotencyKey(request: NextRequest): string | null {
  const key = request.headers.get("idempotency-key");
  if (!key?.trim()) {
    return null;
  }

  return key.trim();
}

export function getApiKey(request: NextRequest): string | null {
  const key = request.headers.get("x-huru-api-key")?.trim();
  if (!key) {
    return null;
  }
  return key;
}

export function getConsumerEmail(request: NextRequest): string | null {
  const email = request.headers.get("x-consumer-email")?.trim();
  if (!email || !email.includes("@")) {
    return null;
  }
  return email;
}

export function getConsumerName(request: NextRequest): string | null {
  const name = request.headers.get("x-consumer-name")?.trim();
  if (!name) {
    return null;
  }
  return name;
}
