"use client";

import { useState } from "react";
import { KeyIcon, ShieldTickIcon } from "@/components/huru-icons";
import { useDash } from "../dash-context";
import { EmptyState, SectionLoader } from "../dash-shared";

export function DashApiKeys() {
  const { projectDetail, detailLoading, detailStatus, visibleApiKey, rotateKey, flashCopy } = useDash();
  const [copyLabel, setCopyLabel] = useState<string | null>(null);

  if (!projectDetail) {
    if (detailLoading) return <SectionLoader />;
    return <EmptyState icon={KeyIcon} title="No project selected" description="Select a project to manage its API key." />;
  }

  return (
    <>
      <div data-huru-card className="dash-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r)", background: "var(--surface-2)", color: "var(--ink-2)" }}>
              <KeyIcon style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>API Key</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>{projectDetail.key?.prefix ? `${projectDetail.key.prefix}...` : "No key"}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={rotateKey} className="dash-btn-ghost">Rotate</button>
            {visibleApiKey && (
              <button type="button" onClick={() => flashCopy(visibleApiKey, setCopyLabel)} className="dash-btn sm">
                {copyLabel ?? "Copy"}
              </button>
            )}
          </div>
        </div>

        {visibleApiKey && (
          <div style={{ marginTop: 16, padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
            <p className="dash-section-label">Full key (shown once)</p>
            <code style={{ display: "block", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--acc)", wordBreak: "break-all" }}>{visibleApiKey}</code>
          </div>
        )}

        {detailStatus && <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-2)" }}>{detailStatus}</p>}
      </div>

      <div data-huru-card className="dash-card" style={{ background: "var(--surface-2)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <ShieldTickIcon style={{ width: 20, height: 20, marginTop: 2, color: "var(--ink-3)", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>Security</p>
            <p style={{ marginTop: 4, fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
              Keep your API key secret. Never commit it to version control or expose it in client-side code.
              If you suspect a key has been compromised, rotate it immediately.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
