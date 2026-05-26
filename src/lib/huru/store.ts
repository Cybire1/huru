import { creditPacks, runtimeConfig } from "@/lib/huru/config";
import { hashValue } from "@/lib/huru/http";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/huru/supabase";
import type {
  HuruConsumerRecord,
  HuruCreditPack,
  HuruProjectCreateInput,
  HuruProjectRecord,
  HuruRequestRecord,
  HuruUsageRecord,
  HuruVerificationRecord,
} from "@/lib/huru/types";

export class IdempotencyConflictError extends Error {
  constructor(public readonly idempotencyKey: string) {
    super(`Duplicate idempotency key: ${idempotencyKey}`);
    this.name = "IdempotencyConflictError";
  }
}

interface ProjectRow {
  id: string;
  public_id: string;
  name: string;
  environment_mode: string;
  created_at: string;
}

interface CreditAccountRow {
  id: string;
  project_id: string;
  environment: string;
  balance_credits: number | string;
}

interface ApiKeyRow {
  id: string;
  project_id: string;
  environment: string;
  revoked_at: string | null;
}

interface RequestRow {
  id: string;
  public_id: string;
  project_id: string;
  endpoint: string;
  method: string;
  model_alias: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  credits_used: number | string | null;
  response_body_json: unknown;
}

interface VerificationRow {
  verified: boolean;
  verification_mode: string | null;
  attestation_report_id: string | null;
  quote_hash: string | null;
  verified_at: string | null;
  details_json: unknown;
}

const bootstrapProject: HuruProjectRecord = {
  id: "project_bootstrap",
  publicId: "proj_bootstrap",
  name: "Huru Bootstrap Project",
  environment: "test",
  apiKey: runtimeConfig.bootstrapApiKey,
  creditsBalance: runtimeConfig.bootstrapCredits,
  createdAt: new Date().toISOString(),
};

const HARDCODED_DEFAULT_KEY = "sk_test_huru_local_dev";

const bootstrapIdentity = {
  userPublicId: "usr_bootstrap",
  projectPublicId: bootstrapProject.publicId,
  keyPublicId: "key_bootstrap",
  email: "bootstrap@huru.local",
  slug: "bootstrap",
  keyName: "Bootstrap test key",
};

const state = {
    requests: new Map<string, HuruRequestRecord>(),
    projects: new Map<string, HuruProjectRecord>([[bootstrapProject.publicId, bootstrapProject]]),
    project: bootstrapProject,
    reservedCredits: new Map<string, number>(),
    idempotencyKeys: new Map<string, string>(),
    consumers: new Map<string, HuruConsumerRecord>(),
    consumerReservedCredits: new Map<string, number>(),
};

let bootstrapSeedPromise: Promise<void> | null = null;

function cloneProject(project: HuruProjectRecord): HuruProjectRecord {
  return { ...project };
}

