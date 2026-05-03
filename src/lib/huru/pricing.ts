import { creditPacks } from "@/lib/huru/config";

export interface PricingRate {
	endpoint: string;
	model: string;
	unit: string;
	creditsPerUnit: number;
}

export const pricingRates: PricingRate[] = [
	{
		endpoint: "/v1/chat/completions",
		model: "huru/chat-1",
		unit: "1K tokens",
		creditsPerUnit: 1,
	},
	{
		endpoint: "/v1/audio/transcriptions",
		model: "huru/stt-1",
		unit: "10 seconds of audio",
		creditsPerUnit: 2,
	},
	{
		endpoint: "/v1/images/generations",
		model: "huru/img-1",
		unit: "1 image (1024x1024)",
		creditsPerUnit: 10,
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
