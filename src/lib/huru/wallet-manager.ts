import { hkdfSync } from "node:crypto";
import { ethers } from "ethers";
import { runtimeConfig } from "@/lib/huru/config";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/huru/supabase";
import type { HuruConsumerRecord } from "@/lib/huru/types";

// HD derivation path: BIP-44 Ethereum coin type, account 0, external chain.
// Consumer derivation_index becomes the address index.
const HD_PATH_PREFIX = "m/44'/60'/0'/0/";
// Separate HD chain (1) for encryption material so it can't leak signing keys.
const HD_ENC_PATH_PREFIX = "m/44'/60'/0'/1/";

const ENCRYPTION_INFO = Buffer.from("huru:encryption:v1", "utf8");
const ENCRYPTION_SALT_FALLBACK = Buffer.from("huru:encryption:fallback:v1", "utf8");

const zeroGRpcByNetwork = {
	mainnet: "https://evmrpc.0g.ai",
	testnet: "https://evmrpc-testnet.0g.ai",
} as const;

// ── Lazy singletons ──

let providerInstance: ethers.JsonRpcProvider | null = null;
let masterNodeInstance: ethers.HDNodeWallet | null = null;
let dripWalletInstance: ethers.Wallet | null = null;

function getProvider(): ethers.JsonRpcProvider {
	if (!providerInstance) {
		const network = runtimeConfig.zeroGNetwork === "mainnet" ? "mainnet" : "testnet";
		providerInstance = new ethers.JsonRpcProvider(zeroGRpcByNetwork[network]);
	}
	return providerInstance;
}

function getMasterNode(): ethers.HDNodeWallet | null {
	if (!runtimeConfig.walletMasterMnemonic) {
		return null;
	}
	if (!masterNodeInstance) {
		const node = ethers.HDNodeWallet.fromPhrase(runtimeConfig.walletMasterMnemonic);
		// `fromPhrase` already includes a default derivation path; we derive from root.
		masterNodeInstance = node;
	}
	return masterNodeInstance;
}

function getDripWallet(): ethers.Wallet | null {
	if (!runtimeConfig.zeroGPrivateKey) {
		return null;
	}
	if (!dripWalletInstance) {
		dripWalletInstance = new ethers.Wallet(runtimeConfig.zeroGPrivateKey, getProvider());
	}
	return dripWalletInstance;
}

// ── DB access ──

interface ConsumerWalletRow {
	consumer_id: string;
	derivation_index: number | string;
	address: string;
	last_funded_at: string | null;
	lifetime_gas_funded: number | string;
}

async function getOrCreateWalletRow(
	consumerStorageId: string,
): Promise<{ derivationIndex: number; address: string } | null> {
	const supabase = getSupabaseAdmin();
	if (!supabase) {
		return null;
	}

	const existing = await supabase
		.from("huru_consumer_wallets")
		.select("consumer_id, derivation_index, address, last_funded_at, lifetime_gas_funded")
		.eq("consumer_id", consumerStorageId)
		.maybeSingle<ConsumerWalletRow>();

	if (existing.error) {
		throw existing.error;
	}

	if (existing.data) {
		return {
			derivationIndex: Number(existing.data.derivation_index),
			address: existing.data.address,
		};
	}

	const master = getMasterNode();
	if (!master) {
		return null;
	}

	// Allocate next derivation index via the sequence default, then derive address.
	// We insert with a placeholder address, read back the assigned index, derive,
	// then update. Two-step to avoid relying on the sequence value from outside.
	const inserted = await supabase
		.from("huru_consumer_wallets")
		.insert({
			consumer_id: consumerStorageId,
			address: "0x0000000000000000000000000000000000000000",
			network: runtimeConfig.zeroGNetwork,
		})
		.select("derivation_index")
		.single<{ derivation_index: number | string }>();

	if (inserted.error) {
		// Duplicate insert race — re-read.
		const retry = await supabase
			.from("huru_consumer_wallets")
			.select("derivation_index, address")
			.eq("consumer_id", consumerStorageId)
			.single<{ derivation_index: number | string; address: string }>();

		if (retry.error || !retry.data) {
			throw inserted.error;
		}

		return {
			derivationIndex: Number(retry.data.derivation_index),
			address: retry.data.address,
		};
	}

	const derivationIndex = Number(inserted.data.derivation_index);
	const childWallet = master.derivePath(`${HD_PATH_PREFIX}${derivationIndex}`);
	const address = childWallet.address;

	const updated = await supabase
		.from("huru_consumer_wallets")
		.update({ address, updated_at: new Date().toISOString() })
		.eq("consumer_id", consumerStorageId);

	if (updated.error) {
		throw updated.error;
	}

	return { derivationIndex, address };
}