function cloneRequest(request: HuruRequestRecord): HuruRequestRecord {
  return {
    ...request,
    usage: request.usage ? { ...request.usage } : undefined,
    verification: request.verification ? { ...request.verification } : undefined,
    responseBody: request.responseBody ? structuredClone(request.responseBody) : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function coerceEnvironment(value: string | null | undefined): HuruProjectRecord["environment"] {
  return value === "live" ? "live" : "test";
}

function makeKeyPrefix(value: string) {
  return value.slice(0, 16);
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function extractUsageFromResponse(responseBody: unknown): HuruUsageRecord | undefined {
  const response = asRecord(responseBody);
  const huru = asRecord(response?._huru);
  const usage = asRecord(huru?.usage);
  if (!usage) {
    return undefined;
  }

  const promptTokens = asNumber(usage.promptTokens ?? usage.prompt_tokens) ?? 0;
  const completionTokens =
    asNumber(usage.completionTokens ?? usage.completion_tokens) ?? 0;
  const totalTokens = asNumber(usage.totalTokens ?? usage.total_tokens) ?? 0;
  const creditsUsed = asNumber(usage.creditsUsed ?? usage.credits_used) ?? 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    creditsUsed,
  };
}

function extractProviderFromVerification(row: VerificationRow | null) {
  const details = asRecord(row?.details_json);
  return asString(details?.provider) ?? "unknown";
}

function mapProjectRow(
  project: ProjectRow,
  creditsBalance: number,
  apiKey: string,
  apiKeyStorageId?: string,
): HuruProjectRecord {
  return {
    id: project.public_id,
    publicId: project.public_id,
    name: project.name,
    environment: coerceEnvironment(project.environment_mode),
    apiKey,
    creditsBalance,
    createdAt: project.created_at,
    storageId: project.id,
    apiKeyStorageId,
  };
}

function mapRequestRow(
  row: RequestRow,
  verification: VerificationRow | null,
): HuruRequestRecord {
  const usage = extractUsageFromResponse(row.response_body_json);
  const provider = extractProviderFromVerification(verification);

  return {
    id: row.public_id,
    projectId: row.project_id,
    endpoint: row.endpoint,
    method: row.method,
    model: row.model_alias ?? "unknown",
    status:
      row.status === "completed" || row.status === "failed" || row.status === "processing"
        ? row.status
        : "received",
    createdAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    usage,
    verification: verification
      ? {
          verified: verification.verified,
          verificationMode:
            verification.verification_mode === "tee" ||
            verification.verification_mode === "unknown"
              ? verification.verification_mode
              : "unknown",
          provider,
          reportId: verification.attestation_report_id ?? undefined,
          quoteHash: verification.quote_hash ?? undefined,
          verifiedAt: verification.verified_at ?? undefined,
        }
      : undefined,
    responseBody: asRecord(row.response_body_json) ?? undefined,
  };
}

function rememberMemoryRequest(record: HuruRequestRecord) {
  state.requests.set(record.id, cloneRequest(record));
}

function memoryAuthenticateProject(apiKey: string | null): HuruProjectRecord | null {
  if (!apiKey) {
    return null;
  }

  if (apiKey === HARDCODED_DEFAULT_KEY) {
    return null;
  }

  for (const project of state.projects.values()) {
    if (project.apiKey === apiKey) {
      return cloneProject(project);
    }
  }

  return null;
}

function memoryGetProjectSnapshot(): HuruProjectRecord {
  return cloneProject(state.project);
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function createMemoryProject(input: HuruProjectCreateInput): HuruProjectRecord {
  const now = new Date().toISOString();
  const project: HuruProjectRecord = {
    id: `project_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    publicId: `proj_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    name: input.name.trim(),
    environment: input.environment ?? "test",
    apiKey: `sk_test_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
    creditsBalance: runtimeConfig.bootstrapCredits,
    createdAt: now,
    storageId: undefined,
    apiKeyStorageId: undefined,
  };

  state.projects.set(project.publicId, project);
  return cloneProject(project);
}

function memoryReserveCredits(amount: number): boolean {
  if (amount <= 0) {
    return true;
  }

  if (state.project.creditsBalance < amount) {
    return false;
  }

  state.project.creditsBalance -= amount;
  return true;
}

function memoryPreReserve(requestId: string, amount: number): boolean {
  if (amount <= 0) {
    return true;
  }

  const totalReserved = Array.from(state.reservedCredits.values()).reduce(
    (sum, v) => sum + v,
    0,
  );
  if (state.project.creditsBalance - totalReserved < amount) {
    return false;
  }

  state.reservedCredits.set(requestId, amount);
  return true;
}

function memorySettleCredits(requestId: string, actual: number): void {
  state.reservedCredits.delete(requestId);
  state.project.creditsBalance -= actual;
}

function memoryReleaseReserved(requestId: string): void {
  state.reservedCredits.delete(requestId);
}

function memoryAddCredits(amount: number) {
  if (amount <= 0) {
    return;
  }

  state.project.creditsBalance += amount;
}

function memoryGetRequest(requestId: string): HuruRequestRecord | null {
  const request = state.requests.get(requestId);
  return request ? cloneRequest(request) : null;
}

function memoryBuildUsageSummary(from?: Date, to?: Date) {
  const buckets = new Map<string, { date: string; requests: number; creditsUsed: number }>();
  let requestCount = 0;
  let creditsUsed = 0;

  for (const request of state.requests.values()) {
    if (!request.completedAt || !request.usage) {
      continue;
    }

    const completedDate = new Date(request.completedAt);
    if (Number.isNaN(completedDate.getTime())) {
      continue;
    }

    if (from && completedDate < from) {
      continue;
    }

    if (to && completedDate > to) {
      continue;
    }

    requestCount += 1;
    creditsUsed += request.usage.creditsUsed;

    const bucketKey = completedDate.toISOString().slice(0, 10);
    const existing = buckets.get(bucketKey);
    if (existing) {
      existing.requests += 1;
      existing.creditsUsed += request.usage.creditsUsed;
      continue;
    }

    buckets.set(bucketKey, {
      date: bucketKey,
      requests: 1,
      creditsUsed: request.usage.creditsUsed,
    });
  }

  return {
    object: "usage.summary",
    projectId: state.project.publicId,
    period: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    totals: {
      requests: requestCount,
      creditsUsed,
      currentBalance: state.project.creditsBalance,
    },
    breakdown: Array.from(buckets.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
  };
}

function memoryFinalizeRequest(
  requestId: string,
  usage: HuruUsageRecord,
  verification: HuruVerificationRecord,
  responseBody: Record<string, unknown>,
) {
  const request = state.requests.get(requestId);
  if (!request) {
    return null;
  }

  const completed: HuruRequestRecord = {
    ...request,
    status: "completed",
    completedAt: new Date().toISOString(),
    usage,
    verification,
    responseBody,
  };

  state.requests.set(requestId, completed);
  return cloneRequest(completed);
}

function memoryFailRequest(requestId: string, errorCode: string, errorMessage: string) {
  const request = state.requests.get(requestId);
  if (!request) {
    return null;
  }

  const failed: HuruRequestRecord = {
    ...request,
    status: "failed",
    completedAt: new Date().toISOString(),
    errorCode,
    errorMessage,
  };

  state.requests.set(requestId, failed);
  return cloneRequest(failed);
}

async function runWithStoreFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  if (!hasSupabaseAdminConfig()) {
    return fallback();
  }

  return operation();
}

async function ensureBootstrapSeeded() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return;
  }

  if (runtimeConfig.bootstrapApiKey === HARDCODED_DEFAULT_KEY) {
    return;
  }

  if (!bootstrapSeedPromise) {
    bootstrapSeedPromise = (async () => {
      await supabase.from("huru_credit_packs").upsert(
        creditPacks.map((pack) => ({
          public_id: `cpk_${pack.packId}`,
          pack_id: pack.packId,
          name: pack.name,
          currency: pack.currency,
          amount_minor: pack.amountMinor,
          credits_awarded: pack.creditsAwarded,
        })),
        { onConflict: "pack_id" },
      );

      let userId: string;
      const existingUser = await supabase
        .from("huru_users")
        .select("id")
        .eq("public_id", bootstrapIdentity.userPublicId)
        .maybeSingle();

      if (existingUser.error) {
        throw existingUser.error;
      }

      if (existingUser.data?.id) {
        userId = existingUser.data.id;
      } else {
        const createdUser = await supabase
          .from("huru_users")
          .insert({
            public_id: bootstrapIdentity.userPublicId,
            email: bootstrapIdentity.email,
            name: "Huru Bootstrap",
            auth_provider: "supabase",
          })
          .select("id")
          .single();

        if (createdUser.error) {
          throw createdUser.error;
        }

        userId = createdUser.data.id;
      }

      let projectId: string;
      const existingProject = await supabase
        .from("huru_projects")
        .select("id")
        .eq("public_id", bootstrapIdentity.projectPublicId)
        .maybeSingle();

      if (existingProject.error) {
        throw existingProject.error;
      }

      if (existingProject.data?.id) {
        projectId = existingProject.data.id;
      } else {
        const createdProject = await supabase
          .from("huru_projects")
          .insert({
            public_id: bootstrapIdentity.projectPublicId,
            user_id: userId,
            name: bootstrapProject.name,
            slug: bootstrapIdentity.slug,
            environment_mode: bootstrapProject.environment,
            status: "active",
          })
          .select("id")
          .single();

        if (createdProject.error) {
          throw createdProject.error;
        }

        projectId = createdProject.data.id;
      }

      const keyHash = hashValue(runtimeConfig.bootstrapApiKey);
      const keyPrefix = makeKeyPrefix(runtimeConfig.bootstrapApiKey);

      // Upsert the bootstrap key — handles both fresh insert and key rotation
      const upsertedKey = await supabase.from("huru_api_keys").upsert(
        {
          public_id: bootstrapIdentity.keyPublicId,
          project_id: projectId,
          environment: bootstrapProject.environment,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          name: bootstrapIdentity.keyName,
        },
        { onConflict: "public_id" },
      );

      if (upsertedKey.error) {
        throw upsertedKey.error;
      }

      const existingAccount = await supabase
        .from("huru_credit_accounts")
        .select("id")
        .eq("project_id", projectId)
        .eq("environment", bootstrapProject.environment)
        .maybeSingle();

      if (existingAccount.error) {
        throw existingAccount.error;
      }

      if (!existingAccount.data?.id) {
        const createdAccount = await supabase.from("huru_credit_accounts").insert({
          project_id: projectId,
          environment: bootstrapProject.environment,
          balance_credits: bootstrapProject.creditsBalance,
          reserved_credits: 0,
        });

        if (createdAccount.error) {
          throw createdAccount.error;
        }

        await insertLedgerEntry({
          projectId,
          environment: bootstrapProject.environment,
          direction: "credit",
          amountCredits: bootstrapProject.creditsBalance,
          balanceAfterCredits: bootstrapProject.creditsBalance,
          entryType: "bootstrap",
          notes: "Initial bootstrap credits",
        });
      }
    })().catch((error) => {
      bootstrapSeedPromise = null;
      throw error;
    });
  }

  await bootstrapSeedPromise;
}

async function fetchProjectFromStorage(projectId: string, apiKey: string, apiKeyStorageId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const projectResult = await supabase
    .from("huru_projects")
    .select("id, public_id, name, environment_mode, created_at")
    .eq("id", projectId)
    .maybeSingle<ProjectRow>();

  if (projectResult.error || !projectResult.data) {
    return null;
  }

  const environment = coerceEnvironment(projectResult.data.environment_mode);
  const creditResult = await supabase
    .from("huru_credit_accounts")
    .select("balance_credits")
    .eq("project_id", projectResult.data.id)
    .eq("environment", environment)
    .maybeSingle<Pick<CreditAccountRow, "balance_credits">>();

  if (creditResult.error) {
    return null;
  }

  const creditsBalance = asNumber(creditResult.data?.balance_credits) ?? 0;
  return mapProjectRow(projectResult.data, creditsBalance, apiKey, apiKeyStorageId);
}

async function fetchBootstrapProjectFromStorage() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  await ensureBootstrapSeeded();

  const projectResult = await supabase
    .from("huru_projects")
    .select("id, public_id, name, environment_mode, created_at")
    .eq("public_id", bootstrapIdentity.projectPublicId)
    .maybeSingle<ProjectRow>();

  if (projectResult.error || !projectResult.data) {
    return null;
  }

  const environment = coerceEnvironment(projectResult.data.environment_mode);
  const creditResult = await supabase
    .from("huru_credit_accounts")
    .select("balance_credits")
    .eq("project_id", projectResult.data.id)
    .eq("environment", environment)
    .maybeSingle<Pick<CreditAccountRow, "balance_credits">>();

  if (creditResult.error) {
    return null;
  }

  const creditsBalance = asNumber(creditResult.data?.balance_credits) ?? 0;
  return mapProjectRow(
    projectResult.data,
    creditsBalance,
    runtimeConfig.bootstrapApiKey,
  );
}

async function insertLedgerEntry(input: {
  projectId: string;
  environment: string;
  direction: "credit" | "debit";
  amountCredits: number;
  balanceAfterCredits: number;
  entryType: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return;
  }

  await supabase.from("huru_credit_ledger").insert({
    public_id: `led_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    project_id: input.projectId,
    environment: input.environment,
    entry_type: input.entryType,
    direction: input.direction,
    amount_credits: input.amountCredits,
    balance_after_credits: input.balanceAfterCredits,
    notes: input.notes ?? null,
    metadata_json: input.metadata ?? {},
  });
}

async function adjustProjectCreditsByStorageId(input: {
  projectId: string;
  environment: string;
  delta: number;
  entryType: string;
  direction: "credit" | "debit";
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const accountResult = await supabase
      .from("huru_credit_accounts")
      .select("id, balance_credits, environment, project_id")
      .eq("project_id", input.projectId)
      .eq("environment", input.environment)
      .maybeSingle<CreditAccountRow>();

    if (accountResult.error) {
      throw accountResult.error;
    }

    let account = accountResult.data;

    if (!account) {
      const created = await supabase
        .from("huru_credit_accounts")
        .insert({
          project_id: input.projectId,
          environment: input.environment,
          balance_credits: 0,
          reserved_credits: 0,
        })
        .select("id, balance_credits, environment, project_id")
        .single<CreditAccountRow>();

      if (created.error) {
        throw created.error;
      }

      account = created.data;
    }

    const currentBalance = asNumber(account.balance_credits) ?? 0;
    const nextBalance = currentBalance + input.delta;

    if (nextBalance < 0) {
      return null;
    }

    const updated = await supabase
      .from("huru_credit_accounts")
      .update({
        balance_credits: nextBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id)
      .eq("balance_credits", currentBalance)
      .select("id")
      .maybeSingle();

    if (updated.error) {
      throw updated.error;
    }

    if (updated.data) {
      await insertLedgerEntry({
        projectId: input.projectId,
        environment: input.environment,
        direction: input.direction,
        amountCredits: Math.abs(input.delta),
        balanceAfterCredits: nextBalance,
        entryType: input.entryType,
        notes: input.notes,
        metadata: input.metadata,
      });
      return nextBalance;
    }
    // CAS conflict — retry
  }

  throw new Error("Failed to adjust credits after retries.");
}

async function fetchVerificationForRequest(requestStorageId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const result = await supabase
    .from("huru_request_verifications")
    .select("verified, verification_mode, attestation_report_id, quote_hash, verified_at, details_json")
    .eq("request_id", requestStorageId)
    .maybeSingle<VerificationRow>();

  if (result.error) {
    return null;
  }

  return result.data ?? null;
}

export async function authenticateProject(apiKey: string | null): Promise<HuruProjectRecord | null> {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !apiKey) {
      return memoryAuthenticateProject(apiKey);
    }

    await ensureBootstrapSeeded();

    const keyHash = hashValue(apiKey);
    const keyPrefix = makeKeyPrefix(apiKey);
    const apiKeyResult = await supabase
      .from("huru_api_keys")
      .select("id, project_id, environment, revoked_at")
      .eq("key_hash", keyHash)
      .eq("key_prefix", keyPrefix)
      .is("revoked_at", null)
      .maybeSingle<ApiKeyRow>();

    if (apiKeyResult.error || !apiKeyResult.data || apiKeyResult.data.revoked_at) {
      console.error("[huru/auth] key lookup failed:", { keyPrefix, error: apiKeyResult.error, hasData: !!apiKeyResult.data });
      return null;
    }

    const project = await fetchProjectFromStorage(
      apiKeyResult.data.project_id,
      apiKey,
      apiKeyResult.data.id,
    );

    if (!project) {
      return null;
    }

    void supabase
      .from("huru_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyResult.data.id);

    project.environment = coerceEnvironment(apiKeyResult.data.environment);
    return project;
  }, () => memoryAuthenticateProject(apiKey));
}

export async function getProjectSnapshot(): Promise<HuruProjectRecord> {
  return runWithStoreFallback(async () => {
    const project = await fetchBootstrapProjectFromStorage();
    return project ?? memoryGetProjectSnapshot();
  }, () => memoryGetProjectSnapshot());
}

export async function listProjects(owner: HuruProjectRecord): Promise<HuruProjectRecord[]> {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !owner.storageId) {
      return Array.from(state.projects.values()).map(cloneProject);
    }

    const ownerRow = await supabase
      .from("huru_projects")
      .select("user_id")
      .eq("id", owner.storageId)
      .maybeSingle<{ user_id: string }>();

    if (ownerRow.error || !ownerRow.data?.user_id) {
      throw ownerRow.error ?? new Error("Owner project not found.");
    }

    const projectsResult = await supabase
      .from("huru_projects")
      .select("id, public_id, name, environment_mode, created_at")
      .eq("user_id", ownerRow.data.user_id);

    if (projectsResult.error) {
      throw projectsResult.error;
    }

    const projectRows = projectsResult.data ?? [];
    if (projectRows.length === 0) {
      return [];
    }

    const ids = projectRows.map((project) => project.id);
    const creditsResult = await supabase
      .from("huru_credit_accounts")
      .select("project_id, balance_credits")
      .in("project_id", ids)
      .eq("environment", owner.environment);

    if (creditsResult.error) {
      throw creditsResult.error;
    }

    const balances = new Map<string, number>();
    for (const row of creditsResult.data ?? []) {
      balances.set(row.project_id, asNumber(row.balance_credits) ?? 0);
    }

    const apiKeysResult = await supabase
      .from("huru_api_keys")
      .select("id, project_id, environment, key_prefix")
      .in("project_id", ids)
      .is("revoked_at", null);

    if (apiKeysResult.error) {
      throw apiKeysResult.error;
    }

    const apiKeyByProject = new Map<string, { id: string; keyPrefix: string }>();
    for (const row of apiKeysResult.data ?? []) {
      if (!apiKeyByProject.has(row.project_id)) {
        apiKeyByProject.set(row.project_id, {
          id: row.id,
          keyPrefix: row.key_prefix,
        });
      }
    }

    return projectRows.map((project) =>
      mapProjectRow(
        project,
        balances.get(project.id) ?? 0,
        project.id === owner.storageId
          ? owner.apiKey
          : `sk_${coerceEnvironment(project.environment_mode)}_${apiKeyByProject.get(project.id)?.keyPrefix ?? "unknown"}`,
        apiKeyByProject.get(project.id)?.id,
      ),
    );
  }, () => Array.from(state.projects.values()).map(cloneProject));
}

