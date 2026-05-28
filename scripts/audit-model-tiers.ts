/**
 * Audit the static model-tier assignments in src/lib/huru/model-tiers.ts
 * against the actual upstream prices reported by the 0G compute broker.
 *
 * Usage:
 *   npx tsx scripts/audit-model-tiers.ts
 *
 * Requires ZERO_G_PRIVATE_KEY and ZERO_G_NETWORK in .env.local.
 *
 * What it does:
 *   1. Connects to the broker with the configured wallet
 *   2. Calls broker.inference.listService() for the live provider catalog
 *   3. Computes each model's relative cost (inputPrice + outputPrice in neurons)
 *   4. Bins models into terciles of actual cost (true economy/standard/premium)
 *   5. Compares the actual bin to our static tier assignment
 *   6. Flags mismatches — models where our tier under-prices the upstream
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { getModelTier, type ModelTier } from "../src/lib/huru/model-tiers";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const ZERO_G_RPC: Record<string, string> = {
	mainnet: "https://evmrpc.0g.ai",
	testnet: "https://evmrpc-testnet.0g.ai",
};

interface ServiceRecord {
	provider: string;
	model: string;
	serviceType: string;
	inputPrice: bigint;
	outputPrice: bigint;
	totalPrice: bigint; // 1K in + 1K out, normalized
	verifiability?: string;
}

function actualTierByCostRank(rank: number, total: number): ModelTier {
	const tercile = Math.floor((rank * 3) / total);
	if (tercile === 0) return "economy";
	if (tercile === 1) return "standard";
	return "premium";
}

const TIER_ORDER: Record<ModelTier, number> = {
	economy: 0,
	standard: 1,
	premium: 2,
};

async function main() {
	const privateKey = process.env.ZERO_G_PRIVATE_KEY?.trim();
	if (!privateKey) {
		console.error("✗ ZERO_G_PRIVATE_KEY not set in .env.local");
		process.exit(1);
	}

	const network = process.env.ZERO_G_NETWORK?.trim() === "mainnet" ? "mainnet" : "testnet";
	console.log(`→ Connecting to 0G ${network}…`);

	const provider = new ethers.JsonRpcProvider(ZERO_G_RPC[network]);
	const wallet = new ethers.Wallet(privateKey, provider);
	const broker = await createZGComputeNetworkBroker(wallet);

	console.log(`→ Fetching provider catalog…\n`);
	const services = (await broker.inference.listService()) as unknown[];

	const chatbots: ServiceRecord[] = services
		.map((s) => s as Record<string, unknown>)
		.filter((s) => String(s.serviceType ?? "") === "chatbot")
		.map((s) => {
			const inputPrice = BigInt(String(s.inputPrice ?? 0));
			const outputPrice = BigInt(String(s.outputPrice ?? 0));
			return {
				provider: String(s.provider ?? ""),
				model: String(s.model ?? ""),
				serviceType: String(s.serviceType ?? ""),
				inputPrice,
				outputPrice,
				totalPrice: inputPrice + outputPrice, // cost for 1K in + 1K out (proxy)
				verifiability: s.verifiability ? String(s.verifiability) : undefined,
			};
		});

	if (chatbots.length === 0) {
		console.error("✗ No chatbot services found on the broker.");
		process.exit(1);
	}

	// Deduplicate by model name — multiple providers may host the same model.
	// Use the median price across providers for each model.
	const byModel = new Map<string, bigint[]>();
	for (const s of chatbots) {
		const arr = byModel.get(s.model) ?? [];
		arr.push(s.totalPrice);
		byModel.set(s.model, arr);
	}

	const uniqueModels = Array.from(byModel.entries()).map(([model, prices]) => {
		const sorted = [...prices].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
		const median = sorted[Math.floor(sorted.length / 2)];
		return { model, medianPrice: median, providerCount: prices.length };
	});

	uniqueModels.sort((a, b) =>
		a.medianPrice < b.medianPrice ? -1 : a.medianPrice > b.medianPrice ? 1 : 0,
	);

	console.log("Model price audit (sorted by actual upstream cost, low → high):");
	console.log("=".repeat(110));
	console.log(
		[
			"Rank".padEnd(5),
			"Model".padEnd(40),
			"Providers".padEnd(10),
			"Cost (neurons, 1K+1K)".padEnd(22),
			"Actual tier".padEnd(12),
			"Static tier".padEnd(12),
			"Status",
		].join(" "),
	);
	console.log("-".repeat(110));

	const mismatches: { model: string; static: ModelTier; actual: ModelTier; cost: bigint }[] = [];

	uniqueModels.forEach((entry, idx) => {
		const actualTier = actualTierByCostRank(idx, uniqueModels.length);
		const staticTier = getModelTier(entry.model);
		const ok = TIER_ORDER[staticTier] >= TIER_ORDER[actualTier];
		const status = ok
			? actualTier === staticTier
				? "✓ match"
				: "↑ over-charge (safe)"
			: "✗ UNDER-CHARGE";

		console.log(
			[
				String(idx + 1).padEnd(5),
				entry.model.slice(0, 38).padEnd(40),
				String(entry.providerCount).padEnd(10),
				entry.medianPrice.toString().padEnd(22),
				actualTier.padEnd(12),
				staticTier.padEnd(12),
				status,
			].join(" "),
		);

		if (!ok) {
			mismatches.push({
				model: entry.model,
				static: staticTier,
				actual: actualTier,
				cost: entry.medianPrice,
			});
		}
	});

	console.log("=".repeat(110));

	if (mismatches.length === 0) {
		console.log("\n✓ All static tier assignments are safe (>= actual).");
	} else {
		console.log(`\n✗ ${mismatches.length} model(s) UNDER-CHARGED — losing margin:`);
		for (const m of mismatches) {
			console.log(`  - ${m.model}: static=${m.static}, should be ≥${m.actual}`);
		}
		console.log(
			"\nFix: update src/lib/huru/model-tiers.ts TIER_ASSIGNMENTS to bump these models.",
		);
		process.exitCode = 2;
	}
}

main().catch((error) => {
	console.error("✗ Audit failed:", error instanceof Error ? error.message : error);
	process.exit(1);
});
