"use client";

import React from "react";
import { Icon } from "./huru-icons";

type TokenType = "k" | "s" | "v" | "fn" | "cmt" | "flag";
type Token = string | [TokenType, string];
type Line = Token[];

interface SampleResponse {
  id: string;
  model: string;
  latency_ms: number;
  huru: { verified: boolean; attestation: string; node: string };
  text: string;
}

interface Sample {
  label: string;
  method: string;
  path: string;
  icon: keyof typeof Icon;
  response: SampleResponse;
  curl: Line[];
  python: Line[];
  node: Line[];
}

const SAMPLES: Record<string, Sample> = {
  chat: {
    label: "Chat completions",
    method: "POST",
    path: "/v1/chat/completions",
    icon: "Chat",
    response: {
      id: "chatcmpl_2H7q4xRk9pVnA",
      model: "llama-3.3-70b",
      latency_ms: 184,
      huru: { verified: true, attestation: "tee:sha384:9c4f…b21a", node: "sgx-fra-03" },
      text: "Decentralized compute means inference runs on a network of independent TEE-secured nodes, not a single cloud provider — every response carries a cryptographic attestation you can verify.",
    },
    curl: [
      ["curl https://api.huru.dev/v1/chat/completions \\"],
      ["  -H \"Authorization: Bearer ", ["v", "sk_live_xxx"], "\" \\"],
      ["  -H \"Content-Type: application/json\" \\"],
      ["  -d '{"],
      ["    \"model\": ", ["s", "\"llama-3.3-70b\""], ","],
      ["    \"messages\": [{ \"role\": ", ["s", "\"user\""], ", \"content\": ", ["s", "\"Explain decentralized compute\""], " }],"],
      ["    \"verify\": ", ["v", "true"]],
      ["  }'"],
    ],
    python: [
      [["k", "from"], " huru ", ["k", "import"], " Huru"],
      [],
      ["client = ", ["fn", "Huru"], "(api_key=", ["s", "\"sk_live_xxx\""], ")"],
      [],
      ["resp = client.chat.", ["fn", "create"], "("],
      ["    model=", ["s", "\"llama-3.3-70b\""], ","],
      ["    messages=[{", ["s", "\"role\""], ": ", ["s", "\"user\""], ", ", ["s", "\"content\""], ": ", ["s", "\"Explain decentralized compute\""], "}],"],
      ["    verify=", ["v", "True"], ","],
      [")"],
      [],
      [["fn", "print"], "(resp.choices[0].message.content)"],
      [["fn", "print"], "(resp.huru.", ["flag", "verified"], ")  ", ["cmt", "# → True"]],
    ],
    node: [
      [["k", "import"], " { Huru } ", ["k", "from"], " ", ["s", "\"@huru/sdk\""], ";"],
      [],
      [["k", "const"], " huru = ", ["k", "new"], " ", ["fn", "Huru"], "({ apiKey: ", ["s", "\"sk_live_xxx\""], " });"],
      [],
      [["k", "const"], " resp = ", ["k", "await"], " huru.chat.", ["fn", "create"], "({"],
      ["  model: ", ["s", "\"llama-3.3-70b\""], ","],
      ["  messages: [{ role: ", ["s", "\"user\""], ", content: ", ["s", "\"Explain decentralized compute\""], " }],"],
      ["  verify: ", ["v", "true"], ","],
      ["});"],
      [],
      [["fn", "console.log"], "(resp.huru.", ["flag", "verified"], ");  ", ["cmt", "// → true"]],
    ],
  },
  image: {
    label: "Image generation",
    method: "POST",
    path: "/v1/images/generations",
    icon: "Image",
    response: {
      id: "img_9Lk3Qx7vRn",
      model: "flux-1.1-pro",
      latency_ms: 1840,
      huru: { verified: true, attestation: "tee:sha384:6d2a…0c9f", node: "sgx-sin-02" },
      text: "https://cdn.huru.dev/img/img_9Lk3Qx7vRn.png · 1024×1024 · seed 8210493",
    },
    curl: [
      ["curl https://api.huru.dev/v1/images/generations \\"],
      ["  -H \"Authorization: Bearer ", ["v", "sk_live_xxx"], "\" \\"],
      ["  -H \"Content-Type: application/json\" \\"],
      ["  -d '{"],
      ["    \"model\": ", ["s", "\"flux-1.1-pro\""], ","],
      ["    \"prompt\": ", ["s", "\"A faceted glass flame floating above a desert\""], ","],
      ["    \"size\": ", ["s", "\"1024x1024\""], ","],
      ["    \"verify\": ", ["v", "true"]],
      ["  }'"],
    ],
    python: [
      [["k", "from"], " huru ", ["k", "import"], " Huru"],
      [],
      ["client = ", ["fn", "Huru"], "(api_key=", ["s", "\"sk_live_xxx\""], ")"],
      [],
      ["resp = client.images.", ["fn", "create"], "("],
      ["    model=", ["s", "\"flux-1.1-pro\""], ","],
      ["    prompt=", ["s", "\"A faceted glass flame floating above a desert\""], ","],
      ["    size=", ["s", "\"1024x1024\""], ","],
      ["    verify=", ["v", "True"], ","],
      [")"],
      [],
      [["fn", "print"], "(resp.data[0].url)"],
    ],
    node: [
      [["k", "import"], " { Huru } ", ["k", "from"], " ", ["s", "\"@huru/sdk\""], ";"],
      [],
      [["k", "const"], " huru = ", ["k", "new"], " ", ["fn", "Huru"], "({ apiKey: ", ["s", "\"sk_live_xxx\""], " });"],
      [],
      [["k", "const"], " resp = ", ["k", "await"], " huru.images.", ["fn", "create"], "({"],
      ["  model: ", ["s", "\"flux-1.1-pro\""], ","],
      ["  prompt: ", ["s", "\"A faceted glass flame floating above a desert\""], ","],
      ["  size: ", ["s", "\"1024x1024\""], ","],
      ["  verify: ", ["v", "true"], ","],
      ["});"],
    ],
  },
};