export async function createProject(
  owner: HuruProjectRecord,
  input: HuruProjectCreateInput,
): Promise<HuruProjectRecord> {
  return runWithStoreFallback(async () => {
    if (runtimeConfig.supabaseUrl && runtimeConfig.supabaseServiceRoleKey) {
      return createProjectInStorage(input, owner);
    }

    return createMemoryProject(input);
  }, () => createMemoryProject(input));
}

async function createProjectInStorage(input: HuruProjectCreateInput, owner: HuruProjectRecord) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !owner.storageId) {
    return createMemoryProject(input);
  }

  const ownerRow = await supabase
    .from("huru_projects")
    .select("user_id")
    .eq("id", owner.storageId)
    .maybeSingle<{ user_id: string }>();

  if (ownerRow.error || !ownerRow.data?.user_id) {
    throw ownerRow.error ?? new Error("Owner project not found.");
  }

  const slug = input.slug?.trim() || slugify(input.name) || `project-${crypto.randomUUID().slice(0, 8)}`;
  const createdProjectResult = await supabase
    .from("huru_projects")
    .insert({
      public_id: `proj_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      user_id: ownerRow.data.user_id,
      name: input.name.trim(),
      slug,
      environment_mode: input.environment ?? owner.environment,
      status: "active",
    })
    .select("id, public_id, name, environment_mode, created_at")
    .single<ProjectRow>();

  if (createdProjectResult.error) {
    throw createdProjectResult.error;
  }

  const createdApiKey = `sk_${createdProjectResult.data.environment_mode === "live" ? "live" : "test"}_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const keyResult = await supabase.from("huru_api_keys").insert({
    public_id: `key_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    project_id: createdProjectResult.data.id,
    environment: coerceEnvironment(createdProjectResult.data.environment_mode),
    key_prefix: makeKeyPrefix(createdApiKey),
    key_hash: hashValue(createdApiKey),
    name: "Default project key",
  });

  if (keyResult.error) {
    throw keyResult.error;
  }

  const creditAccountResult = await supabase.from("huru_credit_accounts").insert({
    project_id: createdProjectResult.data.id,
    environment: coerceEnvironment(createdProjectResult.data.environment_mode),
    balance_credits: runtimeConfig.bootstrapCredits,
    reserved_credits: 0,
  });

  if (creditAccountResult.error) {
    throw creditAccountResult.error;
  }

  return mapProjectRow(
    createdProjectResult.data,
    runtimeConfig.bootstrapCredits,
    createdApiKey,
    undefined,
  );
}

export async function reserveCredits(
  project: HuruProjectRecord,
  amount: number,
  requestId?: string,
): Promise<boolean> {
  return runWithStoreFallback(async () => {
    if (amount <= 0 || !project.storageId) {
      return true;
    }

    const nextBalance = await adjustProjectCreditsByStorageId({
      projectId: project.storageId,
      environment: project.environment,
      delta: -amount,
      direction: "debit",
      entryType: "request_usage",
      notes: requestId ? `Usage debit for ${requestId}` : "Usage debit",
      metadata: requestId ? { request_id: requestId } : {},
    });

    return nextBalance !== null;
  }, () => memoryReserveCredits(amount));
}

export async function preReserveCredits(
  project: HuruProjectRecord,
  estimate: number,
  requestId: string,
): Promise<boolean> {
  return runWithStoreFallback(async () => {
    if (estimate <= 0 || !project.storageId) {
      return true;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return memoryPreReserve(requestId, estimate);
    }

    const accountResult = await supabase
      .from("huru_credit_accounts")
      .select("id, balance_credits, reserved_credits")
      .eq("project_id", project.storageId)
      .eq("environment", project.environment)
      .maybeSingle<{ id: string; balance_credits: number | string; reserved_credits: number | string }>();

    if (accountResult.error || !accountResult.data) {
      return false;
    }

    const balance = asNumber(accountResult.data.balance_credits) ?? 0;
    const currentReserved = asNumber(accountResult.data.reserved_credits) ?? 0;

    if (balance - currentReserved < estimate) {
      return false;
    }

    const nextReserved = currentReserved + estimate;
    const updated = await supabase
      .from("huru_credit_accounts")
      .update({
        reserved_credits: nextReserved,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountResult.data.id)
      .eq("reserved_credits", currentReserved)
      .select("id")
      .maybeSingle();

    if (updated.error || !updated.data) {
      return false;
    }

    await supabase
      .from("huru_requests")
      .update({ credits_reserved: estimate })
      .eq("public_id", requestId);

    return true;
  }, () => memoryPreReserve(requestId, estimate));
}

export async function settleCredits(
  project: HuruProjectRecord,
  requestId: string,
  actualUsage: number,
  reservedAmount: number,
): Promise<void> {
  return runWithStoreFallback(async () => {
    if (!project.storageId) {
      memorySettleCredits(requestId, actualUsage);
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      memorySettleCredits(requestId, actualUsage);
      return;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const accountResult = await supabase
        .from("huru_credit_accounts")
        .select("id, balance_credits, reserved_credits")
        .eq("project_id", project.storageId)
        .eq("environment", project.environment)
        .maybeSingle<{ id: string; balance_credits: number | string; reserved_credits: number | string }>();

      if (accountResult.error || !accountResult.data) {
        memorySettleCredits(requestId, actualUsage);
        return;
      }

      const balance = asNumber(accountResult.data.balance_credits) ?? 0;
      const currentReserved = asNumber(accountResult.data.reserved_credits) ?? 0;
      const newBalance = Math.max(0, balance - actualUsage);
      const newReserved = Math.max(0, currentReserved - reservedAmount);

      const updated = await supabase
        .from("huru_credit_accounts")
        .update({
          balance_credits: newBalance,
          reserved_credits: newReserved,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountResult.data.id)
        .eq("balance_credits", balance)
        .eq("reserved_credits", currentReserved)
        .select("id")
        .maybeSingle();

      if (updated.data) {
        await insertLedgerEntry({
          projectId: project.storageId,
          environment: project.environment,
          direction: "debit",
          amountCredits: actualUsage,
          balanceAfterCredits: newBalance,
          entryType: "request_usage",
          notes: `Usage debit for ${requestId}`,
          metadata: { request_id: requestId, reserved: reservedAmount, actual: actualUsage },
        });
        return;
      }
      // CAS conflict — retry
    }

    throw new Error(`Failed to settle credits for ${requestId} after retries.`);
  }, () => {
    memorySettleCredits(requestId, actualUsage);
  });
}

export async function releaseReservedCredits(
  project: HuruProjectRecord,
  requestId: string,
  reservedAmount: number,
): Promise<void> {
  return runWithStoreFallback(async () => {
    if (reservedAmount <= 0 || !project.storageId) {
      memoryReleaseReserved(requestId);
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      memoryReleaseReserved(requestId);
      return;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const accountResult = await supabase
        .from("huru_credit_accounts")
        .select("id, reserved_credits")
        .eq("project_id", project.storageId)
        .eq("environment", project.environment)
        .maybeSingle<{ id: string; reserved_credits: number | string }>();

      if (accountResult.error || !accountResult.data) {
        memoryReleaseReserved(requestId);
        return;
      }

      const currentReserved = asNumber(accountResult.data.reserved_credits) ?? 0;
      const newReserved = Math.max(0, currentReserved - reservedAmount);

      const updated = await supabase
        .from("huru_credit_accounts")
        .update({
          reserved_credits: newReserved,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountResult.data.id)
        .eq("reserved_credits", currentReserved)
        .select("id")
        .maybeSingle();

      if (updated.data) {
        return;
      }
      // CAS conflict — retry
    }
  }, () => {
    memoryReleaseReserved(requestId);
  });
}

export async function checkIdempotencyKey(
  project: HuruProjectRecord,
  idempotencyKey: string,
): Promise<
  | { status: "completed"; record: HuruRequestRecord }
  | { status: "processing" }
  | { status: "failed" }
  | null
> {
  const compositeKey = `${project.publicId}:${idempotencyKey}`;
  const memoryRequestId = state.idempotencyKeys.get(compositeKey);
  if (memoryRequestId) {
    const memRecord = state.requests.get(memoryRequestId);
    if (memRecord) {
      if (memRecord.status === "completed") {
        return { status: "completed", record: cloneRequest(memRecord) };
      }
      if (memRecord.status === "processing") {
        return { status: "processing" };
      }
      if (memRecord.status === "failed") {
        // Clear the failed entry so retry can insert a fresh row
        state.idempotencyKeys.delete(compositeKey);
        state.requests.delete(memoryRequestId);
        return { status: "failed" };
      }
    }
  }

  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      return null;
    }

    const result = await supabase
      .from("huru_requests")
      .select("id, public_id, project_id, endpoint, method, model_alias, status, started_at, completed_at, error_code, error_message, credits_used, response_body_json")
      .eq("project_id", project.storageId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle<RequestRow>();

    if (result.error || !result.data) {
      return null;
    }

    if (result.data.status === "completed") {
      const verification = await fetchVerificationForRequest(result.data.id);
      return { status: "completed" as const, record: mapRequestRow(result.data, verification) };
    }

    if (result.data.status === "processing") {
      return { status: "processing" as const };
    }

    if (result.data.status === "failed") {
      // Delete the failed row so retry can insert a fresh one
      await supabase
        .from("huru_requests")
        .delete()
        .eq("id", result.data.id);
      return { status: "failed" as const };
    }

    return null;
  }, () => null);
}

export async function addCredits(
  project: HuruProjectRecord,
  amount: number,
  metadata?: Record<string, unknown>,
) {
  return runWithStoreFallback(async () => {
    if (amount <= 0 || !project.storageId) {
      return;
    }

    await adjustProjectCreditsByStorageId({
      projectId: project.storageId,
      environment: project.environment,
      delta: amount,
      direction: "credit",
      entryType: "topup",
      notes: "Credit top-up",
      metadata,
    });
  }, () => {
    memoryAddCredits(amount);
  });
}

export async function saveRequest(project: HuruProjectRecord, record: HuruRequestRecord) {
  if (record.idempotencyKey) {
    const compositeKey = `${project.publicId}:${record.idempotencyKey}`;
    state.idempotencyKeys.set(compositeKey, record.id);
  }

  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      rememberMemoryRequest(record);
      return;
    }

    const result = await supabase.from("huru_requests").insert({
      public_id: record.id,
      project_id: project.storageId,
      api_key_id: project.apiKeyStorageId ?? null,
      environment: project.environment,
      endpoint: record.endpoint,
      method: record.method,
      model_alias: record.model,
      status: record.status,
      request_body_json: {},
      response_body_json: {},
      started_at: record.createdAt,
      created_at: record.createdAt,
      idempotency_key: record.idempotencyKey ?? null,
      consumer_id: record.consumerId
        ? findConsumerStorageId(record.consumerId)
        : null,
    });

    if (result.error) {
      // 23505 = unique_violation — idempotency key conflict
      if (result.error.code === "23505" && record.idempotencyKey) {
        throw new IdempotencyConflictError(record.idempotencyKey);
      }
      throw result.error;
    }
  }, () => {
    rememberMemoryRequest(record);
  });
}

export async function getRequest(
  project: HuruProjectRecord,
  requestId: string,
): Promise<HuruRequestRecord | null> {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      return memoryGetRequest(requestId);
    }

    const requestResult = await supabase
      .from("huru_requests")
      .select("id, public_id, project_id, endpoint, method, model_alias, status, started_at, completed_at, error_code, error_message, credits_used, response_body_json")
      .eq("public_id", requestId)
      .eq("project_id", project.storageId)
      .maybeSingle<RequestRow>();

    if (requestResult.error || !requestResult.data) {
      return null;
    }

    const verification = await fetchVerificationForRequest(requestResult.data.id);
    return mapRequestRow(requestResult.data, verification);
  }, () => memoryGetRequest(requestId));
}

export async function buildUsageSummary(
  project: HuruProjectRecord,
  from?: Date,
  to?: Date,
) {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      return memoryBuildUsageSummary(from, to);
    }

    let query = supabase
      .from("huru_requests")
      .select("completed_at, credits_used")
      .eq("project_id", project.storageId)
      .eq("status", "completed");

    if (from) {
      query = query.gte("completed_at", from.toISOString());
    }

    if (to) {
      query = query.lte("completed_at", to.toISOString());
    }

    const requestsResult = await query;
    if (requestsResult.error) {
      throw requestsResult.error;
    }

    const buckets = new Map<string, { date: string; requests: number; creditsUsed: number }>();
    let requestCount = 0;
    let creditsUsed = 0;

    for (const row of requestsResult.data ?? []) {
      const completedAt = asString(row.completed_at);
      if (!completedAt) {
        continue;
      }

      const date = completedAt.slice(0, 10);
      const amount = asNumber(row.credits_used) ?? 0;

      requestCount += 1;
      creditsUsed += amount;

      const existing = buckets.get(date);
      if (existing) {
        existing.requests += 1;
        existing.creditsUsed += amount;
      } else {
        buckets.set(date, {
          date,
          requests: 1,
          creditsUsed: amount,
        });
      }
    }

    const freshProject = await fetchProjectFromStorage(
      project.storageId,
      project.apiKey,
      project.apiKeyStorageId,
    );

    return {
      object: "usage.summary",
      projectId: project.publicId,
      period: {
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      },
      totals: {
        requests: requestCount,
        creditsUsed,
        currentBalance: freshProject?.creditsBalance ?? project.creditsBalance,
      },
      breakdown: Array.from(buckets.values()).sort((left, right) =>
        left.date.localeCompare(right.date),
      ),
    };
  }, () => memoryBuildUsageSummary(from, to));
}

export async function finalizeRequest(
  requestId: string,
  usage: HuruUsageRecord,
  verification: HuruVerificationRecord,
  responseBody: Record<string, unknown>,
) {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return memoryFinalizeRequest(requestId, usage, verification, responseBody);
    }

    const storedResponseBody = {
      ...responseBody,
      _huru: {
        usage,
        verification,
      },
    };

    const requestResult = await supabase
      .from("huru_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        credits_used: usage.creditsUsed,
        response_body_json: storedResponseBody,
      })
      .eq("public_id", requestId)
      .select("id, public_id, project_id, endpoint, method, model_alias, status, started_at, completed_at, error_code, error_message, credits_used, response_body_json")
      .maybeSingle<RequestRow>();

    if (requestResult.error || !requestResult.data) {
      return null;
    }

    const verificationWrite = await supabase.from("huru_request_verifications").upsert(
      {
        request_id: requestResult.data.id,
        verified: verification.verified,
        verification_mode: verification.verificationMode,
        attestation_report_id: verification.reportId ?? null,
        quote_hash: verification.quoteHash ?? null,
        verified_at: verification.verifiedAt ?? new Date().toISOString(),
        details_json: { provider: verification.provider },
      },
      { onConflict: "request_id" },
    );

    if (verificationWrite.error) {
      throw verificationWrite.error;
    }

    const persistedVerification = await fetchVerificationForRequest(requestResult.data.id);
    return mapRequestRow(requestResult.data, persistedVerification);
  }, () => memoryFinalizeRequest(requestId, usage, verification, responseBody));
}

export async function failRequest(
  requestId: string,
  errorCode: string,
  errorMessage: string,
) {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return memoryFailRequest(requestId, errorCode, errorMessage);
    }

    const requestResult = await supabase
      .from("huru_requests")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_code: errorCode,
        error_message: errorMessage,
      })
      .eq("public_id", requestId)
      .select("id, public_id, project_id, endpoint, method, model_alias, status, started_at, completed_at, error_code, error_message, credits_used, response_body_json")
      .maybeSingle<RequestRow>();

    if (requestResult.error || !requestResult.data) {
      return null;
    }

    const verification = await fetchVerificationForRequest(requestResult.data.id);
    return mapRequestRow(requestResult.data, verification);
  }, () => memoryFailRequest(requestId, errorCode, errorMessage));
}

export async function createCreditPurchase(
  project: HuruProjectRecord,
  pack: HuruCreditPack,
  reference: string,
) {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      return;
    }

    const packResult = await supabase
      .from("huru_credit_packs")
      .select("id")
      .eq("pack_id", pack.packId)
      .maybeSingle<{ id: string }>();

    if (packResult.error || !packResult.data?.id) {
      throw packResult.error ?? new Error("Credit pack missing in storage.");
    }

    const purchaseResult = await supabase.from("huru_credit_purchases").insert({
      public_id: `pur_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      project_id: project.storageId,
      credit_pack_id: packResult.data.id,
      provider: "paystack",
      reference,
      status: "pending",
      amount_minor: pack.amountMinor,
      currency: pack.currency,
    });

    if (purchaseResult.error && purchaseResult.error.code !== "23505") {
      throw purchaseResult.error;
    }
  }, () => undefined);
}

