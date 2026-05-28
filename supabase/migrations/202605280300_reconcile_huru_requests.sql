-- Reconcile schema drift: huru_requests was created from an older
-- init migration that did not include client_request_id. The current
-- 202604251430_init_huru.sql declares the column + an index, but live
-- prod never got them (the column is not referenced in code, just
-- forward-declared for future request-tracing use).
--
-- This migration brings prod in line with the init migration's intent
-- without re-running init. Safe to run on fresh installs too (idempotent).

alter table public.huru_requests
  add column if not exists client_request_id text;

create index if not exists huru_requests_client_request_idx
  on public.huru_requests(client_request_id);
