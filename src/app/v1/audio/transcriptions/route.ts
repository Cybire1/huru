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
	estimateTranscriptionCredits,
	runTranscription,
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

	const formData = await request.formData().catch(() => null);
	const file = formData?.get("file");
	const model = formData?.get("model");

	if (!(file instanceof File)) {
		return jsonError(
			400,
			"invalid_request",
			"missing_file",
			"A file upload is required.",
		);
	}

	if (model !== "huru/stt-1") {
		return jsonError(
			400,
			"invalid_request",
			"unsupported_model",
			"Unsupported model.",
		);
	}

	const requestId = makeRequestId();
	const estimatedCredits = estimateTranscriptionCredits(file);

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
			endpoint: "/v1/audio/transcriptions",
			method: "POST",
			model: "huru/stt-1",
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
		const result = await runTranscription(file);

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
