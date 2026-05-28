import { type NextRequest, NextResponse } from "next/server";
import {
	jsonError,
	jsonErrorWithBody,
	jsonErrorWithHeaders,
} from "@/lib/huru/errors";
import {
	SSEAccumulator,
	buildCacheKey,
	getCachedResponse,
	replayCachedAsStream,
	setCachedResponse,
	shouldBypassCache,
} from "@/lib/huru/cache";
import {
	getIdempotencyKey,
	makeRequestId,
} from "@/lib/huru/http";
import { createQuickCheckoutUrl } from "@/lib/huru/paystack";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { isAuthError, resolveRequestAuth } from "@/lib/huru/resolve-auth";
import type { StreamingRuntimeResult } from "@/lib/huru/runtime";
import {
	estimateChatCredits,
	runChatCompletion,
	runChatCompletionStream,
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
import type { HuruConsumerRecord, HuruProjectRecord } from "@/lib/huru/types";

async function handleStreamingChat(
	request: NextRequest,
	_project: HuruProjectRecord,
	consumer: HuruConsumerRecord,
	requestId: string,
	reservedAmount: number,
	payload: {
		model: string;
		messages: Array<{ role: string; content: string }>;
	},
	cacheKey: string | null,
) {
	const doRelease = () =>
		releaseConsumerReservedCredits(consumer, requestId, reservedAmount);
	const doSettle = (actual: number) =>
		settleConsumerCredits(consumer, requestId, actual, reservedAmount);

	let streamResult: StreamingRuntimeResult;
	try {
		streamResult = await runChatCompletionStream({
			model: payload.model,
			messages: payload.messages,
		});
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

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const accumulator = cacheKey ? new SSEAccumulator() : null;
	let settled = false;

	const outputStream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const reader = streamResult.stream.getReader();
			const abortHandler = () => {
				reader.cancel().catch(() => {
					// ignore
				});
			};
			request.signal.addEventListener("abort", abortHandler);

			try {
				const metaEvent = {
					huru: { request_id: requestId },
				};
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify(metaEvent)}\n\n`),
				);

				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					controller.enqueue(value);
					accumulator?.push(value, decoder);
				}

				const { usage, verification } = await streamResult.onComplete();
				settled = true;
				await doSettle(usage.creditsUsed);

				// Populate cache with assembled response
				const assembled = accumulator?.result();
				if (cacheKey && assembled) {
					setCachedResponse(cacheKey, {
						body: {
							id: `chatcmpl-${requestId}`,
							object: "chat.completion",
							created: Math.floor(Date.now() / 1000),
							model: payload.model,
							choices: [
								{
									index: 0,
									message: { role: "assistant", content: assembled },
									finish_reason: "stop",
								},
							],
						},
						model: payload.model,
						creditsUsed: usage.creditsUsed,
						verified: verification.verified,
						verificationMode: verification.verificationMode,
						provider: verification.provider,
					});
				}

				const huruMeta = {
					huru: {
						request_id: requestId,
						credits_used: usage.creditsUsed,
						verified: verification.verified,
						verification_mode: verification.verificationMode,
						provider: verification.provider,
					},
				};
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify(huruMeta)}\n\n`),
				);

				await finalizeRequest(requestId, usage, verification, {
					object: "chat.completion",
					model: payload.model,
					streamed: true,
				});

				controller.close();
			} catch (error) {
				if (!settled) {
					await doRelease();
					streamResult.onError();
					await failRequest(
						requestId,
						"stream_error",
						error instanceof Error ? error.message : String(error),
					);
				}
				controller.error(error);
			} finally {
				request.signal.removeEventListener("abort", abortHandler);
			}
		},
		cancel() {
			if (!settled) {
				streamResult.onError();
				void doRelease();
				void failRequest(
					requestId,
					"client_disconnect",
					"Client disconnected.",
				);
			}
		},
	});

	return new Response(outputStream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"x-request-id": requestId,
			"x-cache": "MISS",
		},
	});
}

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
			// status === "failed" → allow retry (fall through)
		}
	}

	const payload = (await request.json().catch(() => null)) as {
		model?: string;
		messages?: Array<{ role: string; content: string }>;
		stream?: boolean;
		max_tokens?: number;
	} | null;

	if (!payload?.model || payload.model !== "huru/chat-1") {
		return jsonError(
			400,
			"invalid_request",
			"unsupported_model",
			"Unsupported model.",
		);
	}

	if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
		return jsonError(
			400,
			"invalid_request",
			"missing_messages",
			"At least one message is required.",
		);
	}

	// ── Cache lookup (before credit reserve — hits cost 0 credits) ──
	const bypassCache = shouldBypassCache(
		request.headers.get("cache-control"),
	);
	const cacheKey = bypassCache
		? null
		: buildCacheKey(
				project.publicId,
				payload.model,
				payload.messages,
				undefined,
				payload.max_tokens,
			);

	if (cacheKey) {
		const cached = getCachedResponse(cacheKey, project.publicId);
		if (cached) {
			const requestId = makeRequestId();
			if (payload.stream) {
				return new Response(
					replayCachedAsStream(cached, requestId),
					{
						headers: {
							"Content-Type": "text/event-stream",
							"Cache-Control": "no-cache",
							Connection: "keep-alive",
							"x-request-id": requestId,
							"x-cache": "HIT",
							...rateLimit.headers,
						},
					},
				);
			}
			return NextResponse.json(
				{
					...cached.body,
					huru: {
						request_id: requestId,
						credits_used: 0,
						verified: cached.verified,
						verification_mode: cached.verificationMode,
						provider: cached.provider,
						cached: true,
					},
				},
				{
					headers: {
						"x-request-id": requestId,
						"x-cache": "HIT",
						...rateLimit.headers,
					},
				},
			);
		}
	}

	const requestId = makeRequestId();
	const estimatedCredits = estimateChatCredits(payload.messages, payload.max_tokens, payload.model);

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
			endpoint: "/v1/chat/completions",
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

	if (payload.stream) {
		return handleStreamingChat(
			request,
			project,
			consumer,
			requestId,
			estimatedCredits,
			{
				model: payload.model,
				messages: payload.messages,
			},
			cacheKey,
		);
	}

	const doRelease = () =>
		releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
	const doSettle = (actual: number) =>
		settleConsumerCredits(consumer, requestId, actual, estimatedCredits);

	try {
		const result = await runChatCompletion({
			model: payload.model,
			messages: payload.messages,
		});

		await doSettle(result.usage.creditsUsed);

		await finalizeRequest(
			requestId,
			result.usage,
			result.verification,
			result.body,
		);

		// Populate cache after successful response
		if (cacheKey) {
			setCachedResponse(cacheKey, {
				body: result.body,
				model: payload.model,
				creditsUsed: result.usage.creditsUsed,
				verified: result.verification.verified,
				verificationMode: result.verification.verificationMode,
				provider: result.verification.provider,
			});
		}

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
					"x-cache": "MISS",
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
