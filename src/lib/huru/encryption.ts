import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Envelope encryption for 0G storage payloads.
 *
 * Why: 0G Storage is public, content-addressable storage with no native
 * encryption. Anyone with the root hash can fetch the bytes. To give
 * consumers privacy we wrap their data in an authenticated envelope
 * before upload.
 *
 * Format (managed mode):
 *   [HEV1] [0x01]                      // magic + mode (5 bytes)
 *   [dek_nonce]                        // 12 bytes
 *   [dek_tag]                          // 16 bytes
 *   [encrypted_dek]                    // 32 bytes
 *   [content_nonce]                    // 12 bytes
 *   [content_tag]                      // 16 bytes
 *   [ciphertext]                       // variable
 *
 *   Total overhead: 93 bytes per file.
 *
 * Format (client mode):
 *   [HEV1] [0x02] [client-supplied ciphertext]
 *
 *   Huru never sees plaintext; just routes the bytes through. Client
 *   manages its own keys.
 *
 * Format (none mode):
 *   raw bytes, no envelope. Anyone with rootHash can read. Use for
 *   public assets where addressing matters more than privacy.
 *
 * Crypto choices:
 *   - AES-256-GCM for both DEK and content (authenticated, fast, standard)
 *   - Random 12-byte nonces per encryption (never reused under same key)
 *   - 32-byte random DEK per file (compromise of one DEK leaks one file)
 *   - Consumer KEK (key-encryption-key) derived via HKDF — see wallet-manager
 */

export type EncryptionMode = "managed" | "none" | "client";

const MAGIC = Buffer.from("HEV1", "ascii");
const MODE_MANAGED = 0x01;
const MODE_CLIENT = 0x02;

const DEK_LENGTH = 32;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + 1; // magic + mode byte
const MANAGED_PREFIX_LENGTH =
	HEADER_LENGTH + NONCE_LENGTH + TAG_LENGTH + DEK_LENGTH + NONCE_LENGTH + TAG_LENGTH;

export class DecryptionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DecryptionError";
	}
}

export function isValidEncryptionMode(value: unknown): value is EncryptionMode {
	return value === "managed" || value === "none" || value === "client";
}

/**
 * Encrypt a plaintext buffer with envelope encryption. Generates a random
 * DEK, encrypts the DEK with the consumer KEK, encrypts the content with
 * the DEK, and packs everything into the envelope format above.
 */
export function encryptManaged(
	plaintext: Buffer,
	consumerKey: Buffer,
): Buffer {
	if (consumerKey.length !== 32) {
		throw new Error(`consumerKey must be 32 bytes, got ${consumerKey.length}`);
	}

	const dek = randomBytes(DEK_LENGTH);

	const dekNonce = randomBytes(NONCE_LENGTH);
	const dekCipher = createCipheriv("aes-256-gcm", consumerKey, dekNonce);
	const encryptedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
	const dekTag = dekCipher.getAuthTag();

	const contentNonce = randomBytes(NONCE_LENGTH);
	const contentCipher = createCipheriv("aes-256-gcm", dek, contentNonce);
	const ciphertext = Buffer.concat([
		contentCipher.update(plaintext),
		contentCipher.final(),
	]);
	const contentTag = contentCipher.getAuthTag();

	return Buffer.concat([
		MAGIC,
		Buffer.from([MODE_MANAGED]),
		dekNonce,
		dekTag,
		encryptedDek,
		contentNonce,
		contentTag,
		ciphertext,
	]);
}

/** Wrap client-side ciphertext with the envelope header (no Huru crypto). */
export function wrapClient(rawCiphertext: Buffer): Buffer {
	return Buffer.concat([MAGIC, Buffer.from([MODE_CLIENT]), rawCiphertext]);
}

/**
 * Inspect downloaded bytes and decrypt if encrypted.
 *
 * - No envelope (no HEV1 magic) → returns the raw bytes as "none".
 * - Managed envelope → decrypts with consumerKey, returns plaintext.
 *   GCM tag mismatch (wrong key, tampered bytes) throws DecryptionError.
 * - Client envelope → strips the 5-byte header, returns the inner bytes
 *   for the client to decrypt itself.
 */
export function decryptIfEncrypted(
	bytes: Buffer,
	consumerKey: Buffer | null,
): { plaintext: Buffer; mode: EncryptionMode } {
	if (bytes.length < HEADER_LENGTH || !bytes.subarray(0, MAGIC.length).equals(MAGIC)) {
		return { plaintext: bytes, mode: "none" };
	}

	const mode = bytes[MAGIC.length];

	if (mode === MODE_CLIENT) {
		return { plaintext: bytes.subarray(HEADER_LENGTH), mode: "client" };
	}

	if (mode === MODE_MANAGED) {
		if (!consumerKey) {
			throw new DecryptionError(
				"This file is managed-encrypted but no consumer key is available.",
			);
		}
		if (bytes.length < MANAGED_PREFIX_LENGTH) {
			throw new DecryptionError("Envelope truncated — header incomplete.");
		}

		let offset = HEADER_LENGTH;
		const dekNonce = bytes.subarray(offset, offset + NONCE_LENGTH);
		offset += NONCE_LENGTH;
		const dekTag = bytes.subarray(offset, offset + TAG_LENGTH);
		offset += TAG_LENGTH;
		const encryptedDek = bytes.subarray(offset, offset + DEK_LENGTH);
		offset += DEK_LENGTH;
		const contentNonce = bytes.subarray(offset, offset + NONCE_LENGTH);
		offset += NONCE_LENGTH;
		const contentTag = bytes.subarray(offset, offset + TAG_LENGTH);
		offset += TAG_LENGTH;
		const ciphertext = bytes.subarray(offset);

		let dek: Buffer;
		try {
			const dekDecipher = createDecipheriv("aes-256-gcm", consumerKey, dekNonce);
			dekDecipher.setAuthTag(dekTag);
			dek = Buffer.concat([
				dekDecipher.update(encryptedDek),
				dekDecipher.final(),
			]);
		} catch {
			throw new DecryptionError(
				"Failed to unwrap DEK — wrong consumer key or tampered envelope.",
			);
		}

		let plaintext: Buffer;
		try {
			const contentDecipher = createDecipheriv("aes-256-gcm", dek, contentNonce);
			contentDecipher.setAuthTag(contentTag);
			plaintext = Buffer.concat([
				contentDecipher.update(ciphertext),
				contentDecipher.final(),
			]);
		} catch {
			throw new DecryptionError(
				"Failed to decrypt content — tampered ciphertext or tag mismatch.",
			);
		}

		return { plaintext, mode: "managed" };
	}

	throw new DecryptionError(`Unknown encryption mode byte: 0x${mode.toString(16)}`);
}
