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
  consumerStarterCredits:
    Number.parseInt(process.env.HURU_CONSUMER_STARTER_CREDITS || "10", 10) || 10,
};

export const creditPacks: HuruCreditPack[] = [
  {
    packId: "credits_10",
    name: "Starter Top-Up",
    amountMinor: 1000,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 100,
  },
  {
    packId: "credits_25",
    name: "Builder Top-Up",
    amountMinor: 2500,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 300,
  },
  {
    packId: "credits_100",
    name: "Pilot Top-Up",
    amountMinor: 10000,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 1400,
  },
  {
    packId: "credits_300",
    name: "Growth Top-Up",
    amountMinor: 30000,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 5000,
  },
  {
    packId: "credits_1000",
    name: "Scale Top-Up",
    amountMinor: 100000,
    currency: runtimeConfig.defaultCurrency,
    creditsAwarded: 25000,
  },
];
