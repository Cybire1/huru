"use client";

import { Icon } from "./huru-icons";
import { HuruFlame } from "./huru-flame";
import Link from "next/link";

export function HuruHero() {
  return (
    <section className="hero" id="top">
      <div className="hero-bg" />
      <div className="hero-rule-grid" />
      <div className="container" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
          <span className="spec"><b>HURU</b> &middot; v0.4.2 &middot; <span className="acc">BETA</span></span>
          <span className="spec">42.NODES &middot; 9.REGIONS &middot; TEE.ATTESTED</span>
        </div>

        <div className="hero-prism">
          <div>
            <div className="hero-display">
              <span className="top">Inference,</span>
              <span className="bot">attested.</span>
            </div>
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
              Chat and image — behind one bearer token, every response sealed
              by a Trusted Execution Environment.
            </p>
            <div className="hero-actions">
              <Link href="/dashboard" className="btn btn-primary">
                Get API key
                <span className="btn-arrow"><Icon.Arrow width={12} height={12} /></span>
              </Link>
              <Link href="/docs" className="btn btn-ghost">Read docs</Link>
              <span style={{ marginLeft: 8, font: "500 11.5px/1 var(--font-mono)", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                <span className="kbd">⌘</span> <span className="kbd">K</span> &nbsp;to search docs
              </span>
            </div>
          </div>
          <div className="hero-telemetry">
            <div className="row"><span className="k">p50 latency</span><span className="v acc">184ms</span></div>
            <div className="row"><span className="k">active nodes</span><span className="v">42</span></div>
            <div className="row"><span className="k">models live</span><span className="v">13</span></div>
            <div className="row"><span className="k">free credits</span><span className="v acc">100</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
