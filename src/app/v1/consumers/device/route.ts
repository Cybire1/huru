import { type NextRequest, NextResponse } from "next/server";
import { signConsumerToken } from "@/lib/huru/consumer-token";
import { jsonError, jsonErrorWithHeaders } from "@/lib/huru/errors";
import { getApiKey } from "@/lib/huru/http";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { authenticateProject, resolveConsumer } from "@/lib/huru/store";

function normalizeDeviceId(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export async function POST(request: NextRequest) {
	const apiKey = getApiKey(request);
	if (!apiKey) {
		return jsonError(
			401,
			"authentication_error",
			"missing_api_key",
			"X-Huru-Api-Key is required.",
		);
	}

	const project = await authenticateProject(apiKey);
	if (!project) {
		return jsonError(
			401,
			"authentication_error",
			"invalid_api_key",
			"Invalid API key.",
		);
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

	const body = (await request.json().catch(() => null)) as {
		device_id?: string;
	} | null;
	const deviceId = normalizeDeviceId(String(body?.device_id ?? ""));
	if (deviceId.length < 8) {
		return jsonError(
			400,
			"invalid_request",
			"invalid_device_id",
			"A stable device_id is required.",
		);
	}

	const email = `${deviceId.toLowerCase()}@device.chum.app`;
	const consumer = await resolveConsumer(
		project,
		email,
		"Chum device",
		"device",
		deviceId,
	);

	const token = await signConsumerToken({
		sub: consumer.id,
		pid: project.publicId,
		ppid: project.storageId ?? "",
		email: consumer.email,
	});

	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

	return NextResponse.json(
		{
			consumer_id: consumer.id,
			token,
			credits_balance: consumer.creditsBalance,
			expires_at: expiresAt,
		},
		{ headers: rateLimit.headers },
	);
}
