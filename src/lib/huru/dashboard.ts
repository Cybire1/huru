import { getSupabaseAdmin } from "@/lib/huru/supabase";
import { hashValue } from "@/lib/huru/http";
import { runtimeConfig } from "@/lib/huru/config";
import { getProjectCacheStats } from "@/lib/huru/cache";
import type { HuruEnvironment, HuruProjectCreateInput, HuruProjectRecord } from "@/lib/huru/types";
import { buildUsageSummary } from "@/lib/huru/store";
import { createCheckoutSession } from "@/lib/huru/paystack";
import { getCreditPack } from "@/lib/huru/paystack";

type DashboardAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type DashboardUserRow = {
  id: string;
  public_id: string;
  email: string;
  name: string | null;
  auth_provider: string;
  auth_provider_user_id: string | null;
};

type DashboardProjectRow = {
  id: string;
  public_id: string;
  name: string;
  environment_mode: string;
  created_at: string;
};

type DashboardApiKeyRow = {
  id: string;
  project_id: string;
  key_prefix: string;
  revoked_at: string | null;
};

type DashboardCreditRow = {
  project_id: string;
  balance_credits: number | string;
};

type DashboardRequestRow = {
  id: string;
  public_id: string;
  endpoint: string;
  method: string;
  model_alias: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  credits_used: number | string | null;
  request_body_json: Record<string, unknown> | null;
  response_body_json: Record<string, unknown> | null;
};

type DashboardVerificationRow = {
  verified: boolean;
  verification_mode: string | null;
  attestation_report_id: string | null;
  quote_hash: string | null;
  verified_at: string | null;
};

type DashboardCreditPurchaseRow = {
  id: string;
  public_id: string;
  reference: string;
  status: string;
  amount_minor: number | string;
  currency: string;
  provider_status: string | null;
  provider_transaction_id: string | null;
  verified_at: string | null;
  credited_at: string | null;
  created_at: string;
  huru_credit_packs:
    | { name: string; credits_awarded: number | string }
    | Array<{ name: string; credits_awarded: number | string }>
    | null;
  huru_paystack_transactions:
    | {
        status: string | null;
        paid_at: string | null;
      }
    | Array<{
        status: string | null;
        paid_at: string | null;
      }>
    | null;
};

export interface HuruDashboardProject extends HuruProjectRecord {
  apiKeyPrefix: string;
}

export interface HuruDashboardRequest {
  id: string;
  endpoint: string;
  method: string;
  model: string;
  status: string;
  creditsUsed: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  verified: boolean;
  verificationMode: string;
  attestationReportId: string | null;
  quoteHash: string | null;
  requestPreview: string;
  responsePreview: string;
}

export interface HuruDashboardProjectDetail {
  user: HuruDashboardOverview["user"];
  project: HuruDashboardProject;
  usage: {
    requests: number;
    creditsUsed: number;
    currentBalance: number;
    breakdown: Array<{
      date: string;
      requests: number;
      creditsUsed: number;
    }>;
  };
  requests: HuruDashboardRequest[];
  purchases: Array<{
    id: string;
    reference: string;
    name: string;
    amountMinor: number;
    currency: string;
    creditsAwarded: number;
    status: string;
    providerStatus: string | null;
    providerTransactionId: string | null;
    verifiedAt: string | null;
    creditedAt: string | null;
    paidAt: string | null;
  }>;
  key: {
    id: string;
    prefix: string;
  } | null;
}

export interface HuruDashboardRequestDetail {
  user: HuruDashboardOverview["user"];
  project: HuruDashboardProject;
  request: HuruDashboardRequest;
}

export interface HuruDashboardOverview {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  projects: HuruDashboardProject[];
}

function asNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function coerceEnvironment(value: string | null | undefined): HuruEnvironment {
  return value === "live" ? "live" : "test";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function createApiKeyPrefix(key: string) {
  return key.slice(0, 16);
}

async function resolveAuthUser(accessToken: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function ensureDashboardUser(user: DashboardAuthUser) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const email = user.email?.trim() || `${user.id}@huru.local`;
  const name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    null;

  const existing = await supabase
    .from("huru_users")
    .select("id, public_id, email, name, auth_provider, auth_provider_user_id")
    .eq("auth_provider_user_id", user.id)
    .maybeSingle<DashboardUserRow>();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    const updates: Partial<DashboardUserRow> = {
      email,
      name,
    };

    const updated = await supabase
      .from("huru_users")
      .update(updates)
      .eq("id", existing.data.id)
      .select("id, public_id, email, name, auth_provider, auth_provider_user_id")
      .single<DashboardUserRow>();

    if (updated.error) {
      throw updated.error;
    }

    return updated.data;
  }

  const created = await supabase
    .from("huru_users")
    .insert({
      public_id: `usr_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      email,
      name,
      auth_provider: "supabase",
      auth_provider_user_id: user.id,
    })
    .select("id, public_id, email, name, auth_provider, auth_provider_user_id")
    .single<DashboardUserRow>();

  if (created.error) {
    throw created.error;
  }

  return created.data;
}

function mapProjectRow(
  project: DashboardProjectRow,
  balance: number,
  apiKeyPrefix: string,
): HuruDashboardProject {
  return {
    id: project.public_id,
    publicId: project.public_id,
    name: project.name,
    environment: coerceEnvironment(project.environment_mode),
    apiKey: `${apiKeyPrefix}...`,
    creditsBalance: balance,
    createdAt: project.created_at,
    storageId: project.id,
    apiKeyPrefix,
  };
}

function mapDashboardRequestRow(
  request: DashboardRequestRow,
  verification?: DashboardVerificationRow | null,
): HuruDashboardRequest {
  const requestPreview = JSON.stringify(request.request_body_json ?? {}, null, 0).slice(0, 180);
  const responsePreview = JSON.stringify(request.response_body_json ?? {}, null, 0).slice(0, 180);

  return {
    id: request.public_id,
    endpoint: request.endpoint,
    method: request.method,
    model: request.model_alias ?? "unknown",
    status: request.status,
    creditsUsed: asNumber(request.credits_used) ?? 0,
    startedAt: request.started_at,
    completedAt: request.completed_at,
    errorMessage: request.error_message,
    verified: verification?.verified ?? false,
    verificationMode: verification?.verification_mode ?? "unknown",
    attestationReportId: verification?.attestation_report_id ?? null,
    quoteHash: verification?.quote_hash ?? null,
    requestPreview,
    responsePreview,
  };
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function resolveDashboardIdentity(accessToken: string | null) {
  if (!accessToken) {
    return null;
  }

  const authUser = await resolveAuthUser(accessToken);
  if (!authUser) {
    return null;
  }

  const userRow = await ensureDashboardUser(authUser);
  return { authUser, userRow };
}

export async function getDashboardOverview(accessToken: string): Promise<HuruDashboardOverview | null> {
  const identity = await resolveDashboardIdentity(accessToken);
  if (!identity) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const projectsResult = await supabase
    .from("huru_projects")
    .select("id, public_id, name, environment_mode, created_at")
    .eq("user_id", identity.userRow.id);

  if (projectsResult.error) {
    throw projectsResult.error;
  }

  const projectRows = projectsResult.data ?? [];
  const projectIds = projectRows.map((project) => project.id);

  const balancesResult = projectIds.length
    ? await supabase
        .from("huru_credit_accounts")
        .select("project_id, balance_credits")
        .in("project_id", projectIds)
    : { data: [], error: null };

  if (balancesResult.error) {
    throw balancesResult.error;
  }

  const keysResult = projectIds.length
    ? await supabase
        .from("huru_api_keys")
        .select("id, project_id, key_prefix, revoked_at")
        .in("project_id", projectIds)
        .is("revoked_at", null)
    : { data: [], error: null };

  if (keysResult.error) {
    throw keysResult.error;
  }

  const balances = new Map<string, number>();
  for (const row of balancesResult.data as DashboardCreditRow[]) {
    balances.set(row.project_id, asNumber(row.balance_credits));
  }

  const apiKeyPrefixes = new Map<string, string>();
  for (const row of keysResult.data as DashboardApiKeyRow[]) {
    if (!apiKeyPrefixes.has(row.project_id)) {
      apiKeyPrefixes.set(row.project_id, row.key_prefix);
    }
  }

  return {
    user: {
      id: identity.userRow.public_id,
      email: identity.userRow.email,
      name: identity.userRow.name,
    },
    projects: projectRows.map((project) =>
      mapProjectRow(
        project,
        balances.get(project.id) ?? 0,
        apiKeyPrefixes.get(project.id) ?? "sk_unknown",
      ),
    ),
  };
}

export async function createDashboardProject(
  accessToken: string,
  input: HuruProjectCreateInput,
) {
  const identity = await resolveDashboardIdentity(accessToken);
  if (!identity) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const slug = input.slug?.trim() || slugify(input.name) || `project-${crypto.randomUUID().slice(0, 8)}`;
  const environment = input.environment ?? "test";
  const createdProject = await supabase
    .from("huru_projects")
    .insert({
      public_id: `proj_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      user_id: identity.userRow.id,
      name: input.name.trim(),
      slug,
      environment_mode: environment,
      status: "active",
    })
    .select("id, public_id, name, environment_mode, created_at")
    .single<DashboardProjectRow>();

  if (createdProject.error) {
    throw createdProject.error;
  }

  const apiKey = `sk_${environment}_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const keyInsert = await supabase.from("huru_api_keys").insert({
    public_id: `key_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
    project_id: createdProject.data.id,
    environment,
    key_prefix: createApiKeyPrefix(apiKey),
    key_hash: hashValue(apiKey),
    name: "Default project key",
  });

  if (keyInsert.error) {
    throw keyInsert.error;
  }

  const accountInsert = await supabase.from("huru_credit_accounts").insert({
    project_id: createdProject.data.id,
    environment,
    balance_credits: runtimeConfig.bootstrapCredits,
    reserved_credits: 0,
  });

  if (accountInsert.error) {
    throw accountInsert.error;
  }

  return {
    id: createdProject.data.public_id,
    name: createdProject.data.name,
    environment: coerceEnvironment(createdProject.data.environment_mode),
    api_key: apiKey,
    api_key_prefix: createApiKeyPrefix(apiKey),
    credits_balance: runtimeConfig.bootstrapCredits,
    created_at: createdProject.data.created_at,
  };
}

