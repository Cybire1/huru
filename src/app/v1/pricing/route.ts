import { NextResponse } from "next/server";
import { getPricingResponse } from "@/lib/huru/pricing";

export async function GET() {
	return NextResponse.json(getPricingResponse(), {
		headers: {
			"Cache-Control": "public, max-age=300, s-maxage=600",
		},
	});
}
