"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "./huru-icons";

const CURRENCIES: Record<string, { sym: string; rate: number; code: string }> = {
  NGN: { sym: "\u20A6", rate: 1400, code: "NGN" },
  USD: { sym: "$", rate: 1, code: "USD" },
};

const PLANS = [
  {
    name: "Starter",
    italic: "starter",
    usd: 0.36,
    credits: "100",
    blurb: "Try it out. A few conversations.",
    features: [
      "100 credits \u00B7 ~0.1M tokens",
      "All endpoints, all models",
      "Test + live keys",
      "TEE-verified inference",
    ],
    cta: "Start free",
  },
  {
    name: "Builder",
    italic: "builder",
    usd: 1.80,
    credits: "1,400",
    blurb: "Solo devs and small teams shipping.",
    features: [
      "Everything in Starter",
      "1.4M tokens",
      "Consumer billing API",
      "Email support \u00B7 24h",
    ],
    cta: "Get Builder",
    popular: true,
  },
  {
    name: "Growth",
    italic: "growth",
    usd: 8.98,
    credits: "5,000",
    blurb: "Teams in production running real volume.",
    features: [
      "Everything in Builder",
      "5M tokens",
      "Priority routing",
      "Usage exports (CSV / JSON)",
    ],
    cta: "Get Growth",
  },
  {
    name: "Scale",
    italic: "scale",
    usd: 89.81,
    credits: "25,000",
    blurb: "High-volume API and business use.",
    features: [
      "Everything in Growth",
      "25M tokens",
      "Dedicated TEE pools",
      "Slack support \u00B7 4h",
      "99.9% SLA",
    ],
    cta: "Talk to sales",
  },
];

function fmtPrice(usd: number, cur: string) {
  const c = CURRENCIES[cur];
  const v = usd * c.rate;
  if (cur === "NGN") return c.sym + Math.round(v).toLocaleString();
  return c.sym + v.toFixed(2);
}

export function HuruPricing() {
  const [cur, setCur] = React.useState("USD");
  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="eyebrow-row">
          <span className="idx">05 ·</span>
          <b>Pricing</b>
          <span>credits never expire</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div className="display" style={{ maxWidth: "14ch" }}>
            Pay for what you <em>ship.</em>
          </div>
          <div className="currency-row">
            {Object.keys(CURRENCIES).map((k) => (
              <button key={k} onClick={() => setCur(k)} className={cur === k ? "active" : ""}>
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="pricing-rail">
          {PLANS.map((p, i) => (
            <div key={i} className={`plan ${p.popular ? "popular" : ""}`}>
              <div className="lbl">
                <b>{String(i + 1).padStart(2, "0")} · {p.name}</b>
                {p.popular && <span className="pop">Popular</span>}
              </div>
              <div className="name">For <em>{p.italic}s</em></div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.5 }}>{p.blurb}</p>
              <div className="price">{fmtPrice(p.usd, cur)}<small>one-time</small></div>
              <div className="credits">
                <b>{p.credits}</b> credits · <span style={{ color: "var(--ink-3)" }}>&asymp; {(parseInt(p.credits.replace(/,/g, "")) * 1000).toLocaleString()} tokens</span>
              </div>
              <ul>
                {p.features.map((f, j) => <li key={j}>{f}</li>)}
              </ul>
              <Link href="/dashboard" className={p.popular ? "btn btn-primary" : "btn btn-ghost"}>
                {p.cta}
                <span className="btn-arrow"><Icon.Arrow width={12} height={12} /></span>
              </Link>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 28, fontSize: 13, color: "var(--ink-3)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
          Need more than Scale? <a style={{ color: "var(--acc)", textDecoration: "underline", textUnderlineOffset: 3 }} href="#contact">Talk to us</a> about volume pricing.
        </p>
      </div>
    </section>
  );
}
