export type DashboardSection = "overview" | "api-keys" | "usage" | "billing" | "playground";

export type DashboardOverview = {
  user: { id: string; email: string; name: string | null };
  projects: Array<{
    id: string; name: string; environment: "test" | "live";
    apiKey: string; apiKeyPrefix: string; creditsBalance: number; createdAt: string;
  }>;
};

export type DashboardProjectDetail = {
  user: { id: string; email: string; name: string | null };
  project: {
    id: string; name: string; environment: "test" | "live";
    apiKey: string; apiKeyPrefix: string; creditsBalance: number; createdAt: string;
  };
  usage: {
    requests: number; creditsUsed: number; currentBalance: number;
    breakdown: Array<{ date: string; requests: number; creditsUsed: number }>;
  };
  requests: Array<{
    id: string; endpoint: string; method: string; model: string; status: string;
    creditsUsed: number; startedAt: string; completedAt: string | null;
    errorMessage: string | null; verified: boolean; verificationMode: string;
    attestationReportId: string | null; quoteHash: string | null;
    requestPreview: string; responsePreview: string;
  }>;
  purchases: Array<{
    id: string; reference: string; name: string; amountMinor: number;
    currency: string; creditsAwarded: number; status: string;
    providerStatus: string | null; providerTransactionId: string | null;
    verifiedAt: string | null; creditedAt: string | null; paidAt: string | null;
  }>;
  key: { id: string; prefix: string } | null;
};

export type DashboardAnalytics = {
  daily: Array<{ date: string; requests: number; creditsUsed: number }>;
  endpoints: Array<{ endpoint: string; requests: number; creditsUsed: number }>;
  verification: { total: number; verified: number; rate: number };
  burnRate: { avgDailyCredits: number; currentBalance: number; estimatedDaysRemaining: number | null };
  consumers: Array<{ email: string; name: string | null; requests: number; creditsUsed: number }>;
  requests: {
    items: Array<{
      id: string; endpoint: string; method: string; model: string; status: string;
      creditsUsed: number; startedAt: string; completedAt: string | null;
      verified: boolean; verificationMode: string; consumerEmail: string | null;
    }>;
    total: number; page: number; pageSize: number;
  };
};

export type PlaygroundMeta = {
  requestId: string;
  creditsUsed: number;
  verified: boolean;
  verificationMode: string;
  provider: string;
  latencyMs: number;
};