function findConsumerStorageId(consumerPublicId: string): string | null {
  for (const consumer of state.consumers.values()) {
    if (consumer.id === consumerPublicId && consumer.storageId) {
      return consumer.storageId;
    }
  }
  return null;
}

export async function applySuccessfulCreditPurchase(
  reference: string,
  payload: {
    id?: string | number | null;
    status?: string | null;
    amount?: number | null;
    currency?: string | null;
    fees?: number | null;
    gateway_response?: string | null;
    paid_at?: string | null;
    metadata?: Record<string, unknown> | null;
    rawPayload: Record<string, unknown>;
  },
) {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      const creditsAwarded = asNumber(payload.metadata?.credits_awarded) ?? 0;
      if (creditsAwarded > 0) {
        memoryAddCredits(creditsAwarded);
      }
      return;
    }

    type PurchaseRow = {
      id: string;
      project_id: string;
      currency: string;
      amount_minor: number | string;
      credited_at: string | null;
      huru_credit_packs:
        | { credits_awarded: number | string }
        | Array<{ credits_awarded: number | string }>
        | null;
      huru_projects:
        | { public_id: string; environment_mode: string }
        | Array<{ public_id: string; environment_mode: string }>
        | null;
    };

    const purchaseResult = await supabase
      .from("huru_credit_purchases")
      .select(
        "id, project_id, currency, amount_minor, credited_at, huru_credit_packs(credits_awarded), huru_projects(public_id, environment_mode)",
      )
      .eq("reference", reference)
      .maybeSingle<PurchaseRow>();

    if (purchaseResult.error || !purchaseResult.data) {
      throw purchaseResult.error ?? new Error("Credit purchase not found.");
    }

    const pack = unwrapRelation(purchaseResult.data.huru_credit_packs);
    const project = unwrapRelation(purchaseResult.data.huru_projects);
    const creditsAwarded = asNumber(pack?.credits_awarded) ?? 0;
    const environment = coerceEnvironment(project?.environment_mode);

    await supabase.from("huru_paystack_transactions").upsert(
      {
        credit_purchase_id: purchaseResult.data.id,
        reference,
        paystack_transaction_id:
          payload.id != null ? String(payload.id) : null,
        status: payload.status ?? null,
        amount_minor: payload.amount ?? null,
        currency: payload.currency ?? purchaseResult.data.currency,
        fees_minor: payload.fees ?? null,
        gateway_response: payload.gateway_response ?? null,
        paid_at: payload.paid_at ?? null,
        raw_payload_json: payload.rawPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "reference" },
    );

    const now = new Date().toISOString();

    if (creditsAwarded > 0 && !purchaseResult.data.credited_at) {
      // Atomically claim — only one concurrent webhook wins
      const claimed = await supabase
        .from("huru_credit_purchases")
        .update({
          status: "processing",
          updated_at: now,
        })
        .eq("reference", reference)
        .is("credited_at", null)
        .select("id")
        .maybeSingle();

      if (claimed?.data) {
        // Credits first — if this fails, credited_at stays null and retry re-attempts
        await adjustProjectCreditsByStorageId({
          projectId: purchaseResult.data.project_id,
          environment,
          delta: creditsAwarded,
          direction: "credit",
          entryType: "topup",
          notes: `Paystack top-up ${reference}`,
          metadata: {
            reference,
            paystack_status: payload.status ?? "success",
          },
        });

        // Mark credited only after balance is updated
        await supabase
          .from("huru_credit_purchases")
          .update({
            status: "success",
            provider_transaction_id: payload.id != null ? String(payload.id) : null,
            provider_status: payload.status ?? "success",
            verified_at: now,
            credited_at: now,
            updated_at: now,
          })
          .eq("reference", reference);
      }
    } else {
      // Already credited or zero credits — just update status
      await supabase
        .from("huru_credit_purchases")
        .update({
          status: "success",
          provider_transaction_id: payload.id != null ? String(payload.id) : null,
          provider_status: payload.status ?? "success",
          verified_at: now,
          updated_at: now,
        })
        .eq("reference", reference);
    }
  }, () => {
    const creditsAwarded = asNumber(payload.metadata?.credits_awarded) ?? 0;
    if (creditsAwarded > 0) {
      memoryAddCredits(creditsAwarded);
    }
  });
}

