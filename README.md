# Huru

Huru is an adoption layer for 0G that gives developers an OpenAI-style API for
private, TEE-backed compute without exposing wallet, token, and provider-funding
complexity.

This repository currently contains:
- a Next.js landing page, docs, and dashboard shell
- bootstrap API routes for the Huru MVP
- a Supabase-backed project/credits/request store with bootstrap fallback
- a managed 0G runtime path for chat and transcription when envs are configured
- mock Paystack fallback paths so the product can still be exercised before every
  live integration is wired
- a local no-Supabase demo mode for validating the developer API flow before auth
  is configured

## Local Setup

1. Copy envs:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm run dev
```

4. Open:

```bash
http://localhost:3000
```

## Bootstrap API Key

Local development uses a bootstrap test key from `.env.local`:

```bash
HURU_BOOTSTRAP_API_KEY=sk_test_huru_local_dev
```

If Supabase public envs are not configured, `/dashboard` falls back to local demo
mode. That mode uses the bootstrap API key and lets you run a test
`/v1/chat/completions` request from the UI.

## Key Endpoints

- `GET /api/health`
- `POST /v1/chat/completions`
- `POST /v1/audio/transcriptions`
- `GET /v1/projects`
- `POST /v1/projects`
- `GET /v1/usage`
- `GET /v1/requests/:id`
- `GET /v1/requests/:id/verification`
- `POST /v1/billing/checkout`
- `POST /webhooks/paystack`

## Current State

The app is intentionally staged:
- request/auth/credits/logging paths are real and can persist to Supabase
- the dashboard supports real Supabase sign-in when public Supabase envs are set
- the dashboard supports a local demo mode when Supabase is not set yet
- runtime execution can run in mock mode or route through managed 0G execution
- Paystack top-up can fall back to mock mode when secrets are missing
- richer billing controls, production compliance, and provider reliability scoring
  are the next implementation step

## Paystack Webhooks

Huru verifies `x-paystack-signature` using `PAYSTACK_SECRET_KEY` by default.
`PAYSTACK_WEBHOOK_SECRET` is optional and only exists as an override if you
want a separate signing env in the future.

## Next Build Steps

1. Apply the Supabase migration and verify the bootstrap project is seeded
2. Configure Supabase auth redirect URLs for the local and deployed app domains
3. Add richer billing history and purchase-management endpoints
4. Add provider reliability scoring and clearer verification evidence
5. Expand the 0G routing layer beyond the bootstrap project
