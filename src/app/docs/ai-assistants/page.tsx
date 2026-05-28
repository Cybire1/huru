import Link from "next/link";
import { runtimeConfig } from "@/lib/huru/config";
import { CopyPromptButton } from "./copy-prompt-button";

const BASE = runtimeConfig.appUrl;

const SYSTEM_PROMPT = `You are helping me integrate Huru, an OpenAI-API-compatible AI gateway with built-in 0G decentralized storage.

API:
- baseURL: ${BASE}/v1  (or http://localhost:3000/v1 in dev)
- OpenAI-compatible: /chat/completions, /audio/transcriptions, /images/generations
- Storage (0G-backed): /storage/upload, /storage/download/{rootHash}, /storage/kv/{put,get}

Auth — two flows:
- Server (Node, Python, Express, etc.):  Authorization: Bearer sk_... + X-Consumer-Email: user@example.com
- Browser (Next.js client, React, mobile webview):  Authorization: Bearer ct_... + X-Huru-Api-Key: sk_...

Rules:
- Never put sk_... keys in browser code; always use the consumer-token flow.
- Use the official OpenAI SDK — just change baseURL. No custom client needed.
- For storage, default header X-Huru-Encryption: managed (Huru envelope-encrypts per consumer).
- 1 credit ~= 1K chat tokens on the economy tier. See ${BASE}/v1/pricing for the model tier table.
- 402 responses include a checkout_url for Paystack top-up. Direct the user there.
- For the browser flow, set HURU_CORS_ALLOWED_ORIGINS env var on the Huru server to the calling origin.

When I ask you to add Huru to my app, follow these patterns. Do not invent endpoints or headers.`;

const TOOLS: Array<{
	name: string;
	tagline: string;
	steps: Array<{ label: string; detail?: string }>;
}> = [
	{
		name: "Claude Code",
		tagline: "Anthropic's CLI — fastest path for terminal-first devs.",
		steps: [
			{ label: "Run `claude` in your project directory" },
			{ label: "Paste the system prompt above into the first message" },
			{ label: 'Say: "add Huru to this Next.js app, server-side"' },
		],
	},
	{
		name: "Codex CLI",
		tagline: "OpenAI's coding CLI — same paste-and-go flow.",
		steps: [
			{ label: "Run `codex` in your project" },
			{ label: "Paste the system prompt as your first input" },
			{ label: 'Say: "integrate Huru chat completions"' },
		],
	},
	{
		name: "Cursor",
		tagline: "AI IDE with persistent project rules.",
		steps: [
			{ label: "Create `.cursor/rules/huru.mdc`" },
			{ label: "Paste the system prompt as the rule body" },
			{ label: 'Open chat and ask: "set up Huru in this project"' },
		],
	},
	{
		name: "Gemini Code Assist",
		tagline: "Google's AI assistant — works inside VS Code and JetBrains.",
		steps: [
			{ label: "Open the Gemini Code Assist chat panel" },
			{ label: "Paste the system prompt as the first message" },
			{ label: 'Follow up: "integrate Huru into this app"' },
		],
	},
	{
		name: "Windsurf",
		tagline: "Cascade-based AI IDE.",
		steps: [
			{ label: "Open Cascade and paste the system prompt" },
			{ label: "Cascade will read your project tree" },
			{ label: 'Say: "wire Huru into the API client"' },
		],
	},
	{
		name: "GitHub Copilot",
		tagline: "Chat with persistent repo instructions.",
		steps: [
			{ label: "Create `.github/copilot-instructions.md`" },
			{ label: "Paste the system prompt as the file body" },
			{ label: 'In Copilot Chat: "use Huru for the chat completions endpoint"' },
		],
	},
];

