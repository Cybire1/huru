import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/huru/cache";
import { runtimeConfig } from "@/lib/huru/config";
import { getProjectSnapshot, getStoreFallbackStatus } from "@/lib/huru/store";

export async function GET() {
  let project = null;
  let storeError: string | null = null;

  try {
    project = await getProjectSnapshot();
  } catch (error) {
    storeError = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "store_unavailable";
  }

  const storeFallback = getStoreFallbackStatus();

  return NextResponse.json({
    status: storeError || storeFallback.usingFallback ? "degraded" : "ok",
    service: "huru-api",
    runtime_mode: runtimeConfig.runtimeMode,
    bootstrap_project: {
      id: project?.publicId ?? "unavailable",
      credits_balance: project?.creditsBalance ?? 0,
    },
    integrations: {
      supabase: Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey),
      paystack: Boolean(runtimeConfig.paystackSecretKey),
      zero_g: Boolean(runtimeConfig.zeroGPrivateKey),
    },
    store: {
      ready: !storeError && !storeFallback.usingFallback,
      error: storeError,
      fallback: storeFallback,
    },
    cache: getCacheStats(),
  });
}
