"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);
import { getBrowserSupabase } from "@/lib/huru/browser-supabase";
import {
  ArrowUpRightIcon,
  ChartIcon,
  DocumentIcon,
  HuruLogo,
  KeyIcon,
  ShieldTickIcon,
  SparkIcon,
  TerminalIcon,
} from "@/components/huru-icons";

/* ────────────────────────────────────────── constants ── */

const creditPacks = [
  { packId: "credits_10", name: "Starter", amountMinor: 1000, currency: "NGN", creditsAwarded: 100 },
  { packId: "credits_25", name: "Builder", amountMinor: 2500, currency: "NGN", creditsAwarded: 300 },
  { packId: "credits_100", name: "Pilot", amountMinor: 10000, currency: "NGN", creditsAwarded: 1400 },
] as const;

const localDemoApiKey = "sk_test_huru_local_dev";

/* ────────────────────────────────────────── types ── */

type DashboardSection = "overview" | "api-keys" | "usage" | "billing" | "playground";

type DashboardOverview = {
  user: { id: string; email: string; name: string | null };
  projects: Array<{
    id: string; name: string; environment: "test" | "live";
    apiKey: string; apiKeyPrefix: string; creditsBalance: number; createdAt: string;
  }>;
};

type DashboardProjectDetail = {
  user: { id: string; email: string; name: string | null };
  project: {
    id: string; name: string; environment: "test" | "live";
    apiKey: string; apiKeyPrefix: string; creditsBalance: number; createdAt: string;
  };
  usage: {
    requests: number; creditsUsed: number; currentBalance: number;
    breakdown: Array<{ date: string; requests: number; creditsUsed: number }>;
  };
  requests: Array<{
    id: string; endpoint: string; method: string; model: string; status: string;
    creditsUsed: number; startedAt: string; completedAt: string | null;
    errorMessage: string | null; verified: boolean; verificationMode: string;
    attestationReportId: string | null; quoteHash: string | null;
    requestPreview: string; responsePreview: string;
  }>;
  purchases: Array<{
    id: string; reference: string; name: string; amountMinor: number;
    currency: string; creditsAwarded: number; status: string;
    providerStatus: string | null; providerTransactionId: string | null;
    verifiedAt: string | null; creditedAt: string | null; paidAt: string | null;
  }>;
  key: { id: string; prefix: string } | null;
};

/* ────────────────────────────────────────── helpers ── */

function getRedirectUrl() {
  if (typeof window === "undefined") return "http://localhost:3000/auth/callback";
  return `${window.location.origin}/auth/callback`;
}

