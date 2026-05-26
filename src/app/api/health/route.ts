import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/huru/cache";
import { runtimeConfig } from "@/lib/huru/config";
import { getProjectSnapshot } from "@/lib/huru/store";

export async function GET() {
  const project = await getProjectSnapshot();

  return NextResponse.json({
    status: "ok",
    service: "huru-api",
    runtime_mode: runtimeConfig.runtimeMode,
    bootstrap_project: {
      id: project.publicId,
      credits_balance: project.creditsBalance,
    },
    integrations: {
      supabase: Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey),
      paystack: Boolean(runtimeConfig.paystackSecretKey),
      zero_g: Boolean(runtimeConfig.zeroGPrivateKey),
    },
    cache: getCacheStats(),
  });
}