// ---------------------------------------------------------------------------
// Consumer billing
// ---------------------------------------------------------------------------

interface ConsumerRow {
  id: string;
  public_id: string;
  project_id: string;
  email: string;
  name: string | null;
  created_at: string;
  auth_provider: string | null;
  auth_provider_user_id: string | null;
}

interface ConsumerCreditAccountRow {
  id: string;
  consumer_id: string;
  project_id: string;
  environment: string;
  balance_credits: number | string;
  reserved_credits: number | string;
}

function consumerMemoryKey(projectPublicId: string, email: string) {
  return `${projectPublicId}:${email}`;
}

function mapConsumerRow(
  row: ConsumerRow,
  creditsBalance: number,
): HuruConsumerRecord {
  return {
    id: row.public_id,
    projectId: row.project_id,
    email: row.email,
    name: row.name ?? undefined,
    creditsBalance,
    storageId: row.id,
    createdAt: row.created_at,
    authProvider: row.auth_provider ?? undefined,
    authProviderUserId: row.auth_provider_user_id ?? undefined,
  };
}

export async function resolveConsumer(
  project: HuruProjectRecord,
  email: string,
  name?: string,
  authProvider?: string,
  authProviderUserId?: string,
): Promise<HuruConsumerRecord> {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      return resolveMemoryConsumer(project, email, name, authProvider, authProviderUserId);
    }

    const selectCols = "id, public_id, project_id, email, name, created_at, auth_provider, auth_provider_user_id";

    const existing = await supabase
      .from("huru_consumers")
      .select(selectCols)
      .eq("project_id", project.storageId)
      .eq("email", email)
      .maybeSingle<ConsumerRow>();

    if (existing.error) {
      throw existing.error;
    }

    if (existing.data) {
      const updates: Record<string, unknown> = {};
      if (name && !existing.data.name) {
        updates.name = name;
        existing.data.name = name;
      }
      if (authProvider && !existing.data.auth_provider) {
        updates.auth_provider = authProvider;
        existing.data.auth_provider = authProvider;
      }
      if (authProviderUserId && !existing.data.auth_provider_user_id) {
        updates.auth_provider_user_id = authProviderUserId;
        existing.data.auth_provider_user_id = authProviderUserId;
      }
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase
          .from("huru_consumers")
          .update(updates)
          .eq("id", existing.data.id);
      }

      const creditResult = await supabase
        .from("huru_consumer_credit_accounts")
        .select("balance_credits")
        .eq("consumer_id", existing.data.id)
        .eq("environment", project.environment)
        .maybeSingle<Pick<ConsumerCreditAccountRow, "balance_credits">>();

      const balance = asNumber(creditResult.data?.balance_credits) ?? 0;
      const record = mapConsumerRow(existing.data, balance);
      state.consumers.set(consumerMemoryKey(project.publicId, email), record);
      return record;
    }

    // Create new consumer
    const publicId = `con_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
    const created = await supabase
      .from("huru_consumers")
      .insert({
        public_id: publicId,
        project_id: project.storageId,
        email,
        name: name ?? null,
        auth_provider: authProvider ?? null,
        auth_provider_user_id: authProviderUserId ?? null,
      })
      .select(selectCols)
      .single<ConsumerRow>();

    if (created.error) {
      throw created.error;
    }

    const starterCredits = runtimeConfig.consumerStarterCredits;
    await supabase.from("huru_consumer_credit_accounts").insert({
      consumer_id: created.data.id,
      project_id: project.storageId,
      environment: project.environment,
      balance_credits: starterCredits,
      reserved_credits: 0,
    });

    await insertLedgerEntry({
      projectId: project.storageId,
      environment: project.environment,
      direction: "credit",
      amountCredits: starterCredits,
      balanceAfterCredits: starterCredits,
      entryType: "consumer_starter",
      notes: `Starter credits for consumer ${email}`,
      metadata: { consumer_public_id: publicId },
    });

    const record = mapConsumerRow(created.data, starterCredits);
    state.consumers.set(consumerMemoryKey(project.publicId, email), record);
    return record;
  }, () => resolveMemoryConsumer(project, email, name, authProvider, authProviderUserId));
}

function resolveMemoryConsumer(
  project: HuruProjectRecord,
  email: string,
  name?: string,
  authProvider?: string,
  authProviderUserId?: string,
): HuruConsumerRecord {
  const key = consumerMemoryKey(project.publicId, email);
  const existing = state.consumers.get(key);
  if (existing) {
    if (name && !existing.name) {
      existing.name = name;
    }
    if (authProvider && !existing.authProvider) {
      existing.authProvider = authProvider;
    }
    if (authProviderUserId && !existing.authProviderUserId) {
      existing.authProviderUserId = authProviderUserId;
    }
    return { ...existing };
  }

  const consumer: HuruConsumerRecord = {
    id: `con_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    projectId: project.publicId,
    email,
    name,
    creditsBalance: runtimeConfig.consumerStarterCredits,
    createdAt: new Date().toISOString(),
    authProvider,
    authProviderUserId,
  };
  state.consumers.set(key, consumer);
  return { ...consumer };
}

