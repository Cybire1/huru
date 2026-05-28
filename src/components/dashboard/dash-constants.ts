import type { DashboardSection } from "./dash-types";
import {
  ArrowUpRightIcon,
  ChartIcon,
  KeyIcon,
  SparkIcon,
  TerminalIcon,
} from "@/components/huru-icons";

export const creditPacks = [
  { packId: "pack_starter",  name: "Starter",  amountMinor: 280000,   currency: "NGN", creditsAwarded: 1000 },
  { packId: "pack_pro",      name: "Pro",      amountMinor: 1260000,  currency: "NGN", creditsAwarded: 5000 },
  { packId: "pack_business", name: "Business", amountMinor: 4900000,  currency: "NGN", creditsAwarded: 25000 },
  { packId: "pack_scale",    name: "Scale",    amountMinor: 13860000, currency: "NGN", creditsAwarded: 100000 },
] as const;

export const localDemoApiKey = "sk_test_huru_local_dev";

export const sidebarNav: { key: DashboardSection; label: string; icon: typeof SparkIcon }[] = [
  { key: "overview", label: "Overview", icon: SparkIcon },
  { key: "api-keys", label: "API Keys", icon: KeyIcon },
  { key: "usage", label: "Usage", icon: ChartIcon },
  { key: "billing", label: "Billing", icon: ArrowUpRightIcon },
  { key: "playground", label: "Playground", icon: TerminalIcon },
];
