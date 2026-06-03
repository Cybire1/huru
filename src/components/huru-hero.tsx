"use client";

import { Icon } from "./huru-icons";
import { HuruFlame } from "./huru-flame";
import Link from "next/link";

const TELEMETRY = [
  { k: "p50 latency", v: "184ms", accent: true },
  { k: "active nodes", v: "42" },
  { k: "models live", v: "13" },
  { k: "free credits", v: "200", accent: true },
];

export function HuruHero() {
  return (
    <section className="hero" id="top">
      <div className="hero-bg" />
      <div className="hero-rule-grid" />
      <div className="container" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="hero-spec-row">
          <span className="spec"><b>HURU</b> &middot; v0.4.2 &middot; <span className="acc">BETA</span></span>
          <span className="spec hero-spec-stats">42.NODES &middot; 9.REGIONS &middot; TEE.ATTESTED</span>
        </div>

        {/* Mobile-only flame anchor — sits above the heading, full presence */}
        <div className="hero-flame-mobile" aria-hidden="true">
          <HuruFlame size={260} drift={true} />
          <span className="hero-flame-mobile-tag">
            <i /> Verified &middot; 0.4s ago
          </span>
        </div>

        <div className="hero-prism">
          <div>
            <div className="hero-display">
              <span className="top">Inference,</span>
              <span className="bot">attested.</span>
            </div>
            <p className="hero-sub-mobile">
              Decentralized AI on 0G.
              <span> One bearer token. Every response sealed in a TEE.</span>
            </p>
          </div>
          <div className="hero-stage">
            <span className="label tl">node <b>SGX-FRA-03</b></span>
            <span className="label tr">model <b>llama-3.3-70b</b></span>
            <span className="label br">latency <span className="acc">184ms</span></span>
            <span className="label bl">verified <b>&middot;</b></span>
            <HuruFlame size={480} drift={true} />
          </div>
        </div>

        <div className="hero-meta">
          <div className="hero-meta-l">
            <p className="hero-sub">
              A REST gateway for <em>decentralized AI compute</em> on the 0G Network.
              Chat and image &mdash; behind one bearer token, every response sealed
              by a Trusted Execution Environment.
            </p>
            <div className="hero-actions">
              <Link href="/dashboard" className="btn btn-primary">
                Get API key
                <span className="btn-arrow"><Icon.Arrow width={12} height={12} /></span>
              </Link>
              <Link href="/docs" className="btn btn-ghost">Read docs</Link>
              <span className="kbd-hint" style={{ marginLeft: 8, font: "500 11.5px/1 var(--font-mono)", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                <span className="kbd">⌘</span> <span className="kbd">K</span> &nbsp;to search docs
              </span>
            </div>
          </div>
          <div className="hero-telemetry" role="list">
            {TELEMETRY.map((t) => (
              <div className="row" role="listitem" key={t.k}>
                <span className="k">{t.k}</span>
                <span className={`v ${t.accent ? "acc" : ""}`}>{t.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