async function fetchProjectRowForOwner(accessToken: string, projectPublicId: string) {
  const identity = await resolveDashboardIdentity(accessToken);
  if (!identity) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const projectResult = await supabase
    .from("huru_projects")
    .select("id, public_id, name, environment_mode, created_at, user_id")
    .eq("public_id", projectPublicId)
    .eq("user_id", identity.userRow.id)
    .maybeSingle<{ id: string; public_id: string; name: string; environment_mode: string; created_at: string; user_id: string }>();

  if (projectResult.error || !projectResult.data) {
    return null;
  }

  return { identity, projectRow: projectResult.data };
}

export async function getDashboardProjectDetail(
  accessToken: string,
  projectPublicId: string,
): Promise<HuruDashboardProjectDetail | null> {
  const resolved = await fetchProjectRowForOwner(accessToken, projectPublicId);
  if (!resolved) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { identity, projectRow } = resolved;
  const environment = coerceEnvironment(projectRow.environment_mode);
  const creditResult = await supabase
    .from("huru_credit_accounts")
    .select("balance_credits")
    .eq("project_id", projectRow.id)
    .eq("environment", environment)
    .maybeSingle<Pick<DashboardCreditRow, "balance_credits">>();

  if (creditResult.error) {
    throw creditResult.error;
  }

  const keyResult = await supabase
    .from("huru_api_keys")
    .select("id, project_id, key_prefix, revoked_at, created_at")
    .eq("project_id", projectRow.id)
    .eq("environment", environment)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .maybeSingle<DashboardApiKeyRow>();

  if (keyResult.error) {
    throw keyResult.error;
  }

  const requestsResult = await supabase
    .from("huru_requests")
    .select(
      "id, public_id, endpoint, method, model_alias, status, started_at, completed_at, error_message, credits_used, request_body_json, response_body_json",
    )
    .eq("project_id", projectRow.id)
    .order("started_at", { ascending: false })
    .limit(8);

  if (requestsResult.error) {
    throw requestsResult.error;
  }

  const requestRows = (requestsResult.data ?? []) as DashboardRequestRow[];
  const requestVerifications = requestRows.length
    ? await supabase
        .from("huru_request_verifications")
        .select("request_id, verified, verification_mode, attestation_report_id, quote_hash, verified_at")
        .in(
          "request_id",
          requestRows.map((row) => row.id),
        )
    : { data: [], error: null };

  if (requestVerifications.error) {
    throw requestVerifications.error;
  }

  const verificationByRequestId = new Map<string, DashboardVerificationRow>();
  for (const verification of requestVerifications.data ?? []) {
    verificationByRequestId.set(verification.request_id, verification as DashboardVerificationRow);
  }

  const purchasesResult = await supabase
    .from("huru_credit_purchases")
    .select(
      "id, public_id, reference, status, amount_minor, currency, provider_status, provider_transaction_id, verified_at, credited_at, created_at, huru_credit_packs(name, credits_awarded), huru_paystack_transactions(status, paid_at)",
    )
    .eq("project_id", projectRow.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (purchasesResult.error) {
    throw purchasesResult.error;
  }

  const usage = await buildUsageSummary(
    {
      id: identity.userRow.public_id,
      publicId: identity.userRow.public_id,
      name: projectRow.name,
      environment,
      apiKey: `sk_${environment}_${keyResult.data?.key_prefix ?? "unknown"}`,
      creditsBalance: asNumber(creditResult.data?.balance_credits) ?? 0,
      createdAt: projectRow.created_at,
      storageId: projectRow.id,
      apiKeyStorageId: keyResult.data?.id,
    },
    undefined,
    undefined,
  );

  const project = mapProjectRow(
    projectRow,
    asNumber(creditResult.data?.balance_credits) ?? 0,
    keyResult.data?.key_prefix ?? "sk_unknown",
  );

  return {
    user: {
      id: identity.userRow.public_id,
      email: identity.userRow.email,
      name: identity.userRow.name,
    },
    project,
    usage: {
      requests: usage.totals.requests,
      creditsUsed: usage.totals.creditsUsed,
      currentBalance: usage.totals.currentBalance,
      breakdown: usage.breakdown,
    },
    requests: requestRows.map((row) =>
      mapDashboardRequestRow(row, verificationByRequestId.get(row.id)),
    ),
    purchases: (purchasesResult.data ?? []).map((row) => {
      const purchase = row as DashboardCreditPurchaseRow;
      const pack = unwrapRelation(purchase.huru_credit_packs);
      const transaction = unwrapRelation(purchase.huru_paystack_transactions);

      return {
        id: purchase.public_id,
        reference: purchase.reference,
        name: pack?.name ?? "Top-up",
        amountMinor: asNumber(purchase.amount_minor) ?? 0,
        currency: purchase.currency,
        creditsAwarded: asNumber(pack?.credits_awarded) ?? 0,
        status: purchase.status,
        providerStatus: purchase.provider_status,
        providerTransactionId: purchase.provider_transaction_id,
        verifiedAt: purchase.verified_at,
        creditedAt: purchase.credited_at,
        paidAt: transaction?.paid_at ?? null,
      };
    }),
    key: keyResult.data
      ? {
          id: keyResult.data.id,
          prefix: keyResult.data.key_prefix,
        }
      : null,
  };
}

export async function getDashboardRequestDetail(
  accessToken: string,
  requestPublicId: string,
): Promise<HuruDashboardRequestDetail | null> {
  const identity = await resolveDashboardIdentity(accessToken);
  if (!identity) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const requestResult = await supabase
    .from("huru_requests")
    .select(
      "id, public_id, project_id, endpoint, method, model_alias, status, started_at, completed_at, error_message, credits_used, request_body_json, response_body_json",
    )
    .eq("public_id", requestPublicId)
    .maybeSingle<DashboardRequestRow & { project_id: string }>();

  if (requestResult.error || !requestResult.data) {
    return null;
  }

  const projectResult = await supabase
    .from("huru_projects")
    .select("id, public_id, name, environment_mode, created_at, user_id")
    .eq("id", requestResult.data.project_id)
    .eq("user_id", identity.userRow.id)
    .maybeSingle<{
      id: string;
      public_id: string;
      name: string;
      environment_mode: string;
      created_at: string;
      user_id: string;
    }>();

  if (projectResult.error || !projectResult.data) {
    return null;
  }

  const environment = coerceEnvironment(projectResult.data.environment_mode);
  const creditResult = await supabase
    .from("huru_credit_accounts")
    .select("balance_credits")
    .eq("project_id", projectResult.data.id)
    .eq("environment", environment)
    .maybeSingle<Pick<DashboardCreditRow, "balance_credits">>();

  if (creditResult.error) {
    throw creditResult.error;
  }

  const verificationResult = await supabase
    .from("huru_request_verifications")
    .select("verified, verification_mode, attestation_report_id, quote_hash, verified_at")
    .eq("request_id", requestResult.data.id)
    .maybeSingle<DashboardVerificationRow>();

  if (verificationResult.error) {
    throw verificationResult.error;
  }

  const project = mapProjectRow(
    projectResult.data,
    asNumber(creditResult.data?.balance_credits) ?? 0,
    "sk_unknown",
  );

  return {
    user: {
      id: identity.userRow.public_id,
      email: identity.userRow.email,
      name: identity.userRow.name,
    },
    project,
    request: mapDashboardRequestRow(requestResult.data, verificationResult.data),
  };
}

export async function rotateDashboardProjectKey(
  accessToken: string,
  projectPublicId: string,
): Promise<{ apiKey: string; apiKeyPrefix: string; keyId: string; project: HuruDashboardProject } | null> {
  const resolved = await fetchProjectRowForOwner(accessToken, projectPublicId);
  if (!resolved) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { projectRow } = resolved;
  const environment = coerceEnvironment(projectRow.environment_mode);
  const currentKeys = await supabase
    .from("huru_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("project_id", projectRow.id)
    .eq("environment", environment)
    .is("revoked_at", null)
    .select("id");

  if (currentKeys.error) {
    throw currentKeys.error;
  }

  const apiKey = `sk_${environment}_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const apiKeyInsert = await supabase
    .from("huru_api_keys")
    .insert({
      public_id: `key_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      project_id: projectRow.id,
      environment,
      key_prefix: createApiKeyPrefix(apiKey),
      key_hash: hashValue(apiKey),
      name: "Rotated project key",
    })
    .select("id, key_prefix")
    .single<DashboardApiKeyRow>();

  if (apiKeyInsert.error) {
    throw apiKeyInsert.error;
  }

  const creditResult = await supabase
    .from("huru_credit_accounts")
    .select("balance_credits")
    .eq("project_id", projectRow.id)
    .eq("environment", environment)
    .maybeSingle<Pick<DashboardCreditRow, "balance_credits">>();

  if (creditResult.error) {
    throw creditResult.error;
  }

  const project = mapProjectRow(
    projectRow,
    asNumber(creditResult.data?.balance_credits) ?? 0,
    apiKeyInsert.data.key_prefix,
  );

  return {
    apiKey,
    apiKeyPrefix: apiKeyInsert.data.key_prefix,
    keyId: apiKeyInsert.data.id,
    project,
  };
}

