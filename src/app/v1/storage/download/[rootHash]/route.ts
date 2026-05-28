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
	estimateStorageDownloadCredits,
	downloadFile,
} from "@/lib/huru/storage";
import { DecryptionError, decryptIfEncrypted } from "@/lib/huru/encryption";
import { getConsumerEncryptionKey } from "@/lib/huru/wallet-manager";
import {
	failRequest,
	finalizeRequest,
	preReserveConsumerCredits,
	releaseConsumerReservedCredits,
	saveRequest,
	settleConsumerCredits,
} from "@/lib/huru/store";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ rootHash: string }> },
) {
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

	const { rootHash } = await params;
	if (!rootHash || rootHash.length < 10) {
		return jsonError(
			400,
			"invalid_request",
			"invalid_root_hash",
			"A valid root hash is required.",
		);
	}

	const requestId = makeRequestId();
	const estimatedCredits = estimateStorageDownloadCredits();

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
			endpoint: "/v1/storage/download",
			method: "GET",
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
		const data = await downloadFile(rootHash);

		const consumerKey = await getConsumerEncryptionKey(consumer).catch(() => null);
		let plaintext: Buffer;
		let encryptionMode: string;
		try {
			const result = decryptIfEncrypted(data, consumerKey);
			plaintext = result.plaintext;
			encryptionMode = result.mode;
		} catch (error) {
			await doRelease();
			await failRequest(
				requestId,
				"decryption_error",
				error instanceof Error ? error.message : String(error),
			);
			if (error instanceof DecryptionError) {
				return jsonError(
					403,
					"permission_error",
					"decryption_failed",
					"This file is encrypted and cannot be decrypted with your key. It may belong to a different consumer.",
				);
			}
			throw error;
		}

		const creditsUsed = estimateStorageDownloadCredits();
		await doSettle(creditsUsed);

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
			{
				object: "storage.download",
				root_hash: rootHash,
				size: plaintext.length,
				encryption: encryptionMode,
			},
		);

		return new Response(new Uint8Array(plaintext), {
			headers: {
				"Content-Type": "application/octet-stream",
				"Content-Length": String(plaintext.length),
				"x-request-id": requestId,
				"x-root-hash": rootHash,
				"x-huru-encryption": encryptionMode,
				...rateLimit.headers,
			},
		});
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
