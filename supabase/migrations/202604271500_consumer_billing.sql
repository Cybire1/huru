-- Per-consumer billing: consumers + consumer credit accounts

create table if not exists public.huru_consumers (
  id              uuid primary key default gen_random_uuid(),
  public_id       text not null unique,
  project_id      uuid not null references public.huru_projects(id) on delete cascade,
  email           text not null,
  name            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists huru_consumers_project_idx on public.huru_consumers(project_id);

create table if not exists public.huru_consumer_credit_accounts (
  id               uuid primary key default gen_random_uuid(),
  consumer_id      uuid not null references public.huru_consumers(id) on delete cascade,
  project_id       uuid not null references public.huru_projects(id) on delete cascade,
  environment      text not null,
  balance_credits  bigint not null default 0,
  reserved_credits bigint not null default 0,
  updated_at       timestamptz not null default now(),
  unique (consumer_id, environment)
);

alter table public.huru_requests
  add column if not exists consumer_id uuid references public.huru_consumers(id) on delete set null;

alter table public.huru_credit_purchases
  add column if not exists consumer_id uuid references public.huru_consumers(id) on delete set null;

alter table public.huru_credit_ledger
  add column if not exists consumer_id uuid references public.huru_consumers(id) on delete set null;
