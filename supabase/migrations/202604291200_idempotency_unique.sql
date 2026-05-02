-- Add unique partial constraint on (project_id, idempotency_key) for non-null keys.
-- Prevents concurrent requests with the same idempotency key from both executing.
-- Drop the old non-unique index first.
drop index if exists public.huru_requests_idempotency_idx;

create unique index if not exists huru_requests_idempotency_uniq
  on public.huru_requests(project_id, idempotency_key)
  where idempotency_key is not null;
