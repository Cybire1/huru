"use client";

import Link from "next/link";
import { Icon } from "./huru-icons";

export function HuruManifesto() {
  return (
    <section className="section" id="manifesto">
      <div className="container">
        <div className="eyebrow-row">
          <span className="idx">03 ·</span>
          <b>Manifesto</b>
          <span>9 cells</span>
        </div>

        <div className="display" style={{ maxWidth: "20ch" }}>
          Built for developers, <em>not</em> crypto enthusiasts.
        </div>

        <div className="manifesto">
          <div className="mcell m-c8 m-r2">
            <div className="mcell-lbl"><b>01</b> · Verification</div>
            <h3>Every response carries <em>cryptographic proof</em> of where it ran and what model produced it.</h3>
            <p>
              TEE attestation, SHA-384 hashed, signed by the enclave. Skip it for chat,
              demand it for finance. Either way the proof is in the payload, not a separate ledger.
            </p>
            <div style={{ marginTop: "auto", display: "flex", gap: 18, paddingTop: 30 }}>
              <div className="spec"><b>Intel TDX</b></div>
              <div className="spec"><b>AMD SEV-SNP</b></div>
              <div className="spec"><b>SGX</b></div>
              <div className="spec"><b>H100 CC</b></div>
            </div>
          </div>

          <div className="mcell m-c4 m-stat">
            <div className="mcell-lbl"><b>02</b> · Latency</div>
            <div className="big"><em>184</em><sub>ms</sub></div>
            <div className="cap">p50 chat-completions · <b>last 7d</b></div>
          </div>

          <div className="mcell m-c4 m-stat">
            <div className="mcell-lbl"><b>03</b> · Network</div>
            <div className="big">42<sub>nodes</sub></div>
            <div className="cap">across <b>9 regions</b> · all TEE-attested</div>
          </div>

          <div className="mcell m-c6 m-code">
            <div className="mcell-lbl"><b>04</b> · Drop-in</div>
            <h3>OpenAI-compatible. <em>One line</em> to integrate.</h3>
            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <div className="cmt"># base_url</div>
              <div className="acc"><span className="str">&quot;https://api.huru.dev/v1&quot;</span></div>
              <div style={{ height: 8 }} />
              <div className="cmt"># works with any OpenAI-compatible SDK</div>
            </div>
          </div>

          <div className="mcell m-c6 m-spark">
            <div className="lbl">Burn rate</div>
            <div className="val">+12.4%</div>
            <svg viewBox="0 0 200 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--acc)" stopOpacity="0.35" />
                  <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 150 Q 20 130 40 140 T 80 120 T 120 80 T 160 90 T 200 50 L 200 200 L 0 200 Z" fill="url(#sg)" />
              <path d="M0 150 Q 20 130 40 140 T 80 120 T 120 80 T 160 90 T 200 50" fill="none" stroke="var(--acc)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="mcell m-c6 m-quote">
            <div className="mcell-lbl"><b>05</b> · Field report</div>
            <blockquote style={{ flex: 1 }}>
              Integrated in an afternoon. The verify flag is the killer
              feature — every response carries proof we can show our users.
            </blockquote>
            <cite>
              <b>Early access user</b>
              Beta tester
            </cite>
          </div>

          <div className="mcell m-c6 m-attestation">
            <div className="mcell-lbl"><b>06</b> · Last attestation</div>
            <h3 style={{ fontSize: "1.4rem", maxWidth: "20ch" }}>
              Verified · <em>sgx-fra-03</em> · 0.4s ago
            </h3>
            <div className="hash">
              <b>tee:sha384:</b>9c4f2a8b1e6d3f0a7b2c5e9d4f8a1b6c0e3d7f2a5b8c1e4d9f6a3b0c7e2d5f8b1a6c4d7e0
            </div>
          </div>

          <div className="mcell m-c8 m-cta">
            <div className="mcell-lbl"><b>07</b> · Start</div>
            <h3>
              <em>100 free credits</em> on signup. Pay only when you ship.
            </h3>
            <div className="actions">
              <Link href="/dashboard" className="btn btn-primary">
                Get API key
                <span className="btn-arrow"><Icon.Arrow width={12} height={12} /></span>
              </Link>
              <Link href="/docs" className="btn btn-ghost">Read docs</Link>
            </div>
          </div>

          <div className="mcell m-c4 m-stat">
            <div className="mcell-lbl"><b>08</b> · Coverage</div>
            <div className="big"><em>13</em></div>
            <div className="cap">open-weight and frontier models · <b>one key</b></div>
          </div>
        </div>
      </div>
    </section>
  );
}
