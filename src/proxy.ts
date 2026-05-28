import { NextResponse, type NextRequest } from "next/server";

// Origins allowed to call /v1/* from a browser. Comma-separated.
// Set "*" to allow any origin (only safe with consumer-token auth — never with raw API keys).
const ALLOWED_ORIGINS = (process.env.HURU_CORS_ALLOWED_ORIGINS || "")
	.split(",")
	.map((o) => o.trim())
	.filter(Boolean);

const ALLOWED_HEADERS = [
	"Authorization",
	"Content-Type",
	"X-Huru-Api-Key",
	"X-Consumer-Email",
	"X-Consumer-Name",
	"X-Huru-Encryption",
	"Idempotency-Key",
	"Cache-Control",
].join(", ");

const ALLOWED_METHODS = "GET, POST, OPTIONS";

function resolveAllowedOrigin(origin: string | null): string | null {
	if (!origin) return null;
	if (ALLOWED_ORIGINS.includes("*")) return origin;
	if (ALLOWED_ORIGINS.includes(origin)) return origin;
	return null;
}

export function proxy(request: NextRequest) {
	const origin = request.headers.get("origin");
	const allowed = resolveAllowedOrigin(origin);

	if (request.method === "OPTIONS") {
		const headers: Record<string, string> = {
			"Access-Control-Allow-Methods": ALLOWED_METHODS,
			"Access-Control-Allow-Headers": ALLOWED_HEADERS,
			"Access-Control-Max-Age": "86400",
			Vary: "Origin",
		};
		if (allowed) {
			headers["Access-Control-Allow-Origin"] = allowed;
		}
		return new NextResponse(null, { status: 204, headers });
	}

	const response = NextResponse.next();
	if (allowed) {
		response.headers.set("Access-Control-Allow-Origin", allowed);
		response.headers.set("Vary", "Origin");
		response.headers.set(
			"Access-Control-Expose-Headers",
			"x-request-id, x-cache, x-root-hash, x-huru-encryption",
		);
	}
	return response;
}

export const config = {
	matcher: ["/v1/:path*"],
};