const STACKS: Array<{ name: string; code: string }> = [
	{
		name: "Next.js (server route)",
		code: `import OpenAI from "openai";

const huru = new OpenAI({
  baseURL: "${BASE}/v1",
  apiKey: process.env.HURU_API_KEY!,
  defaultHeaders: { "X-Consumer-Email": "user@example.com" },
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const completion = await huru.chat.completions.create({
    model: "huru/chat-1",
    messages,
  });
  return Response.json(completion);
}`,
	},
	{
		name: "Browser (React client component)",
		code: `"use client";
import OpenAI from "openai";

const huru = new OpenAI({
  baseURL: "${BASE}/v1",
  apiKey: consumerToken,                       // ct_eyJ... from /auth/consumer
  defaultHeaders: { "X-Huru-Api-Key": "sk_test_..." },
  dangerouslyAllowBrowser: true,
});

const reply = await huru.chat.completions.create({
  model: "huru/chat-1",
  messages: [{ role: "user", content: input }],
});`,
	},
	{
		name: "Python (FastAPI, server)",
		code: `from openai import OpenAI
from fastapi import FastAPI

app = FastAPI()
huru = OpenAI(
    base_url="${BASE}/v1",
    api_key=os.environ["HURU_API_KEY"],
    default_headers={"X-Consumer-Email": "user@example.com"},
)

@app.post("/chat")
def chat(body: dict):
    return huru.chat.completions.create(
        model="huru/chat-1",
        messages=body["messages"],
    )`,
	},
	{
		name: "Storage upload (managed encryption)",
		code: `const form = new FormData();
form.append("file", new Blob([fileBytes]), "doc.pdf");

const res = await fetch("${BASE}/v1/storage/upload", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sk_test_...",
    "X-Consumer-Email": "user@example.com",
    "X-Huru-Encryption": "managed",            // default — per-consumer envelope
  },
  body: form,
});
const { root_hash } = await res.json();

// Later, download:
const file = await fetch(\`${BASE}/v1/storage/download/\${root_hash}\`, {
  headers: {
    "Authorization": "Bearer sk_test_...",
    "X-Consumer-Email": "user@example.com",
  },
}).then(r => r.blob());`,
	},
];

export const metadata = {
	title: "Build with AI assistants — Huru",
	description:
		"Drop-in integration for Claude Code, Cursor, Codex, Gemini Code Assist, Windsurf, and GitHub Copilot.",
};

