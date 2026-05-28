/**
 * Model tiers — credit cost multiplier per model class.
 *
 * Rationale: 0G provider prices vary 5-20x between cheapest (DeepSeek-class)
 * and most expensive (Llama-405B-class) models. Flat pricing leaves a margin
 * leak when users route premium models. Three-tier system caps the leak while
 * staying simple to communicate.
 *
 * Tier multiplier is applied on top of the baseline 1 credit per 1K tokens.
 * Default tier for unknown models is "standard" — better to over-charge
 * slightly than to under-charge.
 */

export type ModelTier = "economy" | "standard" | "premium";

export const TIER_MULTIPLIERS: Record<ModelTier, number> = {
	economy: 1,
	standard: 2.5,
	premium: 6,
};

/**
 * Tier assignments. Lower-cased lookup, partial-match by substring.
 *
 * - Huru aliases (e.g. "huru/chat-1") are mapped directly.
 * - Upstream model names (deepseek-v3, llama-3.3-70b, etc.) are mapped as
 *   fallback so requests that bypass aliases still get tiered correctly.
 */
const TIER_ASSIGNMENTS: Array<{ match: string; tier: ModelTier }> = [
	// ── Huru aliases ──
	{ match: "huru/chat-1", tier: "economy" },
	{ match: "huru/chat-economy", tier: "economy" },
	{ match: "huru/chat-pro", tier: "standard" },
	{ match: "huru/chat-standard", tier: "standard" },
	{ match: "huru/chat-max", tier: "premium" },
	{ match: "huru/chat-premium", tier: "premium" },

	// ── Economy: ~1x baseline cost ──
	{ match: "deepseek-chat", tier: "economy" },
	{ match: "deepseek-v3", tier: "economy" },
	{ match: "deepseek-r1", tier: "economy" },
	{ match: "llama-3.1-8b", tier: "economy" },
	{ match: "llama-3.2-3b", tier: "economy" },
	{ match: "qwen-2.5-7b", tier: "economy" },

	// ── Standard: ~2.5x baseline cost ──
	{ match: "llama-3.1-70b", tier: "standard" },
	{ match: "llama-3.3-70b", tier: "standard" },
	{ match: "qwen-2.5-72b", tier: "standard" },
	{ match: "mistral-large", tier: "standard" },
	{ match: "phi-4", tier: "standard" },

	// ── Premium: ~6x baseline cost (big models / specialty) ──
	{ match: "llama-3.1-405b", tier: "premium" },
	{ match: "qwen-2.5-32b-coder", tier: "premium" },
	{ match: "qwq-32b", tier: "premium" },
	{ match: "gpt-oss-120b", tier: "premium" },
	{ match: "gpt-oss", tier: "premium" },
];

export function getModelTier(model: string | undefined): ModelTier {
	if (!model) return "standard";
	const normalized = model.toLowerCase().trim();
	for (const { match, tier } of TIER_ASSIGNMENTS) {
		if (normalized.includes(match)) {
			return tier;
		}
	}
	// Unknown model → default to standard (safer than charging economy).
	return "standard";
}

export function getModelMultiplier(model: string | undefined): number {
	return TIER_MULTIPLIERS[getModelTier(model)];
}

/**
 * Public-facing tier descriptors for the /v1/pricing endpoint.
 * Devs see these so they can predict cost before calling.
 */
export function getModelTierDescriptors() {
	return [
		{
			tier: "economy" as ModelTier,
			multiplier: TIER_MULTIPLIERS.economy,
			credits_per_1k_tokens: TIER_MULTIPLIERS.economy,
			models: TIER_ASSIGNMENTS.filter((a) => a.tier === "economy").map((a) => a.match),
			description: "Small, fast models — good for chat, simple tasks.",
		},
		{
			tier: "standard" as ModelTier,
			multiplier: TIER_MULTIPLIERS.standard,
			credits_per_1k_tokens: TIER_MULTIPLIERS.standard,
			models: TIER_ASSIGNMENTS.filter((a) => a.tier === "standard").map((a) => a.match),
			description: "Mid-size models — balanced quality and cost.",
		},
		{
			tier: "premium" as ModelTier,
			multiplier: TIER_MULTIPLIERS.premium,
			credits_per_1k_tokens: TIER_MULTIPLIERS.premium,
			models: TIER_ASSIGNMENTS.filter((a) => a.tier === "premium").map((a) => a.match),
			description: "Large/specialty models — best quality, highest cost.",
		},
	];
}
