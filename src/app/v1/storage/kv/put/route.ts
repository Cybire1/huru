import { type NextRequest, NextResponse } from "next/server";
import {
	jsonError,
	jsonErrorWithBody,
	jsonErrorWithHeaders,
} from "@/lib/huru/errors";
import { makeRequestId } from "@/lib/huru/http";
import { createQuickCheckoutUrl } from "@/lib/huru/paystack";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { isAuthError, resolveRequestAuth } from "@/lib/huru/resolve-auth";
import {
	defaultStreamId,
	estimateKvWriteCredits,
	kvPut,
} from "@/lib/huru/storage";
import { getStorageWalletForConsumer } from "@/lib/huru/wallet-manager";
import {
	failRequest,
	finalizeRequest,
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

	const payload = (await request.json().catch(() => null)) as {
		key?: string;
		value?: string;
		stream_id?: string;
	} | null;

	if (!payload?.key || typeof payload.key !== "string") {
		return jsonError(
			400,
			"invalid_request",
			"missing_key",
			"A key string is required.",
		);
	}

	if (payload.value === undefined || payload.value === null || typeof payload.value !== "string") {
		return jsonError(
			400,
			"invalid_request",
			"missing_value",
			"A value string is required.",
		);
	}

	const streamId = payload.stream_id || defaultStreamId(project.publicId);

	const requestId = makeRequestId();
	const estimatedCredits = estimateKvWriteCredits();

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
			endpoint: "/v1/storage/kv/put",
			method: "POST",
			model: "0g/kv",
			status: "processing",
			createdAt: new Date().toISOString(),
			creditsReserved: estimatedCredits,
			consumerId: consumer.id,
			consumerEmail: consumer.email,
		});
	} catch (error) {
		await releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
		throw error;
	}

	const doRelease = () =>
		releaseConsumerReservedCredits(consumer, requestId, estimatedCredits);
	const doSettle = (actual: number) =>
		settleConsumerCredits(consumer, requestId, actual, estimatedCredits);

	try {
		const wallet = await getStorageWalletForConsumer(consumer);
		const result = await kvPut(streamId, payload.key, payload.value, wallet);

		const creditsUsed = estimateKvWriteCredits();
		await doSettle(creditsUsed);

		const responseBody = {
			object: "storage.kv.put" as const,
			stream_id: streamId,
			key: payload.key,
			tx_hash: result.txHash,
		};

		await finalizeRequest(
			requestId,
			{
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				creditsUsed,
			},
			{
				verified: true,
				verificationMode: "tee",
				provider: "0g-storage",
			},
			responseBody,
		);

		return NextResponse.json(
			{
				...responseBody,
				huru: {
					request_id: requestId,
					credits_used: creditsUsed,
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
			"storage_error",
			error instanceof Error ? error.message : String(error),
		);
		return jsonError(
			503,
			"provider_error",
			"storage_unavailable",
			error instanceof Error ? error.message : "Storage unavailable.",
		);
	}
}
