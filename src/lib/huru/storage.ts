import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, unlink } from "node:fs/promises";
import {
	Indexer,
	KvClient,
	Batcher,
	StreamDataBuilder,
	MemData,
	getFlowContract,
} from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import { runtimeConfig } from "@/lib/huru/config";

// ── Types ──

export interface StorageUploadResult {
	rootHash: string;
	txHash: string;
	size: number;
}

export interface StorageKvWriteResult {
	txHash: string;
	rootHash: string;
}

// ── RPC endpoints (same as runtime.ts) ──

const zeroGRpcByNetwork = {
	mainnet: "https://evmrpc.0g.ai",
	testnet: "https://evmrpc-testnet.0g.ai",
} as const;

function blockchainRpcUrl(): string {
	const network = runtimeConfig.zeroGNetwork === "mainnet" ? "mainnet" : "testnet";
	return zeroGRpcByNetwork[network];
}

// ── Lazy read-only clients (no signer needed) ──

let indexerInstance: Indexer | null = null;
let kvClientInstance: KvClient | null = null;

function getIndexer(): Indexer {
	if (!runtimeConfig.storageIndexerUrl) {
		throw new Error("ZERO_G_INDEXER_URL is not configured.");
	}
	if (!indexerInstance) {
		indexerInstance = new Indexer(runtimeConfig.storageIndexerUrl);
	}
	return indexerInstance;
}

function getKvClient(): KvClient {
	if (!runtimeConfig.storageKvUrl) {
		throw new Error("ZERO_G_KV_URL is not configured.");
	}
	if (!kvClientInstance) {
		kvClientInstance = new KvClient(runtimeConfig.storageKvUrl);
	}
	return kvClientInstance;
}

// ── Credit estimation ──

export function estimateStorageUploadCredits(sizeBytes: number): number {
	const tenKbUnits = Math.ceil(sizeBytes / (10 * 1024));
	return Math.max(1, Math.ceil(tenKbUnits * runtimeConfig.storageCreditsPerTenKb));
}

export function estimateStorageDownloadCredits(): number {
	return 1;
}

export function estimateKvWriteCredits(): number {
	return 2;
}

export function estimateKvReadCredits(): number {
	return 1;
}

// ── Write operations (require signer) ──

export async function uploadFile(
	data: Buffer,
	signer: ethers.Wallet,
): Promise<StorageUploadResult> {
	const indexer = getIndexer();
	const memData = new MemData(new Uint8Array(data));

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- CJS/ESM ethers type mismatch at SDK boundary
	const [result, error] = await indexer.upload(
		memData,
		blockchainRpcUrl(),
		signer as any,
	);

	if (error) {
		throw new Error(`0G upload failed: ${error.message}`);
	}

	return {
		rootHash: result.rootHash,
		txHash: result.txHash,
		size: data.length,
	};
}

export async function kvPut(
	streamId: string,
	key: string,
	value: string,
	signer: ethers.Wallet,
): Promise<StorageKvWriteResult> {
	if (!runtimeConfig.storageFlowContractAddress) {
		throw new Error("ZERO_G_FLOW_CONTRACT is not configured.");
	}
	if (!runtimeConfig.storageNodeUrl) {
		throw new Error("ZERO_G_STORAGE_NODE_URL is not configured.");
	}

	const indexer = getIndexer();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- CJS/ESM ethers type mismatch
	const flow = getFlowContract(
		runtimeConfig.storageFlowContractAddress,
		signer as any,
	);

	const [nodes, selectError] = await indexer.selectNodes(1);
	if (selectError) {
		throw new Error(`Failed to select storage nodes: ${selectError.message}`);
	}

	const builder = new StreamDataBuilder(0);
	builder.set(
		streamId,
		new TextEncoder().encode(key),
		new TextEncoder().encode(value),
	);

	const batcher = new Batcher(0, nodes, flow, blockchainRpcUrl());
	batcher.streamDataBuilder = builder;

	const [result, error] = await batcher.exec();
	if (error) {
		throw new Error(`0G KV write failed: ${error.message}`);
	}

	return {
		txHash: result.txHash,
		rootHash: result.rootHash,
	};
}

// ── Read operations (no signer needed) ──

export async function downloadFile(rootHash: string): Promise<Buffer> {
	const indexer = getIndexer();
	const tempPath = join(
		tmpdir(),
		`huru-dl-${crypto.randomUUID().slice(0, 12)}`,
	);

	try {
		const error = await indexer.download(rootHash, tempPath, false);
		if (error) {
			throw new Error(`0G download failed: ${error.message}`);
		}

		return await readFile(tempPath);
	} finally {
		await unlink(tempPath).catch(() => {
			// ignore cleanup errors
		});
	}
}

export async function kvGet(
	streamId: string,
	key: string,
): Promise<string | null> {
	const kvClient = getKvClient();
	const keyBytes = new TextEncoder().encode(key);
	const value = await kvClient.getValue(streamId, keyBytes);

	if (!value) {
		return null;
	}

	const decoded = Buffer.from(value.data, "base64");
	return decoded.toString("utf-8");
}

// ── Helpers ──

export function defaultStreamId(projectPublicId: string): string {
	return ethers.keccak256(
		new TextEncoder().encode(`huru:kv:${projectPublicId}`),
	);
}
