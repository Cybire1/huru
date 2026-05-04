ALTER TABLE huru_consumers
  ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS auth_provider_user_id text;

CREATE INDEX IF NOT EXISTS huru_consumers_auth_provider_idx
  ON huru_consumers(auth_provider_user_id) WHERE auth_provider_user_id IS NOT NULL;
