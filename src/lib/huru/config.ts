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
    Number.parseInt(process.env.HURU_CONSUMER_STARTER_CREDITS || "100", 10) || 100,
  cacheEnabled:
    (process.env.HURU_CACHE_ENABLED?.trim().toLowerCase() ?? "true") !== "false",
  cacheTtlMs:
    (Number.parseInt(process.env.HURU_CACHE_TTL_SECONDS || "300", 10) || 300) * 1000,
  cacheMaxEntries:
    Number.parseInt(process.env.HURU_CACHE_MAX_ENTRIES || "200", 10) || 200,
};

export const creditPacks: HuruCreditPack[] = [
  {
    packId: "pack_100",
    name: "Starter Top-Up",
    amountMinor: 5100,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 100,
  },
  {
    packId: "pack_300",
    name: "Builder Top-Up",
    amountMinor: 15100,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 300,
  },
  {
    packId: "pack_1400",
    name: "Pilot Top-Up",
    amountMinor: 70500,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 1400,
  },
  {
    packId: "pack_5000",
    name: "Growth Top-Up",
    amountMinor: 251500,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 5000,
  },
  {
    packId: "pack_25000",
    name: "Scale Top-Up",
    amountMinor: 1257400,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 25000,
  },
];
