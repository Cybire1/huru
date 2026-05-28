import { type NextRequest, NextResponse } from "next/server";
import {
	jsonError,
	jsonErrorWithBody,
	jsonErrorWithHeaders,
} from "@/lib/huru/errors";
import { makeRequestId } from "@/lib/huru/http";
import { runtimeConfig } from "@/lib/huru/config";
import { createQuickCheckoutUrl } from "@/lib/huru/paystack";
import { checkRateLimit } from "@/lib/huru/rate-limit";
import { isAuthError, resolveRequestAuth } from "@/lib/huru/resolve-auth";
import {
	estimateStorageUploadCredits,
	uploadFile,
} from "@/lib/huru/storage";
import {
	encryptManaged,
	isValidEncryptionMode,
	wrapClient,
	type EncryptionMode,
} from "@/lib/huru/encryption";
import {
	getConsumerEncryptionKey,
	getStorageWalletForConsumer,
} from "@/lib/huru/wallet-manager";
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

	const formData = await request.formData().catch(() => null);
	const file = formData?.get("file");

	if (!(file instanceof File)) {
		return jsonError(
			400,
			"invalid_request",
			"missing_file",
			"A file upload is required.",
		);
	}

	if (file.size > runtimeConfig.storageMaxFileSizeBytes) {
		const maxMb = Math.round(runtimeConfig.storageMaxFileSizeBytes / (1024 * 1024));
		return jsonError(
			400,
			"invalid_request",
			"file_too_large",
			`File exceeds maximum size of ${maxMb}MB.`,
		);
	}

	if (file.size === 0) {
		return jsonError(
			400,
			"invalid_request",
			"empty_file",
			"File must not be empty.",
		);
	}

	const encryptionHeader = (request.headers.get("X-Huru-Encryption") || "managed").toLowerCase();
	if (!isValidEncryptionMode(encryptionHeader)) {
		return jsonError(
			400,
			"invalid_request",
			"invalid_encryption_mode",
			"X-Huru-Encryption must be one of: managed, none, client.",
		);
	}
	const encryptionMode: EncryptionMode = encryptionHeader;

	const requestId = makeRequestId();
	const estimatedCredits = estimateStorageUploadCredits(file.size);

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
			endpoint: "/v1/storage/upload",
			method: "POST",
			model: "0g/storage",
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
		const arrayBuffer = await file.arrayBuffer();
		const plaintext = Buffer.from(arrayBuffer);
		const plaintextSize = plaintext.length;

		let payload: Buffer;
		if (encryptionMode === "managed") {
			const consumerKey = await getConsumerEncryptionKey(consumer);
			payload = encryptManaged(plaintext, consumerKey);
		} else if (encryptionMode === "client") {
			payload = wrapClient(plaintext);
		} else {
			payload = plaintext;
		}

		const wallet = await getStorageWalletForConsumer(consumer);
		const result = await uploadFile(payload, wallet);

		// Bill on plaintext size — the envelope overhead is Huru's concern, not the user's.
		const creditsUsed = estimateStorageUploadCredits(plaintextSize);
		await doSettle(creditsUsed);

		const responseBody = {
			object: "storage.upload" as const,
			root_hash: result.rootHash,
			tx_hash: result.txHash,
			size: plaintextSize,
			encryption: encryptionMode,
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
					"x-huru-encryption": encryptionMode,
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