export async function createDashboardTopUpCheckout(
  accessToken: string,
  projectPublicId: string,
  packId: string,
  successUrl?: string,
  cancelUrl?: string,
) {
  const resolved = await fetchProjectRowForOwner(accessToken, projectPublicId);
  if (!resolved) {
    return null;
  }

  const pack = getCreditPack(packId);
  if (!pack) {
    throw new Error("Unknown credit pack.");
  }

  return createCheckoutSession({
    project: {
      id: resolved.projectRow.public_id,
      publicId: resolved.projectRow.public_id,
      name: resolved.projectRow.name,
      environment: coerceEnvironment(resolved.projectRow.environment_mode),
      apiKey: `sk_${coerceEnvironment(resolved.projectRow.environment_mode)}_${resolved.projectRow.public_id}`,
      creditsBalance:
        (await supabaseBalanceForProject(resolved.projectRow.id, coerceEnvironment(resolved.projectRow.environment_mode))) ??
        0,
      createdAt: resolved.projectRow.created_at,
      storageId: resolved.projectRow.id,
    },
    packId,
    email: resolved.identity.authUser.email ?? "",
    successUrl,
    cancelUrl,
  });
}

async function supabaseBalanceForProject(projectId: string, environment: HuruEnvironment) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const result = await supabase
    .from("huru_credit_accounts")
    .select("balance_credits")
    .eq("project_id", projectId)
    .eq("environment", environment)
    .maybeSingle<{ balance_credits: number | string }>();

  if (result.error) {
    throw result.error;
  }

  return asNumber(result.data?.balance_credits) ?? 0;
}

