"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/huru/browser-supabase";

type RequestDetail = {
  user: { id: string; email: string; name: string | null };
  project: {
    id: string; name: string; environment: "test" | "live";
    apiKey: string; apiKeyPrefix: string; creditsBalance: number; createdAt: string;
  };
  request: {
    id: string; endpoint: string; method: string; model: string; status: string;
    creditsUsed: number; startedAt: string; completedAt: string | null;
    errorMessage: string | null; verified: boolean; verificationMode: string;
    attestationReportId: string | null; quoteHash: string | null;
    requestPreview: string; responsePreview: string;
  };
};

function getRedirectUrl() {
  if (typeof window === "undefined") return "http://localhost:3000";
  return `${window.location.origin}/`;
}

export function HuruRequestDetailPanel({ requestId }: { requestId: string }) {
  const supabase = useMemo(() => {
    try { return getBrowserSupabase(); }
    catch { return null; }
  }, []);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }: { data: { session?: { access_token?: string } | null } }) => {
      if (!mounted) return;
      if (data.session?.access_token) {
        const res = await fetch(`/api/dashboard/requests/${requestId}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        if (res.ok) setDetail((await res.json()) as RequestDetail);
      }
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event: string, session: { access_token?: string } | null) => {
      if (!session?.access_token) { setDetail(null); setSessionReady(true); return; }
      const res = await fetch(`/api/dashboard/requests/${requestId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) setDetail((await res.json()) as RequestDetail);
      else setDetail(null);
      setSessionReady(true);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [requestId, supabase]);

  if (!supabase) {
    return (
      <div className="rounded-xl border border-og-border bg-og-surfacep-6 shadow-sm">
        <p className="text-sm text-og-text-2">
          Set <code className="rounded bg-og-surface-2 px-1.5 py-0.5 text-xs text-og-purple">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-og-surface-2 px-1.5 py-0.5 text-xs text-og-purple">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable request inspection.
        </p>
      </div>
    );
  }

  const onMagicLink = async () => {
    const addr = email.trim();
    if (!addr) { setStatus("Enter an email address."); return; }
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: getRedirectUrl() } });
    setStatus(error ? error.message : "Magic link sent — check your email.");
  };

  const onGithub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: getRedirectUrl() } });
    if (error) setStatus(error.message);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-og-black">
            {detail ? `${detail.request.method} ${detail.request.endpoint}` : "Request detail"}
          </h1>
          {detail && <p className="mt-1 text-sm text-og-text-3">ID: {detail.request.id}</p>}
        </div>
        <Link href="/dashboard" className="rounded-lg border border-og-border bg-og-surface-2 px-4 py-2 text-sm text-og-text transition hover:border-og-border-hover">
          Back to dashboard
        </Link>
      </div>

      {/* Sign-in prompt */}
      {!detail && sessionReady && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-og-border bg-og-surfacep-5 shadow-sm">
            <h2 className="text-lg font-semibold text-og-black">Sign in to view this request</h2>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
              className="mt-4 w-full rounded-lg border border-og-border bg-og-surface-2 px-4 py-2.5 text-sm text-og-text outline-none placeholder:text-og-text-3 focus:border-og-purple/40 focus:ring-1 focus:ring-og-purple/20" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={onMagicLink} className="rounded-lg bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#222] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200">Magic link</button>
              <button type="button" onClick={onGithub} className="rounded-lg border border-og-border bg-og-surface-2 px-4 py-2 text-sm text-og-text transition hover:border-og-border-hover">GitHub</button>
            </div>
            {status && <p className="mt-3 text-sm text-og-purple">{status}</p>}
          </div>
          <div className="rounded-xl border border-og-border bg-og-surfacep-5 shadow-sm">
            <p className="text-sm text-og-text-3">Sign in to view the request payload, response, verification state, and the project that issued it.</p>
          </div>
        </div>
      )}

      {/* Request detail */}
      {detail && (
        <>
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { k: "Status", v: detail.request.status, color: detail.request.status === "completed" ? "text-og-green" : "text-og-red" },
              { k: "Credits", v: String(detail.request.creditsUsed), color: "text-og-black" },
              { k: "Verified", v: detail.request.verified ? "Yes" : "No", color: "text-og-black" },
              { k: "Mode", v: detail.request.verificationMode, color: "text-og-black" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-og-border bg-og-surfacep-4 shadow-sm">
                <p className="text-xs text-og-text-3">{s.k}</p>
                <p className={`mt-1 font-mono text-sm font-medium ${s.color}`}>{s.v}</p>
              </div>
            ))}
          </div>

          {/* Payloads */}
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: "Request payload", data: detail.request.requestPreview },
              { label: "Response payload", data: detail.request.responsePreview },
            ].map((p) => (
              <div key={p.label} className="rounded-xl border border-og-border bg-og-code-bg overflow-hidden shadow-sm">
                <div className="border-b border-white/10 px-4 py-2.5 text-xs text-white/40">{p.label}</div>
                <pre className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs text-white/60">{p.data || "{}"}</pre>
              </div>
            ))}
          </div>

          {/* Project + attestation */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-og-border bg-og-surfacep-5 shadow-sm">
              <h3 className="text-sm font-semibold text-og-black">Project</h3>
              <div className="mt-3 grid gap-2 text-sm">
                {[
                  { k: "Name", v: detail.project.name },
                  { k: "Environment", v: detail.project.environment },
                  { k: "Key prefix", v: `${detail.project.apiKeyPrefix}...` },
                  { k: "Balance", v: `${detail.project.creditsBalance} credits` },
                ].map((r) => (
                  <div key={r.k} className="flex justify-between">
                    <span className="text-og-text-3">{r.k}</span>
                    <span className="font-mono text-og-text">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-og-border bg-og-surfacep-5 shadow-sm">
              <h3 className="text-sm font-semibold text-og-black">Attestation</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-og-text-3">Report ID</span>
                  <span className="font-mono text-xs text-og-text">{detail.request.attestationReportId || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-og-text-3">Quote hash</span>
                  <span className="font-mono text-xs text-og-text">{detail.request.quoteHash || "—"}</span>
                </div>
              </div>
              {detail.request.errorMessage && (
                <div className="mt-4 rounded-lg bg-og-red/10 p-3">
                  <p className="text-xs font-medium text-og-red">Error</p>
                  <p className="mt-1 text-sm text-og-red/80">{detail.request.errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
