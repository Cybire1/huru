"use client";

const MODELS = [
  { name: "llama-3.3-70b", kind: "chat", ctx: "128k", lat: 184, status: "live" },
  { name: "llama-3.1-405b", kind: "chat", ctx: "128k", lat: 218, status: "live" },
  { name: "qwen2.5-coder-32b", kind: "chat", ctx: "128k", lat: 142, status: "live" },
  { name: "deepseek-r1", kind: "chat", ctx: "64k", lat: 198, status: "live" },
  { name: "mistral-large-2411", kind: "chat", ctx: "128k", lat: 173, status: "live" },
  { name: "gemma-3-27b", kind: "chat", ctx: "32k", lat: 158, status: "live" },
  { name: "phi-4-medium", kind: "chat", ctx: "16k", lat: 96, status: "live" },
  { name: "command-r-plus", kind: "chat", ctx: "128k", lat: 211, status: "live" },
  { name: "llama-3.2-vision", kind: "chat", ctx: "128k", lat: 240, status: "live" },
  { name: "flux-1.1-pro", kind: "image", ctx: "\u2014", lat: 1840, status: "live" },
  { name: "flux-schnell", kind: "image", ctx: "\u2014", lat: 920, status: "live" },
  { name: "stable-diffusion-3.5", kind: "image", ctx: "\u2014", lat: 2104, status: "live" },
  { name: "sd-xl-turbo", kind: "image", ctx: "\u2014", lat: 480, status: "live" },
];

export function HuruDepartures() {
  return (
    <section className="section" id="models">
      <div className="container">
        <div className="eyebrow-row">
          <span className="idx">04 ·</span>
          <b>Models</b>
          <span>{MODELS.length} live</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div className="display" style={{ maxWidth: "14ch" }}>
            One key. <em>Every model.</em>
          </div>
          <p style={{ color: "var(--ink-2)", maxWidth: "38ch", fontSize: 15 }}>
            Open-weight and frontier models for chat and image — same bearer
            auth, same response shape, same proof attached.
          </p>
        </div>

        <div className="departures">
          <div className="dep-head">
            <span>Kind</span>
            <span>Model</span>
            <span>Context</span>
            <span>Endpoint</span>
            <span>p50</span>
            <span>Status</span>
          </div>
          {MODELS.map((m, i) => (
            <div key={i} className="dep-row">
              <span className={`kind ${m.kind}`}>{m.kind}</span>
              <span className="name">{m.name}</span>
              <span>{m.ctx}</span>
              <span style={{ color: "var(--ink-3)" }}>
                /v1/{m.kind === "chat" ? "chat/completions" : "images/generations"}
              </span>
              <span className="lat">{m.lat}ms</span>
              <span className="status">{m.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
