create extension if not exists pgcrypto;

create table if not exists public.huru_users (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  email text not null unique,
  name text,
  auth_provider text not null default 'supabase',
  auth_provider_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.huru_projects (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid not null references public.huru_users(id) on delete cascade,
  name text not null,
  slug text not null,
  environment_mode text not null default 'test',
  status text not null default 'active',
  webhook_url text,
  webhook_secret_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.huru_api_keys (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references public.huru_projects(id) on delete cascade,
  environment text not null,
  key_prefix text not null,
  key_hash text not null,
  name text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists huru_api_keys_project_idx on public.huru_api_keys(project_id);
create index if not exists huru_api_keys_prefix_idx on public.huru_api_keys(key_prefix);

create table if not exists public.huru_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.huru_projects(id) on delete cascade,
  environment text not null,
  balance_credits bigint not null default 0,
  reserved_credits bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (project_id, environment)
);

create table if not exists public.huru_credit_packs (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  pack_id text not null unique,
  name text not null,
  currency text not null,
  amount_minor bigint not null,
  credits_awarded bigint not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.huru_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references public.huru_projects(id) on delete cascade,
  credit_pack_id uuid not null references public.huru_credit_packs(id),
  provider text not null default 'paystack',
  reference text not null unique,
  status text not null,
  amount_minor bigint not null,
  currency text not null,
  provider_transaction_id text,
  provider_status text,
  verified_at timestamptz,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.huru_paystack_transactions (
  id uuid primary key default gen_random_uuid(),
  credit_purchase_id uuid not null references public.huru_credit_purchases(id) on delete cascade,
  reference text not null unique,
  paystack_transaction_id text,
  status text,
  amount_minor bigint,
  currency text,
  fees_minor bigint,
  gateway_response text,
  paid_at timestamptz,
  raw_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.huru_requests (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references public.huru_projects(id) on delete cascade,
  api_key_id uuid references public.huru_api_keys(id) on delete set null,
  environment text not null,
  endpoint text not null,
  method text not null,
  model_alias text,
  status text not null,
  client_request_id text,
  idempotency_key text,
  http_status_code integer,
  credits_reserved bigint not null default 0,
  credits_used bigint not null default 0,
  request_body_json jsonb not null default '{}'::jsonb,
  response_body_json jsonb not null default '{}'::jsonb,
  error_type text,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists huru_requests_project_idx on public.huru_requests(project_id);
create index if not exists huru_requests_status_idx on public.huru_requests(status);
create index if not exists huru_requests_client_request_idx on public.huru_requests(client_request_id);
create index if not exists huru_requests_idempotency_idx on public.huru_requests(idempotency_key);

create table if not exists public.huru_provider_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.huru_requests(id) on delete cascade,
  attempt_number integer not null,
  provider_internal_id text not null,
  provider_label text,
  provider_service_type text,
  provider_model text,
  provider_request_id text,
  verification_mode text,
  verified boolean,
  latency_ms integer,
  status text not null,
  raw_request_json jsonb not null default '{}'::jsonb,
  raw_response_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (request_id, attempt_number)
);

create table if not exists public.huru_request_verifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.huru_requests(id) on delete cascade,
  provider_request_id uuid references public.huru_provider_requests(id) on delete set null,
  verified boolean not null default false,
  verification_mode text,
  attestation_report_id text,
  quote_hash text,
  signing_key_fingerprint text,
  verified_at timestamptz,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.huru_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references public.huru_projects(id) on delete cascade,
  environment text not null,
  entry_type text not null,
  direction text not null,
  amount_credits bigint not null,
  balance_after_credits bigint,
  request_id uuid references public.huru_requests(id) on delete set null,
  credit_purchase_id uuid references public.huru_credit_purchases(id) on delete set null,
  notes text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.huru_usage_rollups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.huru_projects(id) on delete cascade,
  environment text not null,
  bucket_start timestamptz not null,
  granularity text not null,
  request_count bigint not null default 0,
  credits_used bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, environment, bucket_start, granularity)
);

create table if not exists public.huru_provider_routes (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  environment text not null,
  provider_internal_id text not null,
  priority integer not null default 100,
  active boolean not null default true,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alias, environment, provider_internal_id)
);

insert into public.huru_credit_packs (
  public_id,
  pack_id,
  name,
  currency,
  amount_minor,
  credits_awarded
)
values
  ('cpk_starter', 'credits_10', 'Starter Top-Up', 'NGN', 1000, 100),
  ('cpk_builder', 'credits_25', 'Builder Top-Up', 'NGN', 2500, 300),
  ('cpk_pilot', 'credits_100', 'Pilot Top-Up', 'NGN', 10000, 1400)
on conflict (pack_id) do nothing;