export type PreReserveResult = { ok: true } | { ok: false; balance: number; needed: number };

export async function preReserveConsumerCredits(
  consumer: HuruConsumerRecord,
  estimate: number,
  requestId: string,
): Promise<PreReserveResult> {
  return runWithStoreFallback(async () => {
    if (estimate <= 0 || !consumer.storageId) {
      return memoryPreReserveConsumer(consumer, requestId, estimate);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return memoryPreReserveConsumer(consumer, requestId, estimate);
    }

    const accountResult = await supabase
      .from("huru_consumer_credit_accounts")
      .select("id, balance_credits, reserved_credits")
      .eq("consumer_id", consumer.storageId)
      .maybeSingle<{ id: string; balance_credits: number | string; reserved_credits: number | string }>();

    if (accountResult.error || !accountResult.data) {
      return { ok: false, balance: 0, needed: estimate };
    }

    const balance = asNumber(accountResult.data.balance_credits) ?? 0;
    const currentReserved = asNumber(accountResult.data.reserved_credits) ?? 0;

    if (balance - currentReserved < estimate) {
      return { ok: false, balance: balance - currentReserved, needed: estimate };
    }

    const nextReserved = currentReserved + estimate;
    const updated = await supabase
      .from("huru_consumer_credit_accounts")
      .update({
        reserved_credits: nextReserved,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountResult.data.id)
      .eq("reserved_credits", currentReserved)
      .select("id")
      .maybeSingle();

    if (updated.error || !updated.data) {
      return { ok: false, balance: balance - currentReserved, needed: estimate };
    }

    return { ok: true };
  }, () => memoryPreReserveConsumer(consumer, requestId, estimate));
}

function memoryPreReserveConsumer(
  consumer: HuruConsumerRecord,
  requestId: string,
  amount: number,
): PreReserveResult {
  if (amount <= 0) {
    return { ok: true };
  }

  const totalReserved = Array.from(state.consumerReservedCredits.entries())
    .filter(([key]) => key.startsWith(`${consumer.id}:`))
    .reduce((sum, [, v]) => sum + v, 0);

  const available = consumer.creditsBalance - totalReserved;
  if (available < amount) {
    return { ok: false, balance: available, needed: amount };
  }

  state.consumerReservedCredits.set(`${consumer.id}:${requestId}`, amount);
  return { ok: true };
}

export async function settleConsumerCredits(
  consumer: HuruConsumerRecord,
  requestId: string,
  actualUsage: number,
  reservedAmount: number,
): Promise<void> {
  return runWithStoreFallback(async () => {
    if (!consumer.storageId) {
      memorySettleConsumer(consumer, requestId, actualUsage);
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      memorySettleConsumer(consumer, requestId, actualUsage);
      return;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const accountResult = await supabase
        .from("huru_consumer_credit_accounts")
        .select("id, balance_credits, reserved_credits, project_id, environment")
        .eq("consumer_id", consumer.storageId)
        .maybeSingle<ConsumerCreditAccountRow>();

      if (accountResult.error || !accountResult.data) {
        memorySettleConsumer(consumer, requestId, actualUsage);
        return;
      }

      const balance = asNumber(accountResult.data.balance_credits) ?? 0;
      const currentReserved = asNumber(accountResult.data.reserved_credits) ?? 0;
      const newBalance = Math.max(0, balance - actualUsage);
      const newReserved = Math.max(0, currentReserved - reservedAmount);

      const updated = await supabase
        .from("huru_consumer_credit_accounts")
        .update({
          balance_credits: newBalance,
          reserved_credits: newReserved,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountResult.data.id)
        .eq("balance_credits", balance)
        .eq("reserved_credits", currentReserved)
        .select("id")
        .maybeSingle();

      if (updated.data) {
        await supabase.from("huru_credit_ledger").insert({
          public_id: `led_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
          project_id: accountResult.data.project_id,
          environment: accountResult.data.environment,
          consumer_id: consumer.storageId,
          entry_type: "request_usage",
          direction: "debit",
          amount_credits: actualUsage,
          balance_after_credits: newBalance,
          notes: `Consumer usage debit for ${requestId}`,
          metadata_json: { request_id: requestId, reserved: reservedAmount, actual: actualUsage },
        });
        return;
      }
      // CAS conflict — retry
    }

    throw new Error(`Failed to settle consumer credits for ${requestId} after retries.`);
  }, () => {
    memorySettleConsumer(consumer, requestId, actualUsage);
  });
}

function memorySettleConsumer(
  consumer: HuruConsumerRecord,
  requestId: string,
  actual: number,
): void {
  state.consumerReservedCredits.delete(`${consumer.id}:${requestId}`);
  const memConsumer = findMemoryConsumer(consumer.id);
  if (memConsumer) {
    memConsumer.creditsBalance -= actual;
  }
}

function findMemoryConsumer(publicId: string): HuruConsumerRecord | null {
  for (const consumer of state.consumers.values()) {
    if (consumer.id === publicId) {
      return consumer;
    }
  }
  return null;
}

export async function releaseConsumerReservedCredits(
  consumer: HuruConsumerRecord,
  requestId: string,
  reservedAmount: number,
): Promise<void> {
  return runWithStoreFallback(async () => {
    if (reservedAmount <= 0 || !consumer.storageId) {
      state.consumerReservedCredits.delete(`${consumer.id}:${requestId}`);
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      state.consumerReservedCredits.delete(`${consumer.id}:${requestId}`);
      return;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const accountResult = await supabase
        .from("huru_consumer_credit_accounts")
        .select("id, reserved_credits")
        .eq("consumer_id", consumer.storageId)
        .maybeSingle<{ id: string; reserved_credits: number | string }>();

      if (accountResult.error || !accountResult.data) {
        state.consumerReservedCredits.delete(`${consumer.id}:${requestId}`);
        return;
      }

      const currentReserved = asNumber(accountResult.data.reserved_credits) ?? 0;
      const newReserved = Math.max(0, currentReserved - reservedAmount);

      const updated = await supabase
        .from("huru_consumer_credit_accounts")
        .update({
          reserved_credits: newReserved,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountResult.data.id)
        .eq("reserved_credits", currentReserved)
        .select("id")
        .maybeSingle();

      if (updated.data) {
        return;
      }
      // CAS conflict — retry
    }
  }, () => {
    state.consumerReservedCredits.delete(`${consumer.id}:${requestId}`);
  });
}

export async function addConsumerCredits(
  consumer: HuruConsumerRecord,
  amount: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return runWithStoreFallback(async () => {
    if (amount <= 0 || !consumer.storageId) {
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      const memConsumer = findMemoryConsumer(consumer.id);
      if (memConsumer) {
        memConsumer.creditsBalance += amount;
      }
      return;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const accountResult = await supabase
        .from("huru_consumer_credit_accounts")
        .select("id, balance_credits, project_id, environment")
        .eq("consumer_id", consumer.storageId)
        .maybeSingle<ConsumerCreditAccountRow>();

      if (accountResult.error || !accountResult.data) {
        return;
      }

      const currentBalance = asNumber(accountResult.data.balance_credits) ?? 0;
      const newBalance = currentBalance + amount;

      const updated = await supabase
        .from("huru_consumer_credit_accounts")
        .update({
          balance_credits: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountResult.data.id)
        .eq("balance_credits", currentBalance)
        .select("id")
        .maybeSingle();

      if (updated.data) {
        await supabase.from("huru_credit_ledger").insert({
          public_id: `led_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
          project_id: accountResult.data.project_id,
          environment: accountResult.data.environment,
          consumer_id: consumer.storageId,
          entry_type: "topup",
          direction: "credit",
          amount_credits: amount,
          balance_after_credits: newBalance,
          notes: `Consumer top-up for ${consumer.email}`,
          metadata_json: metadata ?? {},
        });
        return;
      }
      // CAS conflict — retry
    }
  }, () => {
    const memConsumer = findMemoryConsumer(consumer.id);
    if (memConsumer) {
      memConsumer.creditsBalance += amount;
    }
  });
}

export async function createConsumerCreditPurchase(
  project: HuruProjectRecord,
  consumer: HuruConsumerRecord,
  pack: HuruCreditPack,
  reference: string,
): Promise<void> {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      return;
    }

    const packResult = await supabase
      .from("huru_credit_packs")
      .select("id")
      .eq("pack_id", pack.packId)
      .maybeSingle<{ id: string }>();

    if (packResult.error || !packResult.data?.id) {
      throw packResult.error ?? new Error("Credit pack missing in storage.");
    }

    const purchaseResult = await supabase.from("huru_credit_purchases").insert({
      public_id: `pur_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      project_id: project.storageId,
      consumer_id: consumer.storageId ?? null,
      credit_pack_id: packResult.data.id,
      provider: "paystack",
      reference,
      status: "pending",
      amount_minor: pack.amountMinor,
      currency: pack.currency,
    });

    if (purchaseResult.error && purchaseResult.error.code !== "23505") {
      throw purchaseResult.error;
    }
  }, () => undefined);
}

export async function applySuccessfulConsumerCreditPurchase(
  reference: string,
  payload: {
    id?: string | number | null;
    status?: string | null;
    amount?: number | null;
    currency?: string | null;
    fees?: number | null;
    gateway_response?: string | null;
    paid_at?: string | null;
    metadata?: Record<string, unknown> | null;
    rawPayload: Record<string, unknown>;
  },
): Promise<void> {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return;
    }

    type PurchaseRow = {
      id: string;
      project_id: string;
      consumer_id: string | null;
      currency: string;
      amount_minor: number | string;
      credited_at: string | null;
      huru_credit_packs:
        | { credits_awarded: number | string }
        | Array<{ credits_awarded: number | string }>
        | null;
      huru_projects:
        | { public_id: string; environment_mode: string }
        | Array<{ public_id: string; environment_mode: string }>
        | null;
    };

    const purchaseResult = await supabase
      .from("huru_credit_purchases")
      .select(
        "id, project_id, consumer_id, currency, amount_minor, credited_at, huru_credit_packs(credits_awarded), huru_projects(public_id, environment_mode)",
      )
      .eq("reference", reference)
      .maybeSingle<PurchaseRow>();

    if (purchaseResult.error || !purchaseResult.data) {
      throw purchaseResult.error ?? new Error("Credit purchase not found.");
    }

    const pack = unwrapRelation(purchaseResult.data.huru_credit_packs);
    const project = unwrapRelation(purchaseResult.data.huru_projects);
    const creditsAwarded = asNumber(pack?.credits_awarded) ?? 0;
    const environment = coerceEnvironment(project?.environment_mode);
    const consumerId = purchaseResult.data.consumer_id;

    await supabase.from("huru_paystack_transactions").upsert(
      {
        credit_purchase_id: purchaseResult.data.id,
        reference,
        paystack_transaction_id:
          payload.id != null ? String(payload.id) : null,
        status: payload.status ?? null,
        amount_minor: payload.amount ?? null,
        currency: payload.currency ?? purchaseResult.data.currency,
        fees_minor: payload.fees ?? null,
        gateway_response: payload.gateway_response ?? null,
        paid_at: payload.paid_at ?? null,
        raw_payload_json: payload.rawPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "reference" },
    );

    const now = new Date().toISOString();

    if (creditsAwarded > 0 && consumerId && !purchaseResult.data.credited_at) {
      // Atomically claim — only one concurrent webhook wins
      const claimed = await supabase
        .from("huru_credit_purchases")
        .update({
          status: "processing",
          updated_at: now,
        })
        .eq("reference", reference)
        .is("credited_at", null)
        .select("id")
        .maybeSingle();

      if (claimed?.data) {
        // Credits first — if this fails, credited_at stays null and retry re-attempts
        for (let attempt = 0; attempt < 3; attempt++) {
          const accountResult = await supabase
            .from("huru_consumer_credit_accounts")
            .select("id, balance_credits, environment")
            .eq("consumer_id", consumerId)
            .eq("environment", environment)
            .maybeSingle<{ id: string; balance_credits: number | string; environment: string }>();

          if (!accountResult.data) {
            break;
          }

          const currentBalance = asNumber(accountResult.data.balance_credits) ?? 0;
          const newBalance = currentBalance + creditsAwarded;

          const updated = await supabase
            .from("huru_consumer_credit_accounts")
            .update({
              balance_credits: newBalance,
              updated_at: now,
            })
            .eq("id", accountResult.data.id)
            .eq("balance_credits", currentBalance)
            .select("id")
            .maybeSingle();

          if (updated.data) {
            await supabase.from("huru_credit_ledger").insert({
              public_id: `led_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
              project_id: purchaseResult.data.project_id,
              environment,
              consumer_id: consumerId,
              entry_type: "topup",
              direction: "credit",
              amount_credits: creditsAwarded,
              balance_after_credits: newBalance,
              notes: `Consumer Paystack top-up ${reference}`,
              metadata_json: {
                reference,
                paystack_status: payload.status ?? "success",
              },
            });
            break;
          }
          // CAS conflict — retry
        }

        // Mark credited only after balance is updated
        await supabase
          .from("huru_credit_purchases")
          .update({
            status: "success",
            provider_transaction_id: payload.id != null ? String(payload.id) : null,
            provider_status: payload.status ?? "success",
            verified_at: now,
            credited_at: now,
            updated_at: now,
          })
          .eq("reference", reference);
      }
    } else {
      // Already credited or zero credits — just update status
      await supabase
        .from("huru_credit_purchases")
        .update({
          status: "success",
          provider_transaction_id: payload.id != null ? String(payload.id) : null,
          provider_status: payload.status ?? "success",
          verified_at: now,
          updated_at: now,
        })
        .eq("reference", reference);
    }
  }, () => {
    // no-op in memory fallback for consumer purchases
  });
}