const TOKEN_CLASS: Record<string, string> = {
  k: "tok-key", s: "tok-str", v: "tok-num", fn: "tok-fn",
  cmt: "tok-cmt", flag: "tok-flag",
};

function renderTokens(lines: Line[], lang: string) {
  return lines.map((line, i) => {
    if (!line || line.length === 0) {
      return (
        <div key={i} className="code-line" style={{ height: "1em" }}>
          <span className="line-num">{i + 1}</span>
          <span className="line-content" />
        </div>
      );
    }
    return (
      <div key={i} className="code-line">
        <span className="line-num">{i + 1}</span>
        <span className="line-content">
          {lang === "curl" && i === 0 && <span className="tok-cmt">$ </span>}
          {line.map((tok, j) => {
            if (typeof tok === "string") return <span key={j}>{tok}</span>;
            const [type, text] = tok;
            const cls = TOKEN_CLASS[type] || "";
            return <span key={j} className={cls}>{text}</span>;
          })}
        </span>
      </div>
    );
  });
}

function ResponsePanel({ sample }: { sample: Sample }) {
  const fullText = sample.response.text;
  const [chars, setChars] = React.useState(0);
  const [verified, setVerified] = React.useState(false);
  const [running, setRunning] = React.useState(true);

  React.useEffect(() => {
    if (!running) return;
    setChars(0);
    setVerified(false);
    const t0 = setTimeout(() => {
      const interval = setInterval(() => {
        setChars((c) => {
          if (c >= fullText.length) {
            clearInterval(interval);
            setTimeout(() => setVerified(true), 250);
            setTimeout(() => setRunning(false), 800);
            return c;
          }
          return Math.min(c + Math.ceil(fullText.length / 90), fullText.length);
        });
      }, 18);
      return () => clearInterval(interval);
    }, 280);
    return () => clearTimeout(t0);
  }, [fullText, running]);

  const replay = () => setRunning(true);
  const r = sample.response;

  return (
    <div className={`response${verified ? " verified-flash" : ""}`}>
      <div className="response-head">
        <div className="meta">
          <span className="method-pill">{sample.method}</span>
          <b>{sample.path}</b>
        </div>
        <button className="icon-btn" onClick={replay} title="Replay" aria-label="Replay">
          {running
            ? <span style={{ display: "inline-flex", gap: 3 }}>
                <i style={{ width: 4, height: 4, background: "var(--acc)", borderRadius: 9, animation: "blink .9s steps(2) infinite" }} />
                <i style={{ width: 4, height: 4, background: "var(--acc)", borderRadius: 9, animation: "blink .9s steps(2) infinite .2s" }} />
                <i style={{ width: 4, height: 4, background: "var(--acc)", borderRadius: 9, animation: "blink .9s steps(2) infinite .4s" }} />
              </span>
            : <Icon.Arrow style={{ transform: "rotate(180deg)" }} />}
        </button>
      </div>

      <div className="response-body">
        {running && <div className="scan-line" />}
        <div style={{ color: "rgba(255,255,255,0.35)" }}>{"{"}</div>
        <div style={{ paddingLeft: 14 }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>&quot;id&quot;</span>: <span style={{ color: "#C4B5FD" }}>&quot;{r.id}&quot;</span>,
        </div>
        <div style={{ paddingLeft: 14 }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>&quot;model&quot;</span>: <span style={{ color: "#C4B5FD" }}>&quot;{r.model}&quot;</span>,
        </div>
        <div style={{ paddingLeft: 14 }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>&quot;latency_ms&quot;</span>: <span style={{ color: "#9FE2C8", fontWeight: 600 }}>{r.latency_ms}</span>,
        </div>
        <div style={{ paddingLeft: 14 }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>&quot;huru&quot;</span>: {"{"}
        </div>
        <div style={{ paddingLeft: 28 }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>&quot;verified&quot;</span>:&nbsp;
          {verified
            ? <span className="tok-flag" style={{ fontWeight: 700 }}>true</span>
            : <span style={{ color: "rgba(255,255,255,0.35)" }}>&hellip;</span>},
        </div>
        <div style={{ paddingLeft: 28 }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>&quot;attestation&quot;</span>: <span style={{ color: "#C4B5FD" }}>&quot;{r.huru.attestation}&quot;</span>,
        </div>
        <div style={{ paddingLeft: 28 }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>&quot;node&quot;</span>: <span style={{ color: "#C4B5FD" }}>&quot;{r.huru.node}&quot;</span>
        </div>
        <div style={{ paddingLeft: 14, color: "rgba(255,255,255,0.35)" }}>{"},"}</div>
        <div style={{ paddingLeft: 14 }}>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>&quot;output&quot;</span>:&nbsp;
          <span style={{ color: "#E8E4DE" }}>
            &quot;{fullText.slice(0, chars)}{chars < fullText.length && <span className="cursor" />}&quot;
          </span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</div>
      </div>

      <div className="response-foot">
        {verified
          ? <span className="verified">TEE attested &middot; {r.huru.node}</span>
          : <span>Streaming&hellip;</span>}
        <span style={{ marginLeft: "auto" }}>
          <span style={{ color: "var(--ink-2)" }}>{r.latency_ms}ms</span>
          {" · "}
          <span>1 credit</span>
        </span>
      </div>
    </div>
  );
}

export function HuruQuickstart() {
  const [endpoint, setEndpoint] = React.useState("chat");
  const [lang, setLang] = React.useState("curl");
  const [streamKey, setStreamKey] = React.useState(0);
  const sample = SAMPLES[endpoint];

  const sampleLines =
    lang === "curl" ? sample.curl :
    lang === "python" ? sample.python : sample.node;

  return (
    <div className="qs-grid">
      <div>
        <div className="endpoint-switch" role="tablist" aria-label="Endpoint">
          {Object.entries(SAMPLES).map(([k, v]) => {
            const IconComp = Icon[v.icon];
            return (
              <button
                key={k}
                className={endpoint === k ? "active" : ""}
                onClick={() => { setEndpoint(k); setStreamKey((n) => n + 1); }}
                aria-selected={endpoint === k}
                role="tab"
              >
                <IconComp width={14} height={14} /> {v.label}
              </button>
            );
          })}
        </div>

        <div className="terminal" style={{ marginTop: 16 }}>
          <div className="term-head">
            <div className="term-dots"><i /><i /><i /></div>
            <div className="term-title">api.huru.dev — {sample.path}</div>
            <div style={{ width: 52 }} />
          </div>
          <div className="term-tabs">
            {(["curl", "python", "node"] as const).map((l) => (
              <button
                key={l}
                className={`term-tab ${lang === l ? "active" : ""}`}
                onClick={() => setLang(l)}
              >
                {l === "curl" ? "curl" : l === "python" ? "Python" : "Node.js"}
              </button>
            ))}
          </div>
          <div className="term-body">
            <pre>{renderTokens(sampleLines, lang)}</pre>
          </div>
        </div>
      </div>

      <ResponsePanel key={streamKey + ":" + endpoint} sample={sample} />
    </div>
  );
}