async function recordDripFunding(
	consumerStorageId: string,
	amountA0G: number,
): Promise<void> {
	const supabase = getSupabaseAdmin();
	if (!supabase) {
		return;
	}

	// Read current lifetime to avoid CAS — drip is idempotent enough that a small
	// race here just under-counts; not worth a transaction.
	const current = await supabase
		.from("huru_consumer_wallets")
		.select("lifetime_gas_funded")
		.eq("consumer_id", consumerStorageId)
		.maybeSingle<{ lifetime_gas_funded: number | string }>();

	const lifetime = Number(current.data?.lifetime_gas_funded ?? 0) + amountA0G;

	await supabase
		.from("huru_consumer_wallets")
		.update({
			last_funded_at: new Date().toISOString(),
			lifetime_gas_funded: lifetime,
			updated_at: new Date().toISOString(),
		})
		.eq("consumer_id", consumerStorageId);
}

// ── Drip funding ──

async function dripFundIfNeeded(
	consumerStorageId: string,
	address: string,
): Promise<void> {
	const drip = getDripWallet();
	if (!drip) {
		throw new Error("ZERO_G_PRIVATE_KEY is not configured.");
	}

	const provider = getProvider();
	const balanceWei = await provider.getBalance(address);
	const thresholdWei = ethers.parseEther(String(runtimeConfig.walletDripThreshold));

	if (balanceWei >= thresholdWei) {
		return;
	}

	const dripAmountWei = ethers.parseEther(String(runtimeConfig.walletDripAmount));
	const tx = await drip.sendTransaction({
		to: address,
		value: dripAmountWei,
	});
	await tx.wait();

	await recordDripFunding(consumerStorageId, runtimeConfig.walletDripAmount);
}

// ── Public API ──

/**
 * Returns a Wallet bound to the storage provider for the given consumer.
 *
 * - With a master mnemonic + Supabase configured: returns an HD-derived
 *   per-consumer wallet, drip-funded with gas on first use.
 * - Otherwise: falls back to the master ZERO_G_PRIVATE_KEY wallet (current
 *   single-wallet behavior).
 */
export async function getStorageWalletForConsumer(
	consumer: HuruConsumerRecord,
): Promise<ethers.Wallet> {
	const drip = getDripWallet();
	if (!drip) {
		throw new Error("ZERO_G_PRIVATE_KEY is not configured.");
	}

	const master = getMasterNode();
	if (!master || !hasSupabaseAdminConfig() || !consumer.storageId) {
		// No HD setup — degrade to single master wallet (current behavior).
		return drip;
	}

	const record = await getOrCreateWalletRow(consumer.storageId);
	if (!record) {
		return drip;
	}

	const childNode = master.derivePath(`${HD_PATH_PREFIX}${record.derivationIndex}`);
	const wallet = new ethers.Wallet(childNode.privateKey, getProvider());

	await dripFundIfNeeded(consumer.storageId, wallet.address);

	return wallet;
}

/**
 * Returns the wallet address that would be (or already is) assigned to a
 * consumer. Useful for the dashboard — does not trigger funding.
 */
export async function getConsumerWalletAddress(
	consumer: HuruConsumerRecord,
): Promise<string | null> {
	const master = getMasterNode();
	if (!master || !hasSupabaseAdminConfig() || !consumer.storageId) {
		return null;
	}

	const supabase = getSupabaseAdmin();
	if (!supabase) {
		return null;
	}

	const result = await supabase
		.from("huru_consumer_wallets")
		.select("address")
		.eq("consumer_id", consumer.storageId)
		.maybeSingle<{ address: string }>();

	return result.data?.address ?? null;
}

/**
 * Derive a 32-byte symmetric encryption key for a consumer.
 *
 * - HD setup available: HKDF off the consumer's encryption-chain HD child key
 *   (chain 1, isolated from signing keys on chain 0).
 * - Fallback: HKDF off ZERO_G_PRIVATE_KEY with consumer.id as salt — every
 *   consumer still gets a unique-ish KEK even without the master mnemonic.
 *
 * Used by storage envelope encryption (see encryption.ts).
 */
export async function getConsumerEncryptionKey(
	consumer: HuruConsumerRecord,
): Promise<Buffer> {
	const master = getMasterNode();
	if (master && hasSupabaseAdminConfig() && consumer.storageId) {
		const record = await getOrCreateWalletRow(consumer.storageId);
		if (record) {
			const childNode = master.derivePath(`${HD_ENC_PATH_PREFIX}${record.derivationIndex}`);
			const ikm = Buffer.from(childNode.privateKey.replace(/^0x/, ""), "hex");
			const arrayBuf = hkdfSync("sha256", ikm, ENCRYPTION_SALT_FALLBACK, ENCRYPTION_INFO, 32);
			return Buffer.from(arrayBuf);
		}
	}

	if (!runtimeConfig.zeroGPrivateKey) {
		throw new Error(
			"Encryption requires ZERO_G_PRIVATE_KEY (and optionally HURU_WALLET_MASTER_MNEMONIC).",
		);
	}

	const masterIkm = Buffer.from(runtimeConfig.zeroGPrivateKey.replace(/^0x/, ""), "hex");
	const salt = Buffer.from(consumer.id, "utf8");
	const arrayBuf = hkdfSync("sha256", masterIkm, salt, ENCRYPTION_INFO, 32);
	return Buffer.from(arrayBuf);
}