export async function listConsumers(
  project: HuruProjectRecord,
): Promise<HuruConsumerRecord[]> {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      return listMemoryConsumers(project);
    }

    const result = await supabase
      .from("huru_consumers")
      .select("id, public_id, project_id, email, name, created_at, auth_provider, auth_provider_user_id")
      .eq("project_id", project.storageId)
      .order("created_at", { ascending: false });

    if (result.error) {
      throw result.error;
    }

    const consumerRows = (result.data ?? []) as ConsumerRow[];
    if (consumerRows.length === 0) {
      return [];
    }

    const consumerIds = consumerRows.map((c) => c.id);
    const creditsResult = await supabase
      .from("huru_consumer_credit_accounts")
      .select("consumer_id, balance_credits")
      .in("consumer_id", consumerIds)
      .eq("environment", project.environment);

    const balances = new Map<string, number>();
    for (const row of creditsResult.data ?? []) {
      balances.set(row.consumer_id, asNumber(row.balance_credits) ?? 0);
    }

    return consumerRows.map((row) =>
      mapConsumerRow(row, balances.get(row.id) ?? 0),
    );
  }, () => listMemoryConsumers(project));
}

function listMemoryConsumers(project: HuruProjectRecord): HuruConsumerRecord[] {
  const result: HuruConsumerRecord[] = [];
  for (const consumer of state.consumers.values()) {
    if (consumer.projectId === project.publicId) {
      result.push({ ...consumer });
    }
  }
  return result;
}

