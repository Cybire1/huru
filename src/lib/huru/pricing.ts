import { creditPacks } from "@/lib/huru/config";
import { getModelTierDescriptors } from "@/lib/huru/model-tiers";

export { getModelMultiplier, getModelTier } from "@/lib/huru/model-tiers";

export interface PricingRate {
	endpoint: string;
	model: string;
	unit: string;
	creditsPerUnit: number;
}

/**
 * Flat pricing — same credit rate across all models.
 * 1 credit = 1,000 tokens (chat), 40 credits = 1 image (1024x1024), 2 credits = 10s audio.
 *
 * Why flat? Predictability beats theoretical margin. Users see one rate and
 * trust the number on the dashboard. Premium-model cost variance is absorbed
 * by routing-layer defaults (Economy models first).
 */

export const CREDITS_PER_1K_TOKENS = 1;
export const CREDITS_PER_IMAGE_1024 = 40;
export const CREDITS_PER_10S_AUDIO = 2;

export const pricingRates: PricingRate[] = [
	{
		endpoint: "/v1/chat/completions",
		model: "all chat models",
		unit: "1K tokens",
		creditsPerUnit: CREDITS_PER_1K_TOKENS,
	},
	{
		endpoint: "/v1/audio/transcriptions",
		model: "huru/stt-1",
		unit: "10 seconds of audio",
		creditsPerUnit: CREDITS_PER_10S_AUDIO,
	},
	{
		endpoint: "/v1/images/generations",
		model: "huru/img-1",
		unit: "1 image (1024x1024)",
		creditsPerUnit: CREDITS_PER_IMAGE_1024,
	},
];

export function getPricingResponse() {
	return {
		object: "pricing",
		rates: pricingRates.map((rate) => ({
			endpoint: rate.endpoint,
			model: rate.model,
			unit: rate.unit,
			credits_per_unit: rate.creditsPerUnit,
		})),
		model_tiers: getModelTierDescriptors(),
		credit_packs: creditPacks.map((pack) => ({
			pack_id: pack.packId,
			name: pack.name,
			amount_minor: pack.amountMinor,
			currency: pack.currency,
			credits_awarded: pack.creditsAwarded,
			rate_per_credit:
				Math.round((pack.amountMinor / pack.creditsAwarded) * 100) / 100,
		})),
	};
}
