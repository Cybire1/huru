import { runtimeConfig, creditPacks } from "@/lib/huru/config";
import {
  TerminalIcon,
  KeyIcon,
  ShieldTickIcon,
} from "@/components/huru-icons";
import { DocsSidebar } from "./docs-sidebar";

const BASE = runtimeConfig.appUrl;

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */

function Badge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    POST: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
    GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
    DELETE: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-500/30",
  };
  return (
    <span
      className={`inline-block rounded-[5px] border px-1.5 py-[1px] font-mono text-[11px] font-semibold leading-snug ${
        styles[method] ?? styles.GET
      }`}
    >
      {method}
    </span>
  );
}

function Anchor({ id }: { id: string }) {
  return <div id={id} className="scroll-mt-28" />;
}

function H2({
  id,
  icon,
  children,
}: {
  id: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <Anchor id={id} />
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-og-black">
        {icon}
        {children}
      </h2>
    </>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <>
      <Anchor id={id} />
      <h3 className="text-[15px] font-semibold text-og-black">{children}</h3>
    </>
  );
}

function Endpoint({
  id,
  method,
  path,
}: {
  id: string;
  method: string;
  path: string;
}) {
  return (
    <>
      <Anchor id={id} />
      <div className="flex items-center gap-2.5">
        <Badge method={method} />
        <code className="text-[15px] font-semibold text-og-black">{path}</code>
      </div>
    </>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-[1.7] text-og-text-2">{children}</p>;
}

function IC({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[4px] bg-og-surface-2 px-1 py-[1px] text-[12px] font-medium text-og-black">
      {children}
    </code>
  );
}

function Code({
  title,
  lang,
  children,
}: {
  title?: string;
  lang?: string;
  children: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-og-code-border bg-og-code-bg">
      {title && (
        <div className="flex items-center justify-between border-b border-og-code-border px-4 py-2">
          <span className="flex items-center gap-1.5 text-[12px] text-white/40">
            <TerminalIcon className="h-3 w-3" />
            {title}
          </span>
          {lang && (
            <span className="font-mono text-[10px] text-white/25">{lang}</span>
          )}
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.8] text-white/65">
        {children}
      </pre>
    </div>
  );
}

function Res({
  status,
  children,
}: {
  status: number;
  children: string;
}) {
  const color = status < 300 ? "text-og-green" : "text-og-red";
  return (
    <div className="overflow-hidden rounded-lg border border-og-border bg-og-surface-2">
      <div className="flex items-center gap-2 border-b border-og-border px-4 py-2">
        <span className={`font-mono text-[11px] font-semibold ${color}`}>{status}</span>
        <span className="text-[11px] text-og-text-3">Response</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.8] text-og-text-2">
        {children}
      </pre>
    </div>
  );
}

function Param({
  name,
  type,
  required,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-og-border py-3 last:border-0">
      <div className="flex items-center gap-2">
        <code className="text-[13px] font-semibold text-og-black">{name}</code>
        <span className="font-mono text-[11px] text-og-text-3">{type}</span>
        {required && (
          <span className="rounded bg-red-500/10 px-1 py-[0.5px] text-[9px] font-bold uppercase tracking-wider text-og-red">
            required
          </span>
        )}
      </div>
      <span className="text-[13px] leading-relaxed text-og-text-2">{children}</span>
    </div>
  );
}

function Note({
  type = "info",
  children,
}: {
  type?: "info" | "tip" | "warning";
  children: React.ReactNode;
}) {
  const s = {
    info: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    tip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  const label = { info: "Note", tip: "Tip", warning: "Important" };
  return (
    <div className={`rounded-lg border px-4 py-3 text-[13px] leading-relaxed ${s[type]}`}>
      <strong>{label[type]}:</strong> {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-og-border" />;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  return (
    <div className="flex gap-0">
      {/* ---- Sidebar ---- */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto px-5 pb-12 pt-10">
          <DocsSidebar />
        </div>
      </aside>

      {/* ---- Content ---- */}
      <article className="min-w-0 flex-1 px-6 pb-24 pt-10 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col gap-10">

            {/* Hero */}
            <header className="flex flex-col gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-og-black">
                API documentation
              </h1>
              <P>
                Huru is an OpenAI-compatible REST API powered by 0G decentralized
                compute. Every response is TEE-verified. Billing is prepaid
                credits — charge your project, or pass costs to your end-users
                with one header.
              </P>
            </header>

            <Divider />

            {/* ============ QUICKSTART ============ */}
            <section className="flex flex-col gap-4">
              <H2 id="quickstart">Quickstart</H2>
              <P>
                Grab your API key from the{" "}
                <a href="/dashboard" className="font-medium text-og-black underline underline-offset-2">
                  dashboard
                </a>{" "}
                and make your first call.
              </P>
              <Code title="Your first request" lang="curl">
{`curl ${BASE}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "huru/chat-1",
    "messages": [
      { "role": "user", "content": "Hello from Huru" }
    ]
  }'`}
              </Code>
              <Res status={200}>
{`{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "choices": [{
    "message": { "role": "assistant", "content": "Hello! ..." },
    "finish_reason": "stop"
  }],
  "huru": {
    "request_id": "req_8f3a2b1c4d5e6f",
    "credits_used": 1,
    "verified": true,
    "verification_mode": "tee",
    "provider": "0g"
  }
}`}
              </Res>
              <Note type="tip">
                Every response includes a <IC>huru</IC> object with your request ID,
                credits consumed, and TEE verification status.
              </Note>
            </section>

            <Divider />

            {/* ============ AUTH ============ */}
            <section className="flex flex-col gap-4">
              <H2 id="authentication" icon={<KeyIcon className="h-4.5 w-4.5" />}>
                Authentication
              </H2>
              <P>
                Every request requires a project API key as a Bearer token. Keys
                start with <IC>sk_test_</IC> (test) or <IC>sk_live_</IC> (live).
              </P>
              <div className="rounded-lg bg-og-surface-2 px-4 py-3 font-mono text-[13px] text-og-text-2">
                Authorization: Bearer sk_test_abc123...
              </div>
              <Note type="warning">
                Never expose your API key in client-side code. If compromised,
                rotate it from the dashboard immediately.
              </Note>
            </section>

            <Divider />

            {/* ============ MODELS ============ */}
            <section className="flex flex-col gap-4">
              <H2 id="models">Models</H2>
              <div className="overflow-hidden rounded-lg border border-og-border">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-og-border bg-og-surface-2">
                      <th className="px-4 py-2.5 text-left font-medium text-og-text-3">Model</th>
                      <th className="px-4 py-2.5 text-left font-medium text-og-text-3">Type</th>
                      <th className="hidden px-4 py-2.5 text-left font-medium text-og-text-3 sm:table-cell">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-og-border bg-og-surface">
                      <td className="px-4 py-2.5 font-mono text-[12px] font-semibold">huru/chat-1</td>
                      <td className="px-4 py-2.5 text-og-text-2">Chat</td>
                      <td className="hidden px-4 py-2.5 text-og-text-2 sm:table-cell">General-purpose chat completions</td>
                    </tr>
                    <tr className="bg-og-surface">
                      <td className="px-4 py-2.5 font-mono text-[12px] font-semibold">huru/stt-1</td>
                      <td className="px-4 py-2.5 text-og-text-2">Speech-to-text</td>
                      <td className="hidden px-4 py-2.5 text-og-text-2 sm:table-cell">Audio transcription via multipart upload</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <P>
                Huru routes to the best available 0G provider automatically with
                up to 3 failover attempts.
              </P>
            </section>

            <Divider />

            {/* ============ CREDITS ============ */}
            <section className="flex flex-col gap-4">
              <H2 id="credits">Credits</H2>
              <P>
                API requests cost credits. Credits are <strong>reserved</strong>{" "}
                before the request and <strong>settled</strong> after. Failed
                requests refund automatically. ~1 credit per 1,000 tokens (chat)
                or ~1 per 500 KB audio.
              </P>
              <div className="grid gap-3 sm:grid-cols-3">
                {creditPacks.map((pack) => (
                  <div
                    key={pack.packId}
                    className="rounded-lg border border-og-border bg-og-surface p-4"
                  >
                    <div className="text-[12px] font-medium text-og-text-3">{pack.name}</div>
                    <div className="mt-1 text-xl font-bold text-og-black">
                      {pack.creditsAwarded}
                      <span className="ml-1 text-[12px] font-normal text-og-text-3">credits</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-og-text-3">
                      {(pack.amountMinor / 100).toLocaleString()} {pack.currency}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Divider />

            {/* ============ CONSUMER BILLING ============ */}
            <section className="flex flex-col gap-4">
              <H2 id="consumer-billing">Consumer billing</H2>
              <P>
                Let your end-users pay for their own compute. Add one header and
                Huru handles identity, credit accounts, metering, and payment.
                You spend $0.
              </P>

              {/* Steps */}
              <div className="grid gap-px overflow-hidden rounded-lg border border-og-border bg-og-border sm:grid-cols-2">
                {[
                  {
                    n: "1",
                    t: "Send the header",
                    d: "Add X-Consumer-Email to any request. Optionally include X-Consumer-Name.",
                  },
                  {
                    n: "2",
                    t: "Auto-provision",
                    d: `First time? Huru creates the consumer and awards ${runtimeConfig.consumerStarterCredits} starter credits.`,
                  },
                  {
                    n: "3",
                    t: "Deduct from consumer",
                    d: "Credits reserved and settled against the consumer\u2019s balance, not yours.",
                  },
                  {
                    n: "4",
                    t: "Self-serve top-up",
                    d: "At zero credits, the 402 response includes a checkout_url pre-filled with their email.",
                  },
                ].map((s) => (
                  <div key={s.n} className="flex gap-3 bg-og-surface p-4">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-og-surface-2 text-[11px] font-bold text-og-text-3">
                      {s.n}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-og-black">{s.t}</div>
                      <div className="mt-0.5 text-[12.5px] leading-relaxed text-og-text-2">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <H3 id="consumer-billing-headers">Headers</H3>
              <div className="rounded-lg border border-og-border bg-og-surface px-4">
                <Param name="X-Consumer-Email" type="string" required>
                  End-user{"'"}s email. Must contain @. Identifies the consumer
                  within your project.
                </Param>
                <Param name="X-Consumer-Name" type="string">
                  Display name. Shown on Paystack checkout. Optional.
                </Param>
              </div>

              <Code title="Request with consumer billing" lang="curl">
{`curl ${BASE}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Consumer-Email: jane@example.com" \\
  -H "X-Consumer-Name: Jane Doe" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "huru/chat-1",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`}
              </Code>

              <P>
                When a consumer runs out of credits, you get a <IC>402</IC> with a
                checkout link:
              </P>
              <Res status={402}>
{`{
  "error": {
    "type": "billing_error",
    "code": "insufficient_credits",
    "message": "Consumer does not have enough credits.",
    "checkout_url": "https://paystack.com/pay/..."
  }
}`}
              </Res>

              <Note type="info">
                Omit the header and billing falls back to your project balance.
                100% backward compatible.
              </Note>
            </section>

            <Divider />

            {/* ============ API REFERENCE ============ */}
            <section className="flex flex-col gap-4">
              <H2 id="api-reference">API reference</H2>
              <P>All endpoints live under <IC>{BASE}</IC>.</P>
            </section>

            {/* ---- Chat ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="chat-completions" method="POST" path="/v1/chat/completions" />
              <P>Generate a chat completion. OpenAI-compatible. Supports streaming.</P>
              <div className="rounded-lg border border-og-border bg-og-surface px-4">
                <Param name="model" type="string" required>
                  Must be <IC>huru/chat-1</IC>.
                </Param>
                <Param name="messages" type="array" required>
                  Array of <IC>{"{ role, content }"}</IC> objects.
                </Param>
                <Param name="stream" type="boolean">
                  Set to <IC>true</IC> for SSE streaming. Default <IC>false</IC>.
                </Param>
              </div>
              <Code title="Example" lang="curl">
{`curl ${BASE}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "huru/chat-1",
    "messages": [
      { "role": "system", "content": "You are helpful." },
      { "role": "user", "content": "Explain TEE in one sentence." }
    ]
  }'`}
              </Code>
            </section>

            {/* ---- Transcriptions ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="transcriptions" method="POST" path="/v1/audio/transcriptions" />
              <P>Transcribe audio to text. Accepts multipart form data.</P>
              <div className="rounded-lg border border-og-border bg-og-surface px-4">
                <Param name="file" type="File" required>
                  Audio file (mp3, wav, m4a, webm).
                </Param>
                <Param name="model" type="string" required>
                  Must be <IC>huru/stt-1</IC>.
                </Param>
              </div>
              <Code title="Example" lang="curl">
{`curl ${BASE}/v1/audio/transcriptions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F file=@recording.mp3 \\
  -F model=huru/stt-1`}
              </Code>
            </section>

            {/* ---- List consumers ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="consumers-list" method="GET" path="/v1/consumers" />
              <P>List all consumers under the authenticated project with balances.</P>
              <Res status={200}>
{`{
  "object": "list",
  "data": [
    {
      "id": "con_abc123",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "credits_balance": 42,
      "created_at": "2026-04-27T15:30:00Z"
    }
  ]
}`}
              </Res>
            </section>

            {/* ---- Consumer detail ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="consumers-detail" method="GET" path="/v1/consumers/:consumerId" />
              <P>Get a single consumer{"'"}s detail and credit balance.</P>
            </section>

            {/* ---- Consumer checkout ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="consumers-checkout" method="POST" path="/v1/consumers/:consumerId/checkout" />
              <P>Create a Paystack checkout pre-filled with the consumer{"'"}s email.</P>
              <div className="rounded-lg border border-og-border bg-og-surface px-4">
                <Param name="pack_id" type="string" required>
                  One of <IC>pack_starter</IC>, <IC>pack_pro</IC>, <IC>pack_business</IC>, <IC>pack_scale</IC>.
                </Param>
              </div>
              <Code title="Example" lang="curl">
{`curl -X POST ${BASE}/v1/consumers/con_abc123/checkout \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "pack_id": "pack_starter" }'`}
              </Code>
              <Res status={201}>
{`{
  "object": "checkout.session",
  "provider": "paystack",
  "reference": "huru_topup_a1b2c3d4e5f6",
  "authorization_url": "https://paystack.com/pay/...",
  "credits_awarded": 1000,
  "status": "pending"
}`}
              </Res>
            </section>

            {/* ---- Usage ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="usage" method="GET" path="/v1/usage" />
              <P>
                Usage totals and daily breakdown. Optional <IC>from</IC> and{" "}
                <IC>to</IC> query params (ISO 8601).
              </P>
              <Code title="Example" lang="curl">
{`curl "${BASE}/v1/usage?from=2026-04-01&to=2026-04-27" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
              </Code>
            </section>

            {/* ---- Requests ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="requests" method="GET" path="/v1/requests/:id" />
              <P>Retrieve a request record with status, usage, and errors.</P>
            </section>

            {/* ---- Verification ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="verification" method="GET" path="/v1/requests/:id/verification" />
              <P>
                Get the TEE attestation report for a request. Includes
                report ID, quote hash, and verification timestamp.
              </P>
              <Res status={200}>
{`{
  "verified": true,
  "verification_mode": "tee",
  "provider": "0g",
  "report_id": "att_...",
  "quote_hash": "0xabc123...",
  "verified_at": "2026-04-27T15:30:00Z"
}`}
              </Res>
            </section>

            {/* ---- Billing checkout ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="billing-checkout" method="POST" path="/v1/billing/checkout" />
              <P>
                Start a Paystack checkout for <strong>project-level</strong>{" "}
                credits. For consumer top-ups use{" "}
                <IC>/v1/consumers/:id/checkout</IC>.
              </P>
              <div className="rounded-lg border border-og-border bg-og-surface px-4">
                <Param name="pack_id" type="string" required>
                  Credit pack ID.
                </Param>
                <Param name="success_url" type="string">
                  Redirect after payment.
                </Param>
                <Param name="cancel_url" type="string">
                  Redirect on cancel.
                </Param>
              </div>
            </section>

            {/* ---- Projects ---- */}
            <section className="flex flex-col gap-4">
              <Endpoint id="projects" method="POST" path="/v1/projects" />
              <P>Create a project and get your API key + starter credits.</P>
              <div className="rounded-lg border border-og-border bg-og-surface px-4">
                <Param name="name" type="string" required>Project display name.</Param>
                <Param name="slug" type="string">URL-safe ID. Auto-generated if omitted.</Param>
                <Param name="environment" type="string">
                  <IC>test</IC> or <IC>live</IC>. Default: <IC>test</IC>.
                </Param>
              </div>
            </section>

            <Divider />

            {/* ============ GUIDES ============ */}

            {/* ---- Idempotency ---- */}
            <section className="flex flex-col gap-4">
              <H2 id="idempotency">Idempotency</H2>
              <P>
                Pass an <IC>Idempotency-Key</IC> header to safely retry requests
                without double-charging.
              </P>
              <Code title="Idempotent request" lang="curl">
{`curl ${BASE}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Idempotency-Key: unique-key-123" \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "huru/chat-1", "messages": [...] }'`}
              </Code>
              <div className="grid gap-2 text-[13px] text-og-text-2">
                <p><strong>Completed</strong> — returns cached response with <IC>idempotent_replay: true</IC>.</p>
                <p><strong>Processing</strong> — returns <IC>409</IC>. Wait and retry.</p>
                <p><strong>Failed</strong> — allows a new attempt.</p>
              </div>
            </section>

            {/* ---- Streaming ---- */}
            <section className="flex flex-col gap-4">
              <H2 id="streaming">Streaming</H2>
              <P>
                Set <IC>stream: true</IC> on chat completions for server-sent
                events. The stream opens and closes with Huru metadata events.
              </P>
              <Code title="Stream format" lang="text">
{`data: {"huru":{"request_id":"req_abc123"}}

data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}

data: {"huru":{"request_id":"req_abc123","credits_used":1,"verified":true}}

data: [DONE]`}
              </Code>
              <Note type="info">
                Consumer billing works with streaming. Credits are reserved
                before the stream, settled on completion, released on disconnect.
              </Note>
            </section>

            {/* ---- Rate limits ---- */}
            <section className="flex flex-col gap-4">
              <H2 id="rate-limits">Rate limits</H2>
              <P>Token-bucket rate limiter per project.</P>
              <div className="overflow-hidden rounded-lg border border-og-border">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-og-border bg-og-surface-2">
                      <th className="px-4 py-2.5 text-left font-medium text-og-text-3">Window</th>
                      <th className="px-4 py-2.5 text-left font-medium text-og-text-3">Limit</th>
                      <th className="px-4 py-2.5 text-left font-medium text-og-text-3">Header</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-og-border bg-og-surface">
                      <td className="px-4 py-2.5">Per minute</td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{runtimeConfig.rateLimitPerMinute}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-og-text-3">X-RateLimit-Limit-Minute</td>
                    </tr>
                    <tr className="bg-og-surface">
                      <td className="px-4 py-2.5">Per day</td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{runtimeConfig.rateLimitPerDay}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-og-text-3">X-RateLimit-Limit-Day</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <P>
                When limited, you get <IC>429</IC> with <IC>X-RateLimit-*</IC>{" "}
                headers showing remaining quota and reset time.
              </P>
            </section>

            {/* ---- Errors ---- */}
            <section className="flex flex-col gap-4">
              <H2 id="errors">Errors</H2>
              <P>
                All errors return a consistent shape. Consumer billing errors
                include <IC>checkout_url</IC>.
              </P>
              <div className="overflow-hidden rounded-lg border border-og-border">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-og-border bg-og-surface-2">
                      <th className="px-4 py-2.5 text-left font-medium text-og-text-3">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium text-og-text-3">Code</th>
                      <th className="hidden px-4 py-2.5 text-left font-medium text-og-text-3 sm:table-cell">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { s: 400, c: "invalid_request", d: "Bad body, missing field, or unsupported model." },
                      { s: 401, c: "authentication_error", d: "Missing or invalid API key." },
                      { s: 402, c: "insufficient_credits", d: "Not enough credits. Consumer 402s include checkout_url." },
                      { s: 409, c: "request_in_progress", d: "Idempotent request already processing." },
                      { s: 429, c: "rate_limit_exceeded", d: "Rate limit hit. Check X-RateLimit-* headers." },
                      { s: 503, c: "provider_unavailable", d: "0G provider temporarily down." },
                    ].map((e) => (
                      <tr key={e.c} className="border-b border-og-border bg-og-surface last:border-0">
                        <td className="px-4 py-2.5 font-mono text-[12px] font-semibold">{e.s}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-og-text">{e.c}</td>
                        <td className="hidden px-4 py-2.5 text-og-text-2 sm:table-cell">{e.d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Code title="Error shape" lang="json">
{`{
  "error": {
    "type": "billing_error",
    "code": "insufficient_credits",
    "message": "Consumer does not have enough credits.",
    "checkout_url": "https://paystack.com/pay/..."
  }
}`}
              </Code>
            </section>

            {/* Footer */}
            <div className="border-t border-og-border pt-8 text-center text-[13px] text-og-text-3">
              Built on 0G decentralized compute. Every response is TEE-verified.
            </div>

          </div>
        </div>
      </article>
    </div>
  );
}
