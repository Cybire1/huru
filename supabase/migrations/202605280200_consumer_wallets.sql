-- Per-consumer HD-derived storage wallets.
-- Each consumer gets a deterministic sub-wallet for 0G storage operations
-- (file upload/download, KV writes). Compute still uses the master wallet
-- because of the 3-0G ledger account minimum per wallet.

create sequence if not exists public.huru_consumer_wallet_index_seq;

create table if not exists public.huru_consumer_wallets (
  id                    uuid primary key default gen_random_uuid(),
  consumer_id           uuid not null unique references public.huru_consumers(id) on delete cascade,
  derivation_index      bigint not null unique default nextval('public.huru_consumer_wallet_index_seq'),
  address               text not null unique,
  network               text not null default 'testnet',
  last_funded_at        timestamptz,
  lifetime_gas_funded   numeric not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists huru_consumer_wallets_address_idx
  on public.huru_consumer_wallets(address);