export default function AIAssistantsPage() {
	return (
		<main className="mx-auto max-w-4xl px-6 py-16">
			<div className="mb-12">
				<Link
					href="/docs"
					className="text-[13px] text-og-text-3 hover:text-og-text-2"
				>
					← Docs
				</Link>
				<h1 className="mt-4 text-3xl font-semibold tracking-tight text-og-black">
					Build Huru with AI assistants
				</h1>
				<p className="mt-3 text-[15px] leading-[1.7] text-og-text-2">
					Huru is OpenAI-API-compatible — every AI coding assistant already
					knows how to call it. Paste the prompt below and your tool of choice
					will integrate Huru correctly the first time.
				</p>
				<p className="mt-2 text-[13px] text-og-text-3">
					Works with Claude Code, Codex, Cursor, Gemini Code Assist, Windsurf,
					GitHub Copilot, Aider, Continue.dev, and any OpenAI-compatible client.
				</p>
			</div>

			{/* ── Paste-ready prompt ── */}
			<section className="mb-16">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-lg font-semibold tracking-tight text-og-black">
						Paste-ready system prompt
					</h2>
					<CopyPromptButton prompt={SYSTEM_PROMPT} />
				</div>
				<div className="overflow-hidden rounded-lg border border-og-code-border bg-og-code-bg">
					<pre className="overflow-x-auto p-4 font-mono text-[12px] leading-[1.7] text-white/70 whitespace-pre-wrap">
						{SYSTEM_PROMPT}
					</pre>
				</div>
				<p className="mt-3 text-[13px] text-og-text-3">
					Tools that auto-fetch documentation can also pull{" "}
					<Link
						href="/llms.txt"
						className="underline decoration-og-text-3 underline-offset-2 hover:text-og-text-2"
					>
						/llms.txt
					</Link>{" "}
					— same content, served as plain markdown.
				</p>
			</section>

			{/* ── Per-tool quickstarts ── */}
			<section className="mb-16">
				<h2 className="mb-4 text-lg font-semibold tracking-tight text-og-black">
					Tool-specific setup
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{TOOLS.map((tool) => (
						<div
							key={tool.name}
							className="rounded-lg border border-og-border bg-og-surface p-5"
						>
							<h3 className="text-[15px] font-semibold text-og-black">
								{tool.name}
							</h3>
							<p className="mt-1 text-[12.5px] text-og-text-3">
								{tool.tagline}
							</p>
							<ol className="mt-3 space-y-1.5 text-[13px] text-og-text-2">
								{tool.steps.map((step, i) => (
									<li key={i} className="flex gap-2">
										<span className="text-og-text-3">{i + 1}.</span>
										<span>{step.label}</span>
									</li>
								))}
							</ol>
						</div>
					))}
				</div>
			</section>

			{/* ── Stack snippets ── */}
			<section className="mb-16">
				<h2 className="mb-4 text-lg font-semibold tracking-tight text-og-black">
					What your AI should generate
				</h2>
				<p className="mb-6 text-[14px] leading-[1.7] text-og-text-2">
					When you ask your assistant to integrate Huru, expect output that
					looks like these. If you get something else (a custom HTTP client,
					hand-rolled headers, a different endpoint shape), interrupt and
					redirect — your AI hallucinated. The OpenAI SDK + base-URL swap is
					always the right pattern.
				</p>
				<div className="space-y-6">
					{STACKS.map((stack) => (
						<div key={stack.name}>
							<h3 className="mb-2 text-[14px] font-semibold text-og-black">
								{stack.name}
							</h3>
							<div className="overflow-hidden rounded-lg border border-og-code-border bg-og-code-bg">
								<pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.8] text-white/65">
									{stack.code}
								</pre>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* ── Common follow-up requests ── */}
			<section className="mb-16">
				<h2 className="mb-4 text-lg font-semibold tracking-tight text-og-black">
					Common requests, pre-answered
				</h2>
				<div className="space-y-4 text-[13.5px] leading-[1.7] text-og-text-2">
					<p>
						<strong className="text-og-black">
							&ldquo;I want to use Huru with streaming.&rdquo;
						</strong>{" "}
						Pass <code className="rounded bg-og-surface-2 px-1 text-[12px]">stream:
						true</code> to{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">
							huru.chat.completions.create
						</code>
						. SSE shape matches OpenAI exactly. The OpenAI SDK returns an async
						iterable.
					</p>
					<p>
						<strong className="text-og-black">
							&ldquo;Add Huru to my mobile app.&rdquo;
						</strong>{" "}
						Use the browser/consumer-token flow. The{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">ct_</code>{" "}
						token is safe to ship; the{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">sk_</code>{" "}
						project key sits on your server.
					</p>
					<p>
						<strong className="text-og-black">
							&ldquo;Store user uploads on 0G.&rdquo;
						</strong>{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">
							POST /v1/storage/upload
						</code>{" "}
						with multipart form-data. Default{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">
							X-Huru-Encryption: managed
						</code>{" "}
						gives per-consumer envelope encryption. Save the{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">
							root_hash
						</code>{" "}
						in your DB.
					</p>
					<p>
						<strong className="text-og-black">
							&ldquo;Track per-user usage.&rdquo;
						</strong>{" "}
						Always send{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">
							X-Consumer-Email
						</code>{" "}
						(server flow) or use a{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">
							ct_
						</code>{" "}
						token (browser flow) issued to that user. Huru meters credits per
						consumer.
					</p>
					<p>
						<strong className="text-og-black">
							&ldquo;Handle insufficient credits.&rdquo;
						</strong>{" "}
						402 responses include{" "}
						<code className="rounded bg-og-surface-2 px-1 text-[12px]">
							checkout_url
						</code>
						. Redirect the user to Paystack to top up.
					</p>
				</div>
			</section>

			<footer className="border-t border-og-border pt-8 text-[13px] text-og-text-3">
				<p>
					More:{" "}
					<Link href="/docs" className="underline underline-offset-2">
						full docs
					</Link>{" "}
					·{" "}
					<Link href="/v1/pricing" className="underline underline-offset-2">
						pricing
					</Link>{" "}
					·{" "}
					<Link href="/llms.txt" className="underline underline-offset-2">
						llms.txt
					</Link>
				</p>
			</footer>
		</main>
	);
}
