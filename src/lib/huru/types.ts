export type HuruEnvironment = "test" | "live";
export type HuruRuntimeMode = "0g";
export type HuruRequestStatus = "received" | "processing" | "completed" | "failed";
export type HuruVerificationMode = "tee" | "unknown";

export interface HuruProjectRecord {
  id: string;
  publicId: string;
  name: string;
  environment: HuruEnvironment;
  apiKey: string;
  creditsBalance: number;
  createdAt: string;
  storageId?: string;
  apiKeyStorageId?: string;
}

export interface HuruUsageRecord {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsUsed: number;
}

export interface HuruVerificationRecord {
  verified: boolean;
  verificationMode: HuruVerificationMode;
  provider: string;
  reportId?: string;
  quoteHash?: string;
  verifiedAt?: string;
}

export interface HuruRequestRecord {
  id: string;
  projectId: string;
  endpoint: string;
  method: string;
  model: string;
  status: HuruRequestStatus;
  createdAt: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  usage?: HuruUsageRecord;
  verification?: HuruVerificationRecord;
  responseBody?: Record<string, unknown>;
  idempotencyKey?: string;
  creditsReserved?: number;
  consumerEmail?: string;
  consumerId?: string;
}

export interface HuruConsumerRecord {
  id: string;
  projectId: string;
  email: string;
  name?: string;
  creditsBalance: number;
  storageId?: string;
  createdAt: string;
  authProvider?: string;
  authProviderUserId?: string;
}

export interface HuruCreditPack {
  packId: string;
  name: string;
  amountMinor: number;
  currency: string;
  creditsAwarded: number;
}

export interface HuruProjectCreateInput {
  name: string;
  slug?: string;
  environment?: HuruEnvironment;
}
