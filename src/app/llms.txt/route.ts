import { runtimeConfig } from "@/lib/huru/config";

/**
 * /llms.txt — machine-readable overview for AI coding assistants.
 *
 * Convention: https://llmstxt.org. AI tools (Claude Code, Cursor, Codex,
 * Gemini Code Assist, Windsurf, Copilot) fetch this when a user mentions
 * Huru, so they can integrate it correctly without hallucinating.
 *
 * Keep it short, concrete, and copy-paste-runnable.
 */

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
	const base = runtimeConfig.appUrl;

	const body = `# Huru

> AI gateway and decentralized storage built on 0G Compute. OpenAI-API-compatible
> for chat, audio, and image endpoints. Plus encrypted file + KV storage on
> 0G's decentralized storage network. Built for the Nigerian market — billing
> in Naira via Paystack.

## Base URL

\`${base}/v1\`

For local development: \`http://localhost:3000/v1\`

## Auth — two flows

### Server-side (Node, Python, server framework)

\`\`\`
Authorization: Bearer sk_test_...     # project API key
X-Consumer-Email: user@example.com    # the paying end-user
\`\`\`

### Browser (frontend, mobile WebView)

\`\`\`
Authorization: Bearer ct_eyJ...       # short-lived consumer token
X-Huru-Api-Key: sk_test_...           # project key (safe to expose because the
                                      # ct_ token does the auth)
\`\`\`

Never put \`sk_test_...\` in browser code without the consumer-token flow.

## Endpoints

### OpenAI-compatible

| Endpoint | Shape |
|----------|-------|
| \`POST /v1/chat/completions\` | OpenAI chat completions (streaming supported) |
| \`POST /v1/audio/transcriptions\` | OpenAI Whisper-style transcription |
| \`POST /v1/images/generations\` | OpenAI DALL-E-style image generation |

### Storage (0G-backed)

| Endpoint | Purpose |
|----------|---------|
| \`POST /v1/storage/upload\` | Upload file. Returns \`root_hash\`. |
| \`GET /v1/storage/download/{rootHash}\` | Download file bytes. |
| \`POST /v1/storage/kv/put\` | Write key-value pair. |
| \`GET /v1/storage/kv/get?key=...\` | Read key-value pair. |

### Other

| Endpoint | Purpose |
|----------|---------|
| \`GET /v1/pricing\` | Public pricing — credit packs + model tiers |
| \`GET /v1/usage\` | Auth'd usage summary for the calling project |
| \`GET /v1/requests/{id}\` | Look up a past request |

## Code — drop-in OpenAI SDK

Most users want to use the official OpenAI SDK and only change \`baseURL\`.

### Node / Next.js (server)

\`\`\`ts
import OpenAI from "openai";

const huru = new OpenAI({
  baseURL: "${base}/v1",
  apiKey: process.env.HURU_API_KEY,            // sk_test_...
  defaultHeaders: { "X-Consumer-Email": "user@example.com" },
});

const completion = await huru.chat.completions.create({
  model: "huru/chat-1",
  messages: [{ role: "user", content: "Hello!" }],
});
\`\`\`

### Browser (Next.js client component, React, vanilla JS)

\`\`\`ts
import OpenAI from "openai";

const huru = new OpenAI({
  baseURL: "${base}/v1",
  apiKey: consumerToken,                       // ct_eyJ... from /auth/consumer flow
  defaultHeaders: { "X-Huru-Api-Key": "sk_test_..." },
  dangerouslyAllowBrowser: true,
});
\`\`\`

### Python

\`\`\`python
from openai import OpenAI

huru = OpenAI(
    base_url="${base}/v1",
    api_key=os.environ["HURU_API_KEY"],
    default_headers={"X-Consumer-Email": "user@example.com"},
)
\`\`\`

### Storage upload (Node)

\`\`\`ts
const form = new FormData();
form.append("file", new Blob([fileBytes]), "doc.pdf");
const res = await fetch("${base}/v1/storage/upload", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sk_test_...",
    "X-Consumer-Email": "user@example.com",
    "X-Huru-Encryption": "managed",            // default — Huru envelope-encrypts
  },
  body: form,
});
const { root_hash } = await res.json();
\`\`\`

## Model tiers — credit cost per 1K tokens

| Tier | Multiplier | Example aliases |
|------|-----------|-----------------|
| economy | 1x | \`huru/chat-1\`, deepseek-v3, llama-3.1-8b |
| standard | 2.5x | \`huru/chat-pro\`, llama-3.3-70b, qwen-2.5-72b |
| premium | 6x | \`huru/chat-max\`, llama-3.1-405b, gpt-oss-120b |

Unknown models default to \`standard\` tier.

## Encryption modes for storage

Header \`X-Huru-Encryption\` on upload:

- \`managed\` (default) — Huru envelope-encrypts with a per-consumer key. Only that consumer can decrypt via Huru.
- \`none\` — plaintext stored on 0G. Anyone with the rootHash can read. Use for public assets.
- \`client\` — bytes pass through Huru as-is. Consumer manages their own encryption.

## Common pitfalls

1. **CORS** — set \`HURU_CORS_ALLOWED_ORIGINS\` env var with your app's origin (comma-separated). Otherwise browsers will block.
2. **Browser API keys** — never put \`sk_...\` in browser JS. Use the consumer-token flow with \`ct_...\` tokens.
3. **Insufficient credits** — 402 response includes a \`checkout_url\`. Direct the user there to top up via Paystack.
4. **Idempotency** — pass \`Idempotency-Key: <uuid>\` header on POST requests to safely retry.
5. **Storage downloads with wrong consumer** — managed-encrypted files only decrypt for the consumer who uploaded. Cross-consumer reads → 403.

## Pricing (Naira)

Credit packs are denominated in NGN. See \`${base}/v1/pricing\` for current numbers.

1 credit ≈ 1K tokens (economy tier) ≈ ~₦2.

## Reference

- Docs: \`${base}/docs\`
- AI assistant setup: \`${base}/docs/ai-assistants\`
- Pricing: \`${base}/v1/pricing\`
- Health: \`${base}/api/health\`
`;

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=3600, s-maxage=86400",
		},
	});
}
