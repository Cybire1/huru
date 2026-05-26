import { type NextRequest, NextResponse } from "next/server";
import {
	jsonError,
	jsonErrorWithBody,
	jsonErrorWithHeaders,
} from "@/lib/huru/errors";
import {
	getIdempotencyKey,
	makeRequestId,
} from "@/lib/huru/http";
import { createQuickCheckoutUrl } from "@/lib/huru/paystack";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { isAuthError, resolveRequestAuth } from "@/lib/huru/resolve-auth";
import {
	estimateImageCredits,
	runImageGeneration,
} from "@/lib/huru/runtime";
import {
	checkIdempotencyKey,
	failRequest,
	finalizeRequest,
	IdempotencyConflictError,
	preReserveConsumerCredits,
	releaseConsumerReservedCredits,
	saveRequest,
	settleConsumerCredits,
} from "@/lib/huru/store";

const VALID_SIZES = new Set(["512x512", "1024x1024", "1792x1024"]);
const MAX_PROMPT_LENGTH = 4000;

export async function POST(request: NextRequest) {
	const authResult = await resolveRequestAuth(request);
	if (isAuthError(authResult)) {
		return authResult;
	}
	const { project, consumer } = authResult;

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

	const idempotencyKey = getIdempotencyKey(request);
	if (idempotencyKey) {
		const existing = await checkIdempotencyKey(project, idempotencyKey);
		if (existing) {
			if (existing.status === "completed") {
				const body = existing.record.responseBody ?? {};
				return NextResponse.json(
					{
						...body,
						huru: {
							request_id: existing.record.id,
							credits_used: existing.record.usage?.creditsUsed ?? 0,
							verified: existing.record.verification?.verified ?? false,
							verification_mode:
								existing.record.verification?.verificationMode ?? "unknown",
							provider: existing.record.verification?.provider ?? "unknown",
							idempotent_replay: true,
						},
					},
					{
						headers: {
							"x-request-id": existing.record.id,
							...rateLimit.headers,
						},
					},
				);
			}
			if (existing.status === "processing") {
				return jsonErrorWithHeaders(
					409,
					"invalid_request",
					"request_in_progress",
					"A request with this idempotency key is already being processed.",
					rateLimit.headers,
				);
			}
		}
	}

	const payload = (await request.json().catch(() => null)) as {
		model?: string;
		prompt?: string;
		n?: number;
		size?: string;
		response_format?: string;
	} | null;

	if (!payload?.model || payload.model !== "huru/img-1") {
		return jsonError(
			400,
			"invalid_request",
			"unsupported_model",
			"Unsupported model. Use huru/img-1.",
		);
	}

	if (!payload.prompt || typeof payload.prompt !== "string" || !payload.prompt.trim()) {
		return jsonError(
			400,
			"invalid_request",
			"missing_prompt",
			"A prompt is required.",
		);
	}

	if (payload.prompt.length > MAX_PROMPT_LENGTH) {
		return jsonError(
			400,
			"invalid_request",
			"prompt_too_long",
			`Prompt must be at most ${MAX_PROMPT_LENGTH} characters.`,
		);
	}

	const n = payload.n ?? 1;
	if (!Number.isInteger(n) || n < 1 || n > 4) {
		return jsonError(
			400,
			"invalid_request",
			"invalid_n",
			"n must be an integer between 1 and 4.",
		);
	}

	const size = payload.size ?? "1024x1024";
	if (!VALID_SIZES.has(size)) {
		return jsonError(
			400,
			"invalid_request",
			"invalid_size",
			"size must be one of: 512x512, 1024x1024, 1792x1024.",
		);
	}

	const responseFormat = payload.response_format ?? "url";

	const requestId = makeRequestId();
	const estimatedCredits = estimateImageCredits(n, size);

	const reserveResult = await preReserveConsumerCredits(consumer, estimatedCredits, requestId);
	if (!reserveResult.ok) {
		const checkoutUrl = await createQuickCheckoutUrl(project, consumer).catch(
			() => "",
		);
		return jsonErrorWithBody(
			402,
			"billing_error",
			"insufficient_credits",
			`Insufficient credits: ${reserveResult.balance} available, ${reserveResult.needed} needed.`,
			{
				credits_balance: reserveResult.balance,
				credits_needed: reserveResult.needed,
				...(checkoutUrl ? { checkout_url: checkoutUrl } : {}),
			},
		);
	}

	try {
		await saveRequest(project, {
			id: requestId,
			projectId: project.publicId,
			endpoint: "/v1/images/generations",
			method: "POST",
			model: payload.model,
			status: "processing",
			createdAt: new Date().toISOString(),
			idempotencyKey: idempotencyKey ?? undefined,
			creditsReserved: estimatedCredits,
			consumerId: consumer.id,
			consumerEmail: consumer.email,
		});
	} catch (error) {
		await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		if (error instanceof IdempotencyConflictError) {
			return jsonErrorWithHeaders(
				409,
				"invalid_request",
				"request_in_progress",
				"A request with this idempotency key is already being processed.",
				rateLimit.headers,
			);
		}
		throw error;
	}

	const doRelease = () =>
		releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
	const doSettle = (actual: number) =>
		settleConsumerCredits(consumer, requestId, actual, estimatedCredits);

	try {
		const result = await runImageGeneration({
			model: payload.model,
			prompt: payload.prompt.trim(),
			n,
			size,
			response_format: responseFormat,
		});

		await doSettle(result.usage.creditsUsed);

		await finalizeRequest(
			requestId,
			result.usage,
			result.verification,
			result.body,
		);

		return NextResponse.json(
			{
				...result.body,
				huru: {
					request_id: requestId,
					credits_used: result.usage.creditsUsed,
					verified: result.verification.verified,
					verification_mode: result.verification.verificationMode,
					provider: result.verification.provider,
				},
			},
			{
				headers: {
					"x-request-id": requestId,
					...rateLimit.headers,
				},
			},
		);
	} catch (error) {
		await doRelease();
		await failRequest(
			requestId,
			"runtime_error",
			error instanceof Error ? error.message : String(error),
		);
		return jsonError(
			503,
			"provider_error",
			"provider_unavailable",
			error instanceof Error ? error.message : "Runtime unavailable.",
		);
	}
}