export async function getConsumer(
  project: HuruProjectRecord,
  consumerId: string,
): Promise<HuruConsumerRecord | null> {
  return runWithStoreFallback(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase || !project.storageId) {
      return getMemoryConsumer(project, consumerId);
    }

    const result = await supabase
      .from("huru_consumers")
      .select("id, public_id, project_id, email, name, created_at, auth_provider, auth_provider_user_id")
      .eq("project_id", project.storageId)
      .eq("public_id", consumerId)
      .maybeSingle<ConsumerRow>();

    if (result.error || !result.data) {
      return null;
    }

    const creditResult = await supabase
      .from("huru_consumer_credit_accounts")
      .select("balance_credits")
      .eq("consumer_id", result.data.id)
      .eq("environment", project.environment)
      .maybeSingle<Pick<ConsumerCreditAccountRow, "balance_credits">>();

    const balance = asNumber(creditResult.data?.balance_credits) ?? 0;
    return mapConsumerRow(result.data, balance);
  }, () => getMemoryConsumer(project, consumerId));
}

function getMemoryConsumer(
  project: HuruProjectRecord,
  consumerId: string,
): HuruConsumerRecord | null {
  for (const consumer of state.consumers.values()) {
    if (consumer.projectId === project.publicId && consumer.id === consumerId) {
      return { ...consumer };
    }
  }
  return null;
}
