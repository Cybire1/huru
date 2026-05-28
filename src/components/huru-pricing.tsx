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
    name: "Free",
    italic: "explorer",
    usd: 0,
    credits: "200",
    blurb: "Sign up and start building. No card required.",
    features: [
      "200 credits on signup",
      "All endpoints, all models",
      "Test + live keys",
      "TEE-verified inference",
    ],
    cta: "Start free",
  },
  {
    name: "Starter",
    italic: "builder",
    usd: 2,
    credits: "1,000",
    blurb: "Solo devs shipping their first integration.",
    features: [
      "1,000 credits \u00B7 ~1M tokens",
      "All models + image gen",
      "Consumer billing API",
      "Email support",
    ],
    cta: "Get Starter",
    popular: true,
  },
  {
    name: "Pro",
    italic: "team",
    usd: 9,
    credits: "5,000",
    blurb: "Teams in production running real volume.",
    features: [
      "5,000 credits \u00B7 ~5M tokens",
      "Priority routing",
      "Usage exports (CSV / JSON)",
      "Email support \u00B7 24h",
    ],
    cta: "Get Pro",
  },
  {
    name: "Scale",
    italic: "enterprise",
    usd: 99,
    credits: "100,000",
    blurb: "High-volume API and business use.",
    features: [
      "100,000 credits \u00B7 ~100M tokens",
      "Dedicated TEE pools",
      "Slack support \u00B7 4h",
      "99.9% SLA",
      "Volume discounts",
    ],
    cta: "Talk to sales",
  },
];

function fmtPrice(usd: number, cur: string) {
  if (usd === 0) return "Free";
  const c = CURRENCIES[cur];
  const v = usd * c.rate;
  if (cur === "NGN") return c.sym + Math.round(v).toLocaleString();
  return c.sym + v.toFixed(0);
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
              <div className="price">{fmtPrice(p.usd, cur)}<small>{p.usd > 0 ? "one-time" : ""}</small></div>
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
          Economy models (DeepSeek v3): 1 credit/1K tokens · Premium models: up to 8x · Images: 40 credits each.{" "}
          <a style={{ color: "var(--acc)", textDecoration: "underline", textUnderlineOffset: 3 }} href="/docs">Full pricing</a>
        </p>
      </div>
    </section>
  );
}
