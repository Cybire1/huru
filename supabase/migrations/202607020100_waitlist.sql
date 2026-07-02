-- Waitlist signups from the marketing site (chumai.xyz).
-- Writes go through the huru /api/waitlist route using the service role,
-- so RLS is enabled with no public policies (service role bypasses RLS).

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'website',
  created_at timestamptz not null default now()
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;
