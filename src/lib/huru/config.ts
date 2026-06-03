import type { HuruCreditPack, HuruRuntimeMode } from "@/lib/huru/types";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
const runtimeMode = (process.env.HURU_RUNTIME_MODE?.trim() || "0g") as HuruRuntimeMode;

export const runtimeConfig = {
  appUrl,
  runtimeMode,
  bootstrapApiKey:
    process.env.HURU_BOOTSTRAP_API_KEY?.trim() || "sk_test_huru_local_dev",
  bootstrapCredits: Number.parseInt(process.env.HURU_BOOTSTRAP_CREDITS || "250", 10) || 250,
  defaultCurrency: process.env.HURU_DEFAULT_CURRENCY?.trim() || "NGN",
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY?.trim() || "",
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY?.trim() || "",
  paystackWebhookSigningKey:
    process.env.PAYSTACK_WEBHOOK_SECRET?.trim() ||
    process.env.PAYSTACK_SECRET_KEY?.trim() ||
    "",
  supabaseUrl: process.env.SUPABASE_URL?.trim() || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY?.trim() || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
  zeroGNetwork: process.env.ZERO_G_NETWORK?.trim() || "testnet",
  zeroGPrivateKey: process.env.ZERO_G_PRIVATE_KEY?.trim() || "",
  zeroGProviderAddress: process.env.ZERO_G_PROVIDER_ADDRESS?.trim() || "",
  rateLimitPerMinute:
    Number.parseInt(process.env.HURU_RATE_LIMIT_PER_MINUTE || "60", 10) || 60,
  rateLimitPerDay:
    Number.parseInt(process.env.HURU_RATE_LIMIT_PER_DAY || "1000", 10) || 1000,
  consumerTokenSecret:
    process.env.HURU_CONSUMER_TOKEN_SECRET?.trim() ||
    "dev-consumer-token-secret-change-me",
  consumerStarterCredits:
    Number.parseInt(process.env.HURU_CONSUMER_STARTER_CREDITS || "200", 10) || 200,
  cacheEnabled:
    (process.env.HURU_CACHE_ENABLED?.trim().toLowerCase() ?? "true") !== "false",
  cacheTtlMs:
    (Number.parseInt(process.env.HURU_CACHE_TTL_SECONDS || "300", 10) || 300) * 1000,
  cacheMaxEntries:
    Number.parseInt(process.env.HURU_CACHE_MAX_ENTRIES || "200", 10) || 200,
  storageNodeUrl: process.env.ZERO_G_STORAGE_NODE_URL?.trim() || "",
  storageIndexerUrl: process.env.ZERO_G_INDEXER_URL?.trim() || "",
  storageKvUrl: process.env.ZERO_G_KV_URL?.trim() || "",
  storageFlowContractAddress: process.env.ZERO_G_FLOW_CONTRACT?.trim() || "",
  storageMaxFileSizeBytes:
    (Number.parseInt(process.env.HURU_STORAGE_MAX_FILE_SIZE_MB || "10", 10) || 10) * 1024 * 1024,
  storageCreditsPerTenKb:
    Number.parseFloat(process.env.HURU_STORAGE_CREDITS_PER_10KB || "1") || 1,
  // BIP-39 mnemonic for HD-derived per-consumer storage wallets.
  // When absent, storage falls back to the master ZERO_G_PRIVATE_KEY wallet.
  walletMasterMnemonic: process.env.HURU_WALLET_MASTER_MNEMONIC?.trim() || "",
  // Per-consumer wallet gas top-up amount (in A0G). Sent on first use and
  // when balance falls below walletDripThreshold.
  walletDripAmount:
    Number.parseFloat(process.env.HURU_WALLET_DRIP_AMOUNT || "0.01") || 0.01,
  walletDripThreshold:
    Number.parseFloat(process.env.HURU_WALLET_DRIP_THRESHOLD || "0.003") || 0.003,
};

/**
 * Credit packs — priced at ~3x upstream cost (DeepSeek v3 baseline).
 *
 * 1 credit ≈ 1K tokens of Economy compute.
 * Upstream cost: ~0.48 NGN/credit → sell at ~1.44 NGN/credit (3x).
 * Amounts are in minor currency units (kobo for NGN: 100 kobo = 1 NGN).
 *
 * Volume discount: larger packs get slightly cheaper per-credit.
 */
export const creditPacks: HuruCreditPack[] = [
  {
    packId: "pack_sip",
    name: "Sip",
    amountMinor: 10000,        // 100 NGN — entry tier
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 50,        // 50 credits → ~50K economy tokens
  },
  {
    packId: "pack_sample",
    name: "Sample",
    amountMinor: 20000,        // 200 NGN
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 100,       // 100 credits → ~100K economy tokens
  },
  {
    packId: "pack_starter",
    name: "Starter",
    amountMinor: 280000,       // 2,800 NGN ≈ $2
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 1000,      // 1K credits → ~1M economy tokens
  },
  {
    packId: "pack_pro",
    name: "Pro",
    amountMinor: 1260000,      // 12,600 NGN ≈ $9
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 5000,      // 5K credits → ~5M economy tokens
  },
  {
    packId: "pack_business",
    name: "Business",
    amountMinor: 4900000,      // 49,000 NGN ≈ $35
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 25000,     // 25K credits → ~25M economy tokens
  },
  {
    packId: "pack_scale",
    name: "Scale",
    amountMinor: 13860000,     // 138,600 NGN ≈ $99
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 100000,    // 100K credits → ~100M economy tokens
  },
];