export interface HuruDashboardAnalytics {
  daily: Array<{
    date: string;
    requests: number;
    creditsUsed: number;
  }>;
  endpoints: Array<{
    endpoint: string;
    requests: number;
    creditsUsed: number;
  }>;
  verification: {
    total: number;
    verified: number;
    rate: number;
  };
  burnRate: {
    avgDailyCredits: number;
    currentBalance: number;
    estimatedDaysRemaining: number | null;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    creditsSaved: number;
  };
  consumers: Array<{
    email: string;
    name: string | null;
    requests: number;
    creditsUsed: number;
  }>;
  requests: {
    items: Array<{
      id: string;
      endpoint: string;
      method: string;
      model: string;
      status: string;
      creditsUsed: number;
      startedAt: string;
      completedAt: string | null;
      verified: boolean;
      verificationMode: string;
      consumerEmail: string | null;
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
}

export async function getDashboardAnalytics(
  accessToken: string,
  projectPublicId: string,
  options?: {
    page?: number;
    pageSize?: number;
    endpointFilter?: string;
    statusFilter?: string;
  },
): Promise<HuruDashboardAnalytics | null> {
  const resolved = await fetchProjectRowForOwner(accessToken, projectPublicId);
  if (!resolved) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { projectRow } = resolved;
  const page = options?.page ?? 1;
  const pageSize = Math.min(options?.pageSize ?? 20, 100);
  const offset = (page - 1) * pageSize;

  // Daily breakdown (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const requestsResult = await supabase
    .from("huru_requests")
    .select("id, endpoint, method, model_alias, status, started_at, completed_at, credits_used, consumer_id, huru_consumers(email)")
    .eq("project_id", projectRow.id)
    .gte("started_at", thirtyDaysAgo.toISOString())
    .order("started_at", { ascending: false });

  if (requestsResult.error) {
    throw requestsResult.error;
  }

  const allRequests = (requestsResult.data ?? []).map((row) => {
    const r = row as {
      id: string;
      endpoint: string;
      method: string;
      model_alias: string | null;
      status: string;
      started_at: string;
      completed_at: string | null;
      credits_used: number | string | null;
      consumer_id: string | null;
      huru_consumers: Array<{ email: string }> | { email: string } | null;
    };
    const consumer = Array.isArray(r.huru_consumers) ? r.huru_consumers[0] : r.huru_consumers;
    return { ...r, consumer_email: consumer?.email ?? null };
  });

  // Daily aggregation
  const dailyMap = new Map<string, { requests: number; creditsUsed: number }>();
  for (const req of allRequests) {
    const date = req.started_at.slice(0, 10);
    const existing = dailyMap.get(date) ?? { requests: 0, creditsUsed: 0 };
    existing.requests += 1;
    existing.creditsUsed += asNumber(req.credits_used);
    dailyMap.set(date, existing);
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Endpoint aggregation
  const endpointMap = new Map<string, { requests: number; creditsUsed: number }>();
  for (const req of allRequests) {
    const existing = endpointMap.get(req.endpoint) ?? { requests: 0, creditsUsed: 0 };
    existing.requests += 1;
    existing.creditsUsed += asNumber(req.credits_used);
    endpointMap.set(req.endpoint, existing);
  }
  const endpoints = Array.from(endpointMap.entries())
    .map(([endpoint, data]) => ({ endpoint, ...data }))
    .sort((a, b) => b.requests - a.requests);

  // Verification stats
  const requestIds = allRequests.map((r) => r.id);
  let verifiedCount = 0;
  if (requestIds.length > 0) {
    const verResult = await supabase
      .from("huru_request_verifications")
      .select("verified")
      .in("request_id", requestIds)
      .eq("verified", true);

    if (!verResult.error) {
      verifiedCount = verResult.data?.length ?? 0;
    }
  }

  const totalRequests = allRequests.length;
  const verificationRate = totalRequests > 0 ? verifiedCount / totalRequests : 0;

  // Burn rate
  const environment = coerceEnvironment(projectRow.environment_mode);
  const creditResult = await supabase
    .from("huru_credit_accounts")
    .select("balance_credits")
    .eq("project_id", projectRow.id)
    .eq("environment", environment)
    .maybeSingle<Pick<DashboardCreditRow, "balance_credits">>();

  const currentBalance = asNumber(creditResult.data?.balance_credits);
  const daysWithData = dailyMap.size || 1;
  const totalCreditsUsed = daily.reduce((sum, d) => sum + d.creditsUsed, 0);
  const avgDailyCredits = Math.round(totalCreditsUsed / daysWithData);
  const estimatedDaysRemaining =
    avgDailyCredits > 0 ? Math.floor(currentBalance / avgDailyCredits) : null;

  // Consumer breakdown
  const consumerMap = new Map<string, { name: string | null; requests: number; creditsUsed: number }>();
  for (const req of allRequests) {
    const key = req.consumer_email ?? "unknown";
    const existing = consumerMap.get(key) ?? { name: null, requests: 0, creditsUsed: 0 };
    existing.requests += 1;
    existing.creditsUsed += asNumber(req.credits_used);
    consumerMap.set(key, existing);
  }
  const consumers = Array.from(consumerMap.entries())
    .map(([email, data]) => ({ email, ...data }))
    .sort((a, b) => b.creditsUsed - a.creditsUsed)
    .slice(0, 10);

  // Paginated request list with filters
  let filteredRequests = allRequests;
  if (options?.endpointFilter) {
    filteredRequests = filteredRequests.filter((r) => r.endpoint === options.endpointFilter);
  }
  if (options?.statusFilter) {
    filteredRequests = filteredRequests.filter((r) => r.status === options.statusFilter);
  }

  const paginatedItems = filteredRequests.slice(offset, offset + pageSize);

  // Get verification data for paginated items
  const paginatedIds = paginatedItems.map((r) => r.id);
  const paginatedVerMap = new Map<string, { verified: boolean; verification_mode: string | null }>();
  if (paginatedIds.length > 0) {
    const paginatedVerResult = await supabase
      .from("huru_request_verifications")
      .select("request_id, verified, verification_mode")
      .in("request_id", paginatedIds);

    if (!paginatedVerResult.error) {
      for (const v of paginatedVerResult.data ?? []) {
        paginatedVerMap.set(v.request_id, { verified: v.verified, verification_mode: v.verification_mode });
      }
    }
  }

  return {
    daily,
    endpoints,
    verification: {
      total: totalRequests,
      verified: verifiedCount,
      rate: Math.round(verificationRate * 10000) / 100,
    },
    burnRate: {
      avgDailyCredits,
      currentBalance,
      estimatedDaysRemaining,
    },
    cache: getProjectCacheStats(projectRow.public_id),
    consumers,
    requests: {
      items: paginatedItems.map((req) => {
        const ver = paginatedVerMap.get(req.id);
        return {
          id: req.id,
          endpoint: req.endpoint,
          method: req.method,
          model: req.model_alias ?? "unknown",
          status: req.status,
          creditsUsed: asNumber(req.credits_used),
          startedAt: req.started_at,
          completedAt: req.completed_at,
          verified: ver?.verified ?? false,
          verificationMode: ver?.verification_mode ?? "unknown",
          consumerEmail: req.consumer_email,
        };
      }),
      total: filteredRequests.length,
      page,
      pageSize,
    },
  };
}

export async function resolvePlaygroundProject(
  accessToken: string,
  projectPublicId: string,
): Promise<HuruProjectRecord | null> {
  const resolved = await fetchProjectRowForOwner(accessToken, projectPublicId);
  if (!resolved) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const { projectRow } = resolved;
  const environment = coerceEnvironment(projectRow.environment_mode);

  const creditResult = await supabase
    .from("huru_credit_accounts")
    .select("balance_credits")
    .eq("project_id", projectRow.id)
    .eq("environment", environment)
    .maybeSingle<{ balance_credits: number | string }>();

  const keyResult = await supabase
    .from("huru_api_keys")
    .select("id, key_prefix")
    .eq("project_id", projectRow.id)
    .eq("environment", environment)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .maybeSingle<{ id: string; key_prefix: string }>();

  return {
    id: projectRow.public_id,
    publicId: projectRow.public_id,
    name: projectRow.name,
    environment,
    apiKey: `sk_${environment}_${keyResult.data?.key_prefix ?? "unknown"}`,
    creditsBalance: asNumber(creditResult.data?.balance_credits) ?? 0,
    createdAt: projectRow.created_at,
    storageId: projectRow.id,
    apiKeyStorageId: keyResult.data?.id,
  };
}
