"use client";

import { useState } from "react";
import Link from "next/link";
import { DocumentIcon, HuruLogo } from "@/components/huru-icons";
import { useDash } from "./dash-context";

export function DashSignIn() {
  const { onMagicLink, onGoogle, isPending, status } = useDash();
  const [email, setEmail] = useState("");

  return (
    <main className="dash-main">
      <header className="dash-header">
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HuruLogo style={{ width: 24, height: 24, color: "var(--ink)" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Huru</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/" style={{ fontSize: 13, color: "var(--ink-2)" }}>Home</Link>
            <Link href="/docs" className="dash-btn-ghost">
              <DocumentIcon style={{ width: 14, height: 14 }} />
              Docs
            </Link>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px" }}>
        <div data-huru-card className="dash-card" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>Welcome to Huru</h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "var(--ink-2)" }}>Sign in to manage your projects and API keys.</p>
          </div>

          <button type="button" onClick={onGoogle} disabled={isPending}
            className="dash-btn-ghost" style={{ width: "100%", marginTop: 32, padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>
            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div style={{ position: "relative", margin: "24px 0" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}><div style={{ width: "100%", borderTop: "1px solid var(--line)" }} /></div>
            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}><span style={{ background: "var(--surface)", padding: "0 12px", fontSize: 12, color: "var(--ink-3)" }}>or use email</span></div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="dash-input" />
            <button type="button" onClick={() => { void onMagicLink(email); }} disabled={isPending} className="dash-btn" style={{ width: "100%", padding: "12px 16px" }}>
              Send magic link
            </button>
          </div>

          {status && <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>{status}</p>}
        </div>
      </div>
    </main>
  );
}