function getApiErrorMessage(payload: Record<string, unknown> | null) {
  const error = payload?.error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

const sidebarNav: { key: DashboardSection; label: string; icon: typeof SparkIcon }[] = [
  { key: "overview", label: "Overview", icon: SparkIcon },
  { key: "api-keys", label: "API Keys", icon: KeyIcon },
  { key: "usage", label: "Usage", icon: ChartIcon },
  { key: "billing", label: "Billing", icon: ArrowUpRightIcon },
  { key: "playground", label: "Playground", icon: TerminalIcon },
];

function EmptyState({ icon: Icon, title, description, cta }: {
  icon: typeof SparkIcon;
  title: string;
  description: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-og-border bg-og-surface-2 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-og-surface-2">
        <Icon className="size-5 text-og-text-3" />
      </div>
      <p className="mt-4 text-sm font-medium text-og-black">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-og-text-3">{description}</p>
      {cta && (
        <button type="button" onClick={cta.onClick}
          className="mt-4 rounded-lg bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#222] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200">
          {cta.label}
        </button>
      )}
    </div>
  );
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-og-border bg-og-surface-2 px-6 py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="size-6 animate-spin rounded-full border-2 border-og-border border-t-og-black" />
        <p className="text-sm text-og-text-3">Loading...</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── component ── */

export function HuruAuthPanel() {
  const panelRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => {
    try { return getBrowserSupabase(); }
    catch { /* supabase not configured */ return null; }
  }, []);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<DashboardProjectDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [visibleApiKey, setVisibleApiKey] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [demoStatus, setDemoStatus] = useState("");
  const [demoError, setDemoError] = useState("");
  const [demoResponse, setDemoResponse] = useState<Record<string, unknown> | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  /* ── Playground state ── */
  const [pgMessages, setPgMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [pgInput, setPgInput] = useState("");
  const [pgLoading, setPgLoading] = useState(false);
  const [pgError, setPgError] = useState("");
  const [pgMeta, setPgMeta] = useState<{ requestId: string; creditsUsed: number; verified: boolean; verificationMode: string; provider: string; latencyMs: number } | null>(null);
  const [pgRawResponse, setPgRawResponse] = useState<Record<string, unknown> | null>(null);
  const [pgShowRaw, setPgShowRaw] = useState(false);
  const [pgShowCode, setPgShowCode] = useState(false);
  const [pgCodeTab, setPgCodeTab] = useState<"curl" | "fetch" | "python">("curl");
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const [pgCopyLabel, setPgCopyLabel] = useState<string | null>(null);
  const pgMessagesRef = useRef<HTMLDivElement>(null);

  const flashCopy = useCallback((text: string, setter: (v: string | null) => void) => {
    void navigator.clipboard.writeText(text);
    setter("Copied!");
    setTimeout(() => setter(null), 2000);
  }, []);

  /* ── GSAP: animate cards on section / detail change ── */
  useGSAP(() => {
    if (!contentRef.current) return;
    const cards = contentRef.current.querySelectorAll("[data-huru-card]");
    if (!cards.length) return;
    gsap.fromTo(cards, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.06 });
    // Add hover elevation classes
    cards.forEach((card) => {
      (card as HTMLElement).classList.add("transition-all", "duration-300");
      (card as HTMLElement).style.setProperty("--tw-translate-y", "0");
    });
  }, { scope: contentRef, dependencies: [activeSection, projectDetail, overview, sessionReady, demoResponse, pgMessages] });

  /* ── GSAP: KPI countup animation ── */
  useGSAP(() => {
    if (!contentRef.current || activeSection !== "overview" || !projectDetail) return;
    const kpiNums = contentRef.current.querySelectorAll<HTMLElement>("[data-kpi-num]");
    kpiNums.forEach((el) => {
      const target = Number(el.dataset.kpiTarget);
      if (Number.isNaN(target) || target === 0) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => { el.textContent = String(Math.round(obj.val)); },
      });
    });
  }, { scope: contentRef, dependencies: [activeSection, projectDetail] });

  /* ── GSAP: playground message slide-in ── */
  useGSAP(() => {
    if (!contentRef.current || activeSection !== "playground") return;
    const msgs = contentRef.current.querySelectorAll<HTMLElement>("[data-pg-msg]");
    msgs.forEach((msg) => {
      const isUser = msg.dataset.pgRole === "user";
      gsap.fromTo(msg, { x: isUser ? 24 : -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
    });
  }, { scope: contentRef, dependencies: [pgMessages] });

  /* ── Auto-scroll playground to latest message ── */
  useEffect(() => {
    if (pgMessagesRef.current && pgMessages.length > 0) {
      pgMessagesRef.current.scrollTo({ top: pgMessagesRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [pgMessages, pgLoading]);

  /* ── GSAP: animate project modal ── */
  useGSAP(() => {
    if (!showProjectModal) return;
    const modal = document.querySelector("[data-project-modal]");
    if (!modal) return;
    gsap.fromTo(modal, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power3.out" });
  }, { dependencies: [showProjectModal] });

  /* ── Data: session + overview ── */
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session?.access_token) {
        const res = await fetch("/api/dashboard/me", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        if (res.ok) {
          const p = (await res.json()) as DashboardOverview;
          setOverview(p);
          setSelectedProjectId((c) => c && p.projects.some((x) => x.id === c) ? c : p.projects[0]?.id ?? null);
        }
      }
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) {
        setOverview(null); setSelectedProjectId(null); setProjectDetail(null);
        setDetailStatus(""); setVisibleApiKey(null); setSelectedRequestId(null);
        setSessionReady(true); return;
      }
      const res = await fetch("/api/dashboard/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) {
        const p = (await res.json()) as DashboardOverview;
        setOverview(p);
        setSelectedProjectId((c) => c && p.projects.some((x) => x.id === c) ? c : p.projects[0]?.id ?? null);
      } else { setOverview(null); setVisibleApiKey(null); }
      setSessionReady(true);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  /* ── Data: project detail ── */
  useEffect(() => {
    if (!supabase || !overview || !selectedProjectId) return;
    let mounted = true;
    const load = async () => {
      setDetailLoading(true); setDetailStatus("");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || !mounted) { setDetailLoading(false); return; }
      const res = await fetch(`/api/dashboard/projects/${selectedProjectId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!mounted) return;
      if (!res.ok) { setProjectDetail(null); setDetailStatus("Could not load project."); setDetailLoading(false); return; }
      setProjectDetail((await res.json()) as DashboardProjectDetail);
      setDetailStatus(""); setDetailLoading(false); setSelectedRequestId(null);
    };
    void load();
    return () => { mounted = false; };
  }, [supabase, overview, selectedProjectId]);

  /* ── Actions ── */
  const runDemoRequest = async () => {
    setDemoRunning(true);
    setDemoStatus("Running a local request through /v1/chat/completions...");
    setDemoError(""); setDemoResponse(null);
    try {
      const response = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${localDemoApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "huru/chat-1",
          messages: [{ role: "user", content: "Explain Huru in one sentence for a developer evaluating private 0G compute." }],
        }),
      });
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) { setDemoError(getApiErrorMessage(payload) || "The local demo request failed."); setDemoStatus(""); return; }
      setDemoResponse(payload);
      setDemoStatus("Demo request completed through the same endpoint developers will call.");
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : "The local demo request failed.");
      setDemoStatus("");
    } finally { setDemoRunning(false); }
  };

  const onMagicLink = async () => {
    if (!supabase) return;
    setStatus("");
    const addr = email.trim();
    if (!addr) { setStatus("Enter an email address."); return; }
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: getRedirectUrl() } });
    setStatus(error ? error.message : "Magic link sent — check your email.");
  };

  const onGoogle = async () => {
    if (!supabase) return;
    setStatus("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: getRedirectUrl() } });
    if (error) setStatus(error.message);
  };

  const onSignOut = async () => {
    if (!supabase) return;
    setStatus(""); setDetailStatus(""); setSelectedProjectId(null);
    setProjectDetail(null); setVisibleApiKey(null); setSelectedRequestId(null);
    await supabase.auth.signOut(); setOverview(null);
  };

  const refresh = async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/dashboard/me", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const p = (await res.json()) as DashboardOverview;
      setOverview(p);
      setSelectedProjectId((c) => c && p.projects.some((x) => x.id === c) ? c : p.projects[0]?.id ?? null);
    }
  };

  const createProject = async (name: string) => {
    if (!supabase || !name.trim()) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setStatus("Sign in first."); return; }
    startTransition(async () => {
      const res = await fetch("/api/dashboard/projects", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setStatus(p?.error?.message || "Could not create project."); return;
      }
      const created = (await res.json()) as { id: string; api_key: string };
      setSelectedProjectId(created.id); setVisibleApiKey(created.api_key);
      await refresh(); setStatus("Project created.");
      setShowProjectModal(false); setNewProjectName("");
    });
  };

  const rotateKey = async () => {
    if (!supabase || !selectedProjectId) return;
    setDetailStatus("Rotating key...");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setDetailStatus("Sign in first."); return; }
    const res = await fetch(`/api/dashboard/projects/${selectedProjectId}/rotate-key`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const p = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setDetailStatus(p?.error?.message || "Could not rotate key."); return;
    }
    const rotated = (await res.json()) as { apiKey: string; apiKeyPrefix: string; keyId: string; project: DashboardOverview["projects"][number] };
    setDetailStatus(`New prefix: ${rotated.apiKeyPrefix}...`);
    setVisibleApiKey(rotated.apiKey); setSelectedRequestId(null);
    setProjectDetail((c) => c ? { ...c, project: { ...c.project, apiKey: rotated.project.apiKey, apiKeyPrefix: rotated.project.apiKeyPrefix, creditsBalance: rotated.project.creditsBalance }, key: { id: rotated.keyId, prefix: rotated.project.apiKeyPrefix } } : c);
    await refresh(); setStatus("");
  };

  const topUp = async (packId: string) => {
    if (!supabase || !selectedProjectId) return;
    setDetailStatus("Creating checkout...");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setDetailStatus("Sign in first."); return; }
    const res = await fetch(`/api/dashboard/projects/${selectedProjectId}/top-up`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ packId, successUrl: `${window.location.origin}/dashboard?topup=success`, cancelUrl: `${window.location.origin}/dashboard?topup=cancel` }),
    });
    if (!res.ok) {
      const p = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setDetailStatus(p?.error?.message || "Could not start top-up."); return;
    }
    const checkout = (await res.json()) as { authorization_url: string };
    window.location.assign(checkout.authorization_url);
  };

  /* ── Playground: send message ── */
  const sendPlaygroundMessage = async () => {
    if (!supabase || !projectDetail || !selectedProjectId || pgLoading || !pgInput.trim()) return;
    const userMsg = { role: "user" as const, content: pgInput.trim() };
    const updated = [...pgMessages, userMsg];
    setPgMessages(updated);
    setPgInput("");
    setPgLoading(true);
    setPgError("");
    const t0 = Date.now();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setPgError("Session expired. Please sign in again."); return; }
      const res = await fetch(`/api/dashboard/projects/${selectedProjectId}/playground`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "huru/chat-1", messages: updated }),
      });
      const latencyMs = Date.now() - t0;
      const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        setPgError(getApiErrorMessage(payload) || `Request failed (${res.status})`);
        return;
      }
      setPgRawResponse(payload);
      const choices = payload?.choices as Array<{ message?: { content?: string } }> | undefined;
      const content = choices?.[0]?.message?.content ?? "";
      setPgMessages((prev) => [...prev, { role: "assistant", content }]);
      const huru = payload?.huru as { request_id?: string; credits_used?: number; verified?: boolean; verification_mode?: string; provider?: string } | undefined;
      setPgMeta({
        requestId: huru?.request_id ?? "",
        creditsUsed: huru?.credits_used ?? 0,
        verified: huru?.verified ?? false,
        verificationMode: huru?.verification_mode ?? "",
        provider: huru?.provider ?? "",
        latencyMs,
      });
    } catch (err) {
      setPgError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPgLoading(false);
    }
  };

  /* ── Playground: code generation ── */
  const generateCurl = (apiKey: string, messages: Array<{ role: string; content: string }>) => {
    const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
    return `curl -X POST ${origin}/v1/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ model: "huru/chat-1", messages }, null, 2)}'`;
  };

  const generateFetch = (apiKey: string, messages: Array<{ role: string; content: string }>) => {
    const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
    return `const response = await fetch("${origin}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "huru/chat-1",
    messages: ${JSON.stringify(messages, null, 4)},
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);`;
  };

  const generatePython = (apiKey: string, messages: Array<{ role: string; content: string }>) => {
    const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
    return `import requests

response = requests.post(
    "${origin}/v1/chat/completions",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json",
    },
    json={
        "model": "huru/chat-1",
        "messages": ${JSON.stringify(messages, null, 8)},
    },
)

data = response.json()
print(data["choices"][0]["message"]["content"])`;
  };

  /* ────── No Supabase: local demo mode ────── */
  if (!supabase) {
    return (
      <main ref={panelRef} className="min-h-screen bg-og-bg">
        <header className="border-b border-og-border bg-og-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
            <Link href="/" className="flex items-center gap-2">
              <HuruLogo className="size-6 text-og-black" />
              <span className="text-sm font-semibold text-og-black">Huru</span>
            </Link>
            <Link href="/docs" className="inline-flex items-center gap-1.5 rounded-lg border border-og-border px-3 py-1.5 text-xs font-medium text-og-text-2 transition hover:bg-og-surface-2">
              <DocumentIcon className="size-3.5" />
              Docs
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-10 md:px-8">
          <section ref={contentRef} className="grid gap-4 sm:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-4 shadow-sm sm:rounded-xl sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-og-border bg-og-surface-2 text-og-black">
                  <TerminalIcon className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-og-text-3">Local demo mode</p>
                  <h2 className="text-xl font-semibold text-og-black">Use Huru before auth is configured</h2>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-og-text-2">
                Supabase public envs are missing, so sign-in is disabled. The MVP can still prove the
                developer flow with the bootstrap test key, credits, request logging, and the same
                OpenAI-style route your customers will integrate.
              </p>
              <div className="mt-5 rounded-lg border border-og-border bg-og-surface-2 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-og-text-3">Bootstrap API key</p>
                <code className="mt-2 block overflow-x-auto rounded-lg bg-og-surface px-3 py-2 font-mono text-xs text-og-black">
                  {localDemoApiKey}
                </code>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={runDemoRequest} disabled={demoRunning}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0a0a0a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#222] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60">
                  {demoRunning ? "Running..." : "Run demo request"}
                  <ArrowUpRightIcon className="size-4" />
                </button>
                <Link href="/docs"
                  className="inline-flex items-center gap-2 rounded-lg border border-og-border bg-og-surface-2 px-4 py-2 text-sm font-medium text-og-text-2 transition hover:bg-og-surface-3">
                  <DocumentIcon className="size-4" />
                  Read docs
                </Link>
              </div>
              {demoStatus && <p className="mt-4 text-sm text-og-green">{demoStatus}</p>}
              {demoError && <p className="mt-4 text-sm text-og-red">{demoError}</p>}
            </div>

            <div data-huru-card className="rounded-lg border border-og-border bg-[#1a1a2e] p-4 shadow-sm sm:rounded-xl sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Developer proof</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">One API call, no wallet setup</h3>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">POST</span>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-[#0f0f1e] p-3 font-mono text-[11px] leading-5 text-white/60 sm:mt-5 sm:p-4 sm:text-xs sm:leading-6">
{`curl -X POST ${typeof window === "undefined" ? "http://localhost:3000" : window.location.origin}/v1/chat/completions \\
  -H "Authorization: Bearer ${localDemoApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "huru/chat-1",
    "messages": [
      { "role": "user", "content": "Why private TEE compute?" }
    ]
  }'`}
              </pre>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Response preview</p>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-white/60">
                  {demoResponse ? JSON.stringify(demoResponse, null, 2) : "Run the demo request to see credits, verification metadata, and the runtime response."}
                </pre>
              </div>
              <p className="mt-4 text-xs leading-5 text-white/30">
                Configure Supabase later to unlock real accounts, project ownership, magic links, OAuth,
                and persistent dashboard history.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  /* ────── Loading: session check in progress ────── */
  if (!sessionReady) {
    return (
      <main ref={panelRef} className="min-h-screen bg-og-bg">
        <header className="border-b border-og-border bg-og-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
            <Link href="/" className="flex items-center gap-2">
              <HuruLogo className="size-6 text-og-black" />
              <span className="text-sm font-semibold text-og-black">Huru</span>
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center px-5 py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-og-border border-t-og-black" />
            <p className="text-sm text-og-text-3">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  /* ────── Pre-auth: centered sign-in card ────── */
  if (!overview) {
    return (
      <main ref={panelRef} className="min-h-screen bg-og-bg">
        <header className="border-b border-og-border bg-og-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
            <Link href="/" className="flex items-center gap-2">
              <HuruLogo className="size-6 text-og-black" />
              <span className="text-sm font-semibold text-og-black">Huru</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-og-text-2 transition hover:text-og-black">Home</Link>
              <Link href="/docs" className="inline-flex items-center gap-1.5 rounded-lg border border-og-border px-3 py-1.5 text-xs font-medium text-og-text-2 transition hover:bg-og-surface-2">
                <DocumentIcon className="size-3.5" />
                Docs
              </Link>
            </div>
          </div>
        </header>

        <div ref={contentRef} className="flex items-center justify-center px-5 py-20">
          <div data-huru-card className="w-full max-w-sm rounded-xl border border-og-border bg-og-surface p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] sm:rounded-2xl sm:p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold tracking-tight text-og-black">Welcome to Huru</h2>
              <p className="mt-2 text-sm text-og-text-2">Sign in to manage your projects and API keys.</p>
            </div>

            <button type="button" onClick={onGoogle} disabled={isPending}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-og-border bg-og-surface px-4 py-3 text-sm font-medium text-og-black shadow-sm transition hover:bg-og-surface-2 active:scale-[0.98] disabled:opacity-50">
              <svg className="size-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-og-border" /></div>
              <div className="relative flex justify-center"><span className="bg-og-surface px-3 text-xs text-og-text-3">or use email</span></div>
            </div>

            <div className="space-y-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                className="w-full rounded-xl border border-og-border bg-og-surface-2 px-4 py-3 text-sm text-og-black outline-none placeholder:text-og-text-3 focus:border-og-border-hover focus:ring-2 focus:ring-black/5" />
              <button type="button" onClick={onMagicLink} disabled={isPending}
                className="w-full rounded-xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#222] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50">
                Send magic link
              </button>
            </div>

            {status && <p className="mt-4 text-center text-sm text-og-text-2">{status}</p>}
          </div>
        </div>
      </main>
    );
  }

  /* ────── Post-auth: sidebar + content layout ────── */

  const selectedProject = overview.projects.find((p) => p.id === selectedProjectId);

  const renderOverview = () => {
    if (!projectDetail) {
      if (detailLoading) return <SectionLoader />;
      if (detailStatus) return <p className="text-sm text-og-text-2">{detailStatus}</p>;
      return (
        <EmptyState icon={SparkIcon} title="No project selected" description="Select a project from the sidebar or create a new one to get started."
          cta={{ label: "New project", onClick: () => setShowProjectModal(true) }} />
      );
    }

    const kpis = [
      { label: "Total Requests", value: projectDetail.usage.requests, icon: TerminalIcon },
      { label: "Credits Used", value: projectDetail.usage.creditsUsed, icon: ChartIcon },
      { label: "Balance", value: projectDetail.usage.currentBalance, icon: SparkIcon, warn: projectDetail.usage.currentBalance < 10 },
      { label: "API Key", value: projectDetail.key?.prefix ? `${projectDetail.key.prefix}...` : "none", icon: KeyIcon },
    ];

    return (
      <>
        {/* KPI cards */}
        <div data-huru-card className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="group rounded-lg border border-og-border bg-og-surface p-3 transition-all duration-300 hover:border-og-border-hover hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 sm:rounded-xl sm:p-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-og-surface-2 text-og-text-2 transition group-hover:bg-[#0a0a0a] group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-[#0a0a0a]">
                <kpi.icon className="size-4" />
              </div>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-og-text-3">{kpi.label}</p>
              {typeof kpi.value === "number" ? (
                <p data-kpi-num data-kpi-target={kpi.value} className={`mt-1 truncate font-mono text-xl font-semibold sm:text-2xl ${kpi.warn ? "text-og-red" : "text-og-black"}`}>0</p>
              ) : (
                <p className={`mt-1 truncate font-mono text-sm font-semibold ${kpi.warn ? "text-og-red" : "text-og-black"}`}>{kpi.value}</p>
              )}
            </div>
          ))}
        </div>

        {detailStatus && <p data-huru-card className="text-sm text-og-text-2">{detailStatus}</p>}

        {/* Usage chart (last 7 days) */}
        {projectDetail.usage.breakdown.length > 0 && (
          <div data-huru-card className="rounded-xl border border-og-border bg-og-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">Usage — last 7 days</p>
            <div className="mt-4 grid gap-3">
              {projectDetail.usage.breakdown.slice(-7).map((b) => {
                const peak = Math.max(...projectDetail.usage.breakdown.map((r) => r.creditsUsed), 1);
                const w = Math.max(4, Math.round((b.creditsUsed / peak) * 100));
                return (
                  <div key={b.date}>
                    <div className="flex justify-between text-xs text-og-text-3">
                      <span>{b.date}</span>
                      <span>{b.requests} req / {b.creditsUsed} cr</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-og-surface-2">
                      <div className="h-full rounded-full bg-og-black transition-all" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent requests (top 5) */}
        <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-4 sm:rounded-xl sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">Recent requests</p>
            {projectDetail.requests.length > 5 && (
              <button type="button" onClick={() => setActiveSection("usage")}
                className="text-xs font-medium text-og-text-2 transition hover:text-og-black">
                View all
              </button>
            )}
          </div>
          {projectDetail.requests.length === 0 ? (
            <p className="mt-4 text-sm text-og-text-3">No requests yet.</p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="mt-4 grid gap-2 sm:hidden">
                {projectDetail.requests.slice(0, 5).map((req) => (
                  <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                    className="rounded-lg border border-og-border p-3 transition hover:bg-og-surface-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${req.status === "completed" ? "bg-og-green" : "bg-og-red"}`} />
                        <span className="font-mono text-xs text-og-text-2">{req.method}</span>
                        <span className="text-xs text-og-text-2">{req.endpoint}</span>
                      </div>
                      <span className="font-mono text-xs text-og-text-3">{req.creditsUsed} cr</span>
                    </div>
                    <p className="mt-1 text-[11px] text-og-text-3">{new Date(req.startedAt).toLocaleDateString()}</p>
                  </Link>
                ))}
              </div>
              {/* Desktop table */}
              <div className="mt-4 hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-og-border text-left text-xs text-og-text-3">
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Method</th>
                      <th className="pb-2 pr-4 font-medium">Endpoint</th>
                      <th className="pb-2 pr-4 font-medium">Credits</th>
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {projectDetail.requests.slice(0, 5).map((req) => (
                      <tr key={req.id} className="border-b border-og-border last:border-0">
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-1.5">
                            <span className={`size-1.5 rounded-full ${req.status === "completed" ? "bg-og-green" : "bg-og-red"}`} />
                            <span className="text-xs text-og-text-2">{req.status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-og-text-2">{req.method}</td>
                        <td className="py-2.5 pr-4 text-xs text-og-text-2">{req.endpoint}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-og-text-2">{req.creditsUsed}</td>
                        <td className="py-2.5 pr-4 text-xs text-og-text-3">{new Date(req.startedAt).toLocaleDateString()}</td>
                        <td className="py-2.5">
                          <Link href={`/dashboard/requests/${req.id}`}
                            className="text-xs font-medium text-og-text-2 transition hover:text-og-black">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  const renderApiKeys = () => {
    if (!projectDetail) {
      if (detailLoading) return <SectionLoader />;
      return <EmptyState icon={KeyIcon} title="No project selected" description="Select a project to manage its API key." />;
    }

    return (
      <>
        <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-4 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 sm:rounded-xl sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 sm:flex-1">
              <div className="flex size-9 items-center justify-center rounded-lg bg-og-surface-2 text-og-text-2 sm:size-10">
                <KeyIcon className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-og-black">API Key</p>
                <p className="truncate font-mono text-xs text-og-text-3">{projectDetail.key?.prefix ? `${projectDetail.key.prefix}...` : "No key"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={rotateKey}
                className="flex-1 rounded-lg border border-og-border px-3 py-1.5 text-xs font-medium text-og-text-2 transition hover:bg-og-surface-2 sm:flex-none">
                Rotate
              </button>
              {visibleApiKey && (
                <button type="button" onClick={() => flashCopy(visibleApiKey, setCopyLabel)}
                  className="flex-1 rounded-lg bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#222] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 sm:flex-none">
                  {copyLabel ? <span className="animate-huru-pop">{copyLabel}</span> : "Copy"}
                </button>
              )}
            </div>
          </div>

          {visibleApiKey && (
            <div className="mt-4 rounded-lg border border-og-border bg-og-surface-2 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-og-text-3">Full key (shown once)</p>
              <code className="mt-1.5 block overflow-x-auto font-mono text-xs text-og-black">{visibleApiKey}</code>
            </div>
          )}

          {detailStatus && <p className="mt-3 text-sm text-og-text-2">{detailStatus}</p>}
        </div>

        <div data-huru-card className="rounded-xl border border-og-border bg-og-surface-2 p-5">
          <div className="flex items-start gap-3">
            <ShieldTickIcon className="mt-0.5 size-5 text-og-text-3" />
            <div>
              <p className="text-sm font-medium text-og-black">Security</p>
              <p className="mt-1 text-sm leading-relaxed text-og-text-2">
                Keep your API key secret. Never commit it to version control or expose it in client-side code.
                If you suspect a key has been compromised, rotate it immediately.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderUsage = () => {
    if (!projectDetail) {
      if (detailLoading) return <SectionLoader />;
      return <EmptyState icon={ChartIcon} title="No project selected" description="Select a project to see its usage data." />;
    }

    return (
      <>
        {/* Daily breakdown */}
        {projectDetail.usage.breakdown.length > 0 ? (
          <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-4 sm:rounded-xl sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">Daily breakdown</p>
            <div className="mt-4 grid gap-3">
              {projectDetail.usage.breakdown.map((b) => {
                const peak = Math.max(...projectDetail.usage.breakdown.map((r) => r.creditsUsed), 1);
                const w = Math.max(4, Math.round((b.creditsUsed / peak) * 100));
                return (
                  <div key={b.date}>
                    <div className="flex justify-between text-xs text-og-text-3">
                      <span>{b.date}</span>
                      <span>{b.requests} req / {b.creditsUsed} cr</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-og-surface-2">
                      <div className="h-full rounded-full bg-og-black transition-all" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState icon={ChartIcon} title="No usage data" description="Make some API requests to see usage breakdown here." />
        )}

        {/* Full request history */}
        <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-4 sm:rounded-xl sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">Request history</p>
          {projectDetail.requests.length === 0 ? (
            <p className="mt-4 text-sm text-og-text-3">No requests yet.</p>
          ) : (
            <div className="mt-4 grid gap-2">
              {projectDetail.requests.map((req) => (
                <div key={req.id} role="button" tabIndex={0}
                  onClick={() => setSelectedRequestId((c) => c === req.id ? null : req.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedRequestId((c) => c === req.id ? null : req.id); } }}
                  className={`cursor-pointer rounded-lg border p-2.5 transition sm:p-3 ${selectedRequestId === req.id ? "border-og-border-hover bg-og-surface-2" : "border-og-border hover:border-og-border-hover hover:bg-og-bg"}`}>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-og-black">{req.method} {req.endpoint}</p>
                      <p className="text-[11px] text-og-text-3 sm:text-xs">{req.model} — {req.creditsUsed} cr — {new Date(req.startedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${req.status === "completed" ? "text-og-green" : "text-og-red"}`}>{req.status}</span>
                      <Link href={`/dashboard/requests/${req.id}`} onClick={(e) => e.stopPropagation()}
                        className="rounded-md bg-og-surface-2 px-2 py-1 text-xs text-og-text-2 hover:text-og-black">
                        Open
                      </Link>
                    </div>
                  </div>
                  {req.errorMessage && <p className="mt-2 text-xs text-og-red">{req.errorMessage}</p>}
                  {selectedRequestId === req.id && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-og-text-3">Request</p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg bg-og-code-bg p-3 font-mono text-xs text-white/60">{req.requestPreview || "{}"}</pre>
                      </div>
                      <div>
                        <p className="text-xs text-og-text-3">Response</p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg bg-og-code-bg p-3 font-mono text-xs text-white/60">{req.responsePreview || "{}"}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderBilling = () => {
    if (!projectDetail) {
      if (detailLoading) return <SectionLoader />;
      return <EmptyState icon={ArrowUpRightIcon} title="No project selected" description="Select a project to manage billing and top up credits." />;
    }

    return (
      <>
        <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-4 sm:rounded-xl sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">Top up credits</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
            {creditPacks.map((pack) => (
              <button key={pack.packId} type="button" onClick={() => { void topUp(pack.packId); }}
                className="group rounded-xl border border-og-border p-4 text-left transition hover:border-og-border-hover hover:bg-og-surface-2">
                <p className="text-sm font-medium text-og-black">{pack.name}</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-og-black">{pack.creditsAwarded}</p>
                <p className="text-xs text-og-text-3">credits</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-mono text-sm text-og-text-2">{(pack.amountMinor / 100).toFixed(2)} {pack.currency}</p>
                  <ArrowUpRightIcon className="size-4 text-og-text-3 transition group-hover:text-og-black" />
                </div>
              </button>
            ))}
          </div>
          {detailStatus && <p className="mt-3 text-sm text-og-text-2">{detailStatus}</p>}
        </div>

        {/* Purchase history */}
        <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-4 sm:rounded-xl sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">Purchase history</p>
          {projectDetail.purchases.length === 0 ? (
            <p className="mt-4 text-sm text-og-text-3">No purchases yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-og-border text-left text-xs text-og-text-3">
                    <th className="pb-2 pr-4 font-medium">Pack</th>
                    <th className="pb-2 pr-4 font-medium">Reference</th>
                    <th className="pb-2 pr-4 font-medium">Credits</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projectDetail.purchases.map((pu) => (
                    <tr key={pu.id} className="border-b border-og-border last:border-0">
                      <td className="py-2.5 pr-4 text-sm text-og-black">{pu.name}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-og-text-3">{pu.reference}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-og-text-2">{pu.creditsAwarded}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          pu.status === "credited" ? "bg-og-green/10 text-og-green dark:text-green-400"
                            : pu.status === "verified" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : pu.status === "pending" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-og-surface-2 text-og-text-2"
                        }`}>
                          {pu.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderPlayground = () => {
    if (!projectDetail) {
      if (detailLoading) return <SectionLoader />;
      return <EmptyState icon={TerminalIcon} title="No project selected" description="Select a project to use the API playground." />;
    }

    const codeSnippets: Record<"curl" | "fetch" | "python", string> = {
      curl: generateCurl(projectDetail.project.apiKey, pgMessages.length ? pgMessages : [{ role: "user", content: "Hello" }]),
      fetch: generateFetch(projectDetail.project.apiKey, pgMessages.length ? pgMessages : [{ role: "user", content: "Hello" }]),
      python: generatePython(projectDetail.project.apiKey, pgMessages.length ? pgMessages : [{ role: "user", content: "Hello" }]),
    };

    return (
      <>
        {/* Chat area */}
        <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-3 sm:rounded-xl sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-og-text-3">Playground</p>
            <button type="button" onClick={() => { setPgMessages([]); setPgError(""); setPgMeta(null); setPgRawResponse(null); setPgShowRaw(false); }}
              className="rounded-lg border border-og-border px-3 py-1.5 text-xs font-medium text-og-text-2 transition hover:bg-og-surface-2">
              Clear
            </button>
          </div>

          {/* Messages */}
          <div ref={pgMessagesRef} className="mt-3 max-h-64 space-y-2.5 overflow-y-auto scroll-smooth sm:mt-4 sm:max-h-96 sm:space-y-3">
            {pgMessages.length === 0 && !pgLoading && (
              <p className="py-8 text-center text-sm text-og-text-3">Send a message to test the API</p>
            )}
            {pgMessages.map((msg, i) => (
              <div key={`${msg.role}-${i}`} data-pg-msg data-pg-role={msg.role} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] overflow-hidden rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#0a0a0a] text-white dark:bg-white dark:text-[#0a0a0a]"
                    : "border border-og-border bg-og-surface-2 text-og-black"
                }`}>
                  <pre className="whitespace-pre-wrap break-words font-sans">{msg.content}</pre>
                </div>
              </div>
            ))}
            {pgLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-og-border bg-og-surface-2 px-4 py-2.5 text-sm text-og-text-3 animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="mt-3 flex gap-2 sm:mt-4">
            <input value={pgInput} onChange={(e) => setPgInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendPlaygroundMessage(); } }}
              placeholder="Type a message..."
              className="min-w-0 flex-1 rounded-lg border border-og-border bg-og-surface-2 px-3 py-2.5 text-sm text-og-black outline-none placeholder:text-og-text-3 focus:border-og-border-hover focus:ring-2 focus:ring-black/5 sm:rounded-xl sm:px-4 sm:py-3" />
            <button type="button" onClick={() => { void sendPlaygroundMessage(); }} disabled={pgLoading || !pgInput.trim()}
              className="shrink-0 rounded-lg bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#222] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 disabled:opacity-50 sm:rounded-xl sm:px-5 sm:py-3">
              Send
            </button>
          </div>

          {pgError && <p className="mt-3 text-sm text-og-red">{pgError}</p>}
        </div>

        {/* Response metadata */}
        {pgMeta && (
          <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-3 sm:rounded-xl sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-og-text-3">Response metadata</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
              {[
                { label: "Request ID", value: pgMeta.requestId || "—" },
                { label: "Credits Used", value: String(pgMeta.creditsUsed) },
                { label: "Latency", value: `${pgMeta.latencyMs}ms` },
                { label: "Verified", value: pgMeta.verified ? "Yes" : "No" },
                { label: "Mode", value: pgMeta.verificationMode || "—" },
                { label: "Provider", value: pgMeta.provider || "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-og-border bg-og-surface-2 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-og-text-3">{item.label}</p>
                  <p className="mt-1 truncate font-mono text-sm text-og-black">{item.value}</p>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setPgShowRaw((v) => !v)}
              className="mt-4 text-xs font-medium text-og-text-2 transition hover:text-og-black">
              {pgShowRaw ? "Hide JSON" : "Show JSON"}
            </button>
            {pgShowRaw && pgRawResponse && (
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-og-code-bg p-4 font-mono text-xs leading-6 text-white/60">
                {JSON.stringify(pgRawResponse, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Code snippets */}
        <div data-huru-card className="rounded-lg border border-og-border bg-og-surface p-3 sm:rounded-xl sm:p-5">
          <button type="button" onClick={() => setPgShowCode((v) => !v)}
            className="flex w-full items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-og-text-3">View as code</p>
            <span className="text-xs font-medium text-og-text-2">{pgShowCode ? "Hide" : "Show"}</span>
          </button>

          {pgShowCode && (
            <div className="mt-4">
              <div className="flex gap-1">
                {(["curl", "fetch", "python"] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setPgCodeTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      pgCodeTab === tab ? "bg-[#0a0a0a] text-white dark:bg-white dark:text-[#0a0a0a]" : "text-og-text-2 hover:bg-og-surface-2 hover:text-og-black"
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="relative mt-3">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-og-code-bg p-4 font-mono text-xs leading-6 text-white/60">
                  {codeSnippets[pgCodeTab]}
                </pre>
                <button type="button"
                  onClick={() => flashCopy(codeSnippets[pgCodeTab], setPgCopyLabel)}
                  className="absolute right-2 top-2 rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-white/60 transition hover:bg-white/20 hover:text-white">
                  {pgCopyLabel ? <span className="animate-huru-pop">{pgCopyLabel}</span> : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const sectionContent: Record<DashboardSection, () => React.JSX.Element | null> = {
    overview: renderOverview,
    "api-keys": renderApiKeys,
    usage: renderUsage,
    billing: renderBilling,
    playground: renderPlayground,
  };

  return (
    <main ref={panelRef} className="flex min-h-screen flex-col bg-og-bg">
      {/* Top bar */}
      <header className="border-b border-og-border bg-og-surface">
        <div className="flex items-center justify-between px-5 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <HuruLogo className="size-5 text-og-black sm:size-6" />
              <span className="text-[13px] font-semibold text-og-black sm:text-sm">Huru</span>
            </Link>
            {selectedProject && (
              <>
                <span className="text-og-text-3">/</span>
                <span className="truncate text-[13px] text-og-text-2 sm:text-sm">{selectedProject.name}</span>
              </>
            )}
          </div>
          <Link href="/docs" className="inline-flex items-center gap-1.5 rounded-lg border border-og-border px-3 py-1.5 text-xs font-medium text-og-text-2 transition hover:bg-og-surface-2">
            <DocumentIcon className="size-3.5" />
            Docs
          </Link>
        </div>
      </header>

      {/* Mobile horizontal tabs */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-og-border bg-og-surface px-3 py-2 scrollbar-hide lg:hidden">
        {sidebarNav.map((item) => (
          <button key={item.key} type="button" onClick={() => setActiveSection(item.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
              activeSection === item.key ? "bg-[#0a0a0a] text-white dark:bg-white dark:text-[#0a0a0a]" : "text-og-text-2 hover:bg-og-surface-2 hover:text-og-black"
            }`}>
            <item.icon className="size-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Mobile project selector + user row */}
      <div className="flex items-center justify-between border-b border-og-border bg-og-surface px-3 py-2 lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {overview.projects.map((p) => (
            <button key={p.id} type="button" onClick={() => setSelectedProjectId(p.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                selectedProjectId === p.id ? "bg-og-surface-2 font-medium text-og-black" : "text-og-text-3 hover:text-og-black"
              }`}>
              {selectedProjectId === p.id && <span className="size-1.5 shrink-0 rounded-full bg-og-green animate-pulse-dot" />}
              {p.name}
            </button>
          ))}
          <button type="button" onClick={() => { setNewProjectName(""); setShowProjectModal(true); }}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-og-text-3 hover:text-og-black">+ New</button>
        </div>
        <button type="button" onClick={onSignOut}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] text-og-text-3 transition hover:text-og-black">
          Sign out
        </button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-og-border bg-og-surface lg:flex">
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {sidebarNav.map((item) => (
              <button key={item.key} type="button" onClick={() => setActiveSection(item.key)}
                className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  activeSection === item.key ? "bg-[#0a0a0a] text-white dark:bg-white dark:text-[#0a0a0a]" : "text-og-text-2 hover:bg-og-surface-2 hover:text-og-black"
                }`}>
                {activeSection === item.key && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-og-surface transition-all duration-300" />
                )}
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Project selector */}
          <div className="border-t border-og-border p-3">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-og-text-3">Projects</p>
            <div className="mt-2 grid gap-1">
              {overview.projects.map((p) => (
                <button key={p.id} type="button" onClick={() => setSelectedProjectId(p.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedProjectId === p.id ? "bg-og-surface-2 font-medium text-og-black" : "text-og-text-2 hover:bg-og-surface-2 hover:text-og-black"
                  }`}>
                  {selectedProjectId === p.id && (
                    <span className="size-1.5 shrink-0 rounded-full bg-og-green animate-pulse-dot" />
                  )}
                  {p.name}
                </button>
              ))}
              <button type="button" onClick={() => { setNewProjectName(""); setShowProjectModal(true); }}
                disabled={isPending}
                className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-og-text-3 transition hover:bg-og-surface-2 hover:text-og-black disabled:opacity-50">
                <span className="text-base leading-none">+</span>
                New project
              </button>
            </div>
            {status && <p className="mt-2 px-3 text-xs text-og-text-2">{status}</p>}
          </div>

          {/* User + sign out */}
          <div className="border-t border-og-border p-3">
            <div className="flex items-center justify-between rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-og-black">{overview.user.name || overview.user.email.split("@")[0]}</p>
                <p className="truncate text-xs text-og-text-3">{overview.user.email}</p>
              </div>
              <button type="button" onClick={onSignOut}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-og-text-3 transition hover:bg-og-surface-2 hover:text-og-black">
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Content area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:gap-5">
            {sectionContent[activeSection]()}
          </div>
        </div>
      </div>

      {/* Project creation modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowProjectModal(false); setNewProjectName(""); } }}
          onKeyDown={(e) => { if (e.key === "Escape") { setShowProjectModal(false); setNewProjectName(""); } }}
          role="dialog" aria-modal="true" aria-label="Create project" tabIndex={-1}>
          <div data-project-modal className="mx-4 w-full max-w-md rounded-2xl border border-og-border bg-og-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-og-black">Create project</h3>
            <p className="mt-1 text-sm text-og-text-2">Give your project a name. You can change it later.</p>
            <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="My First App" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && newProjectName.trim()) { void createProject(newProjectName); } }}
              className="mt-4 w-full rounded-xl border border-og-border bg-og-surface-2 px-4 py-3 text-sm text-og-black outline-none placeholder:text-og-text-3 focus:border-og-border-hover focus:ring-2 focus:ring-black/5" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowProjectModal(false); setNewProjectName(""); }}
                className="rounded-lg border border-og-border px-4 py-2 text-sm font-medium text-og-text-2 transition hover:bg-og-surface-2">
                Cancel
              </button>
              <button type="button" onClick={() => { void createProject(newProjectName); }}
                disabled={!newProjectName.trim() || isPending}
                className="rounded-lg bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#222] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 disabled:opacity-50">
                {isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
