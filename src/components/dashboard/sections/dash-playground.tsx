"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TerminalIcon } from "@/components/huru-icons";
import { useDash } from "../dash-context";
import { getApiErrorMessage } from "../dash-helpers";
import { EmptyState, SectionLoader } from "../dash-shared";
import type { PlaygroundMeta } from "../dash-types";

export function DashPlayground() {
  const { projectDetail, detailLoading, supabase, selectedProjectId, contentRef, flashCopy } = useDash();

  /* Local playground state */
  const [pgMessages, setPgMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [pgInput, setPgInput] = useState("");
  const [pgLoading, setPgLoading] = useState(false);
  const [pgError, setPgError] = useState("");
  const [pgMeta, setPgMeta] = useState<PlaygroundMeta | null>(null);
  const [pgRawResponse, setPgRawResponse] = useState<Record<string, unknown> | null>(null);
  const [pgShowRaw, setPgShowRaw] = useState(false);
  const [pgShowCode, setPgShowCode] = useState(false);
  const [pgCodeTab, setPgCodeTab] = useState<"curl" | "fetch" | "python">("curl");
  const [pgCopyLabel, setPgCopyLabel] = useState<string | null>(null);
  const pgMessagesRef = useRef<HTMLDivElement>(null);

  /* Message slide-in */
  useGSAP(() => {
    if (!contentRef.current) return;
    const msgs = contentRef.current.querySelectorAll<HTMLElement>("[data-pg-msg]");
    msgs.forEach((msg) => {
      const isUser = msg.dataset.pgRole === "user";
      gsap.fromTo(msg, { x: isUser ? 24 : -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
    });
  }, { scope: contentRef, dependencies: [pgMessages] });

  /* Auto-scroll */
  useEffect(() => {
    if (pgMessagesRef.current && pgMessages.length > 0) {
      pgMessagesRef.current.scrollTo({ top: pgMessagesRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [pgMessages, pgLoading]);

  /* Send message */
  const sendPlaygroundMessage = async () => {
    if (!projectDetail || !selectedProjectId || pgLoading || !pgInput.trim()) return;
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

  /* Code generation helpers */
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
      <div data-huru-card className="dash-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="dash-section-label">Playground</p>
          <button type="button" onClick={() => { setPgMessages([]); setPgError(""); setPgMeta(null); setPgRawResponse(null); setPgShowRaw(false); }} className="dash-btn-ghost">
            Clear
          </button>
        </div>

        {/* Messages */}
        <div ref={pgMessagesRef} style={{ marginTop: 16, maxHeight: 384, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, scrollBehavior: "smooth" }}>
          {pgMessages.length === 0 && !pgLoading && (
            <p style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>Send a message to test the API</p>
          )}
          {pgMessages.map((msg, i) => (
            <div key={`${msg.role}-${i}`} data-pg-msg data-pg-role={msg.role} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div className={msg.role === "user" ? "dash-chat-user" : "dash-chat-assistant"}>
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-sans)", margin: 0 }}>{msg.content}</pre>
              </div>
            </div>
          ))}
          {pgLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div className="dash-chat-assistant" style={{ color: "var(--ink-3)" }}>
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <input value={pgInput} onChange={(e) => setPgInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendPlaygroundMessage(); } }}
            placeholder="Type a message..." className="dash-input" style={{ flex: 1 }} />
          <button type="button" onClick={() => { void sendPlaygroundMessage(); }} disabled={pgLoading || !pgInput.trim()} className="dash-btn">
            Send
          </button>
        </div>

        {pgError && <p style={{ marginTop: 12, fontSize: 13, color: "var(--err)" }}>{pgError}</p>}
      </div>

      {/* Response metadata */}
      {pgMeta && (
        <div data-huru-card className="dash-card">
          <p className="dash-section-label">Response metadata</p>
          <div className="dash-grid-3" style={{ marginTop: 16, gap: 8 }}>
            {[
              { label: "Request ID", value: pgMeta.requestId || "\u2014" },
              { label: "Credits Used", value: String(pgMeta.creditsUsed) },
              { label: "Latency", value: `${pgMeta.latencyMs}ms` },
              { label: "Verified", value: pgMeta.verified ? "Yes" : "No" },
              { label: "Mode", value: pgMeta.verificationMode || "\u2014" },
              { label: "Provider", value: pgMeta.provider || "\u2014" },
            ].map((item) => (
              <div key={item.label} style={{ padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                <p className="dash-section-label">{item.label}</p>
                <p style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</p>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setPgShowRaw((v) => !v)} style={{ marginTop: 16, fontSize: 12, fontWeight: 500, color: "var(--ink-2)", cursor: "pointer" }}>
            {pgShowRaw ? "Hide JSON" : "Show JSON"}
          </button>
          {pgShowRaw && pgRawResponse && (
            <pre className="dash-code-block" style={{ marginTop: 12, maxHeight: 280 }}>
              {JSON.stringify(pgRawResponse, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Code snippets */}
      <div data-huru-card className="dash-card">
        <button type="button" onClick={() => setPgShowCode((v) => !v)} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <p className="dash-section-label">View as code</p>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>{pgShowCode ? "Hide" : "Show"}</span>
        </button>

        {pgShowCode && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(["curl", "fetch", "python"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setPgCodeTab(tab)}
                  style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: pgCodeTab === tab ? "var(--acc)" : "transparent",
                    color: pgCodeTab === tab ? "var(--ink-on-acc)" : "var(--ink-2)",
                    transition: "all 0.2s ease" }}>
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ position: "relative", marginTop: 12 }}>
              <pre className="dash-code-block">
                {codeSnippets[pgCodeTab]}
              </pre>
              <button type="button"
                onClick={() => flashCopy(codeSnippets[pgCodeTab], setPgCopyLabel)}
                style={{ position: "absolute", right: 8, top: 8, padding: "4px 8px", borderRadius: "var(--r-sm)", background: "rgba(255,255,255,0.08)", fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s ease" }}>
                {pgCopyLabel ?? "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
