import type { DashboardSection } from "./dash-types";
import {
  ArrowUpRightIcon,
  ChartIcon,
  KeyIcon,
  SparkIcon,
  TerminalIcon,
} from "@/components/huru-icons";

export const creditPacks = [
  { packId: "pack_100", name: "Starter", amountMinor: 5100, currency: "NGN", creditsAwarded: 100 },
  { packId: "pack_300", name: "Builder", amountMinor: 15100, currency: "NGN", creditsAwarded: 300 },
  { packId: "pack_1400", name: "Pilot", amountMinor: 70500, currency: "NGN", creditsAwarded: 1400 },
  { packId: "pack_5000", name: "Growth", amountMinor: 251500, currency: "NGN", creditsAwarded: 5000 },
  { packId: "pack_25000", name: "Scale", amountMinor: 1257400, currency: "NGN", creditsAwarded: 25000 },
] as const;

export const localDemoApiKey = "sk_test_huru_local_dev";

export const sidebarNav: { key: DashboardSection; label: string; icon: typeof SparkIcon }[] = [
  { key: "overview", label: "Overview", icon: SparkIcon },
  { key: "api-keys", label: "API Keys", icon: KeyIcon },
  { key: "usage", label: "Usage", icon: ChartIcon },
  { key: "billing", label: "Billing", icon: ArrowUpRightIcon },
  { key: "playground", label: "Playground", icon: TerminalIcon },
];
