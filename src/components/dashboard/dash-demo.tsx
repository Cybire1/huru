"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowUpRightIcon,
  DocumentIcon,
  HuruLogo,
  TerminalIcon,
} from "@/components/huru-icons";
import { localDemoApiKey } from "./dash-constants";
import { getApiErrorMessage } from "./dash-helpers";

export function DashDemo() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [demoStatus, setDemoStatus] = useState("");
  const [demoError, setDemoError] = useState("");
  const [demoResponse, setDemoResponse] = useState<Record<string, unknown> | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);

  useGSAP(() => {
    if (!contentRef.current) return;
    const cards = contentRef.current.querySelectorAll("[data-huru-card]");
    if (!cards.length) return;
    gsap.fromTo(cards, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.06 });
  }, { scope: contentRef, dependencies: [demoResponse] });

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

  return (
    <main className="dash-main">
      <header className="dash-header">
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HuruLogo style={{ width: 24, height: 24, color: "var(--ink)" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Huru</span>
          </Link>
          <Link href="/docs" className="dash-btn-ghost">
            <DocumentIcon style={{ width: 14, height: 14 }} />
            Docs
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        <section ref={contentRef} className="dash-grid-2">
          <div data-huru-card className="dash-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <TerminalIcon style={{ width: 20, height: 20, color: "var(--ink-2)" }} />
              </div>
              <div>
                <p className="dash-section-label">Local demo mode</p>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>Use Huru before auth is configured</h2>
              </div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" }}>
              Supabase public envs are missing, so sign-in is disabled. The MVP can still prove the
              developer flow with the bootstrap test key, credits, request logging, and the same
              OpenAI-style route your customers will integrate.
            </p>
            <div style={{ padding: 16, background: "var(--surface-2)", borderRadius: "var(--r)", border: "1px solid var(--line)" }}>
              <p className="dash-section-label">Bootstrap API key</p>
              <code style={{ display: "block", marginTop: 8, padding: "8px 12px", background: "var(--bg)", borderRadius: "var(--r-sm)", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--acc)" }}>
                {localDemoApiKey}
              </code>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={runDemoRequest} disabled={demoRunning} className="dash-btn">
                {demoRunning ? "Running..." : "Run demo request"}
                <ArrowUpRightIcon style={{ width: 16, height: 16 }} />
              </button>
              <Link href="/docs" className="dash-btn-ghost">
                <DocumentIcon style={{ width: 16, height: 16 }} />
                Read docs
              </Link>
            </div>
            {demoStatus && <p style={{ fontSize: 13, color: "var(--ok)" }}>{demoStatus}</p>}
            {demoError && <p style={{ fontSize: 13, color: "var(--err)" }}>{demoError}</p>}
          </div>

          <div data-huru-card className="dash-code-block" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p className="dash-section-label">Developer proof</p>
                <h3 style={{ marginTop: 4, fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>One API call, no wallet setup</h3>
              </div>
              <span style={{ padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)" }}>POST</span>
            </div>
            <pre style={{ overflow: "auto", padding: 16, background: "#08070C", borderRadius: "var(--r-sm)", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,0.5)" }}>
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
            <div style={{ padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: "var(--r-sm)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="dash-section-label" style={{ color: "rgba(255,255,255,0.35)" }}>Response preview</p>
              <pre style={{ marginTop: 12, maxHeight: 280, overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.5)" }}>
                {demoResponse ? JSON.stringify(demoResponse, null, 2) : "Run the demo request to see credits, verification metadata, and the runtime response."}
              </pre>
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.6, color: "rgba(255,255,255,0.25)" }}>
              Configure Supabase later to unlock real accounts, project ownership, magic links, OAuth,
              and persistent dashboard history.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
