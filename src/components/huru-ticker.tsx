"use client";

const REQS = [
  { m: "POST", p: "/v1/chat/completions", mdl: "llama-3.3-70b", lat: 184, node: "sgx-fra-03" },
  { m: "POST", p: "/v1/chat/completions", mdl: "qwen2.5-coder-32b", lat: 142, node: "tdx-sin-02" },
  { m: "POST", p: "/v1/images/generations", mdl: "flux-1.1-pro", lat: 1840, node: "sgx-sin-02" },
  { m: "POST", p: "/v1/chat/completions", mdl: "llama-3.1-405b", lat: 218, node: "sgx-fra-03" },
  { m: "POST", p: "/v1/chat/completions", mdl: "deepseek-r1", lat: 198, node: "tdx-iad-04" },
  { m: "POST", p: "/v1/chat/completions", mdl: "mistral-large-2411", lat: 173, node: "sgx-iad-01" },
  { m: "POST", p: "/v1/images/generations", mdl: "stable-diffusion-3.5", lat: 2104, node: "tdx-sin-02" },
  { m: "POST", p: "/v1/chat/completions", mdl: "phi-4-medium", lat: 96, node: "sgx-fra-03" },
  { m: "POST", p: "/v1/chat/completions", mdl: "gemma-3-27b", lat: 158, node: "sgx-iad-01" },
  { m: "POST", p: "/v1/chat/completions", mdl: "command-r-plus", lat: 211, node: "sgx-fra-03" },
  { m: "POST", p: "/v1/images/generations", mdl: "flux-schnell", lat: 920, node: "sgx-iad-01" },
];

function Check() {
  return (
    <span className="check">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 6.5 2 2L9 4" />
      </svg>
    </span>
  );
}

export function HuruTicker() {
  const doubled = [...REQS, ...REQS];
  return (
    <div className="ticker" aria-label="Recent verified requests">
      <div className="ticker-track">
        {doubled.map((r, i) => (
          <span key={i} className="ticker-item">
            <Check />
            <span className="req-method">{r.m}</span>
            <span className="req-path">{r.p}</span>
            <span style={{ color: "var(--ink-3)" }}>&middot;</span>
            <span>{r.mdl}</span>
            <span className="req-latency">{r.lat}ms</span>
            <span className="req-node">{r.node}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
