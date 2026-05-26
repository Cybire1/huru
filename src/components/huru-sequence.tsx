"use client";

function Seal() {
  return (
    <svg viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="seal-g" x1="0" y1="-100" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--acc-bright)" />
          <stop offset="1" stopColor="var(--acc-deep)" />
        </linearGradient>
      </defs>
      <circle cx="0" cy="0" r="92" fill="none" stroke="var(--line-2)" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="80" fill="none" stroke="var(--line-2)" strokeWidth="0.8" strokeDasharray="2 4" />
      <circle cx="0" cy="0" r="65" fill="none" stroke="var(--acc)" strokeWidth="0.5" opacity="0.6" />

      <defs>
        <path id="seal-circle" d="M 0,-72 A 72 72 0 1 1 -0.1,-72" />
      </defs>
      <text fontSize="7.5" fontFamily="ui-monospace, monospace" fill="var(--ink-2)" letterSpacing="2">
        <textPath href="#seal-circle" startOffset="0">
          TEE · ATTESTED · SHA-384 · INTEL-TDX · AMD-SEV-SNP · TEE · ATTESTED ·
        </textPath>
      </text>

      <g transform="rotate(45)">
        <polygon points="0,-44 38,0 0,44 -38,0" fill="url(#seal-g)" opacity="0.95" />
        <polygon points="0,-44 38,0 0,0" fill="white" opacity="0.16" />
        <polygon points="0,-44 -38,0 0,0" fill="black" opacity="0.16" />
      </g>
      <text x="0" y="4" textAnchor="middle" fontSize="14" fontFamily="ui-sans-serif" fontWeight="600" fill="var(--ink-on-acc)" letterSpacing="-0.05em">H</text>

      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const x1 = Math.sin(a) * 86, y1 = -Math.cos(a) * 86;
        const x2 = Math.sin(a) * 92, y2 = -Math.cos(a) * 92;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-3)" strokeWidth="0.8" />;
      })}
    </svg>
  );
}

export function HuruSequence() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="eyebrow-row">
          <span className="idx">02 ·</span>
          <b>How it works</b>
          <span>3 steps</span>
        </div>

        <div className="display" style={{ maxWidth: "18ch" }}>
          A request becomes <em>proof.</em>
        </div>

        <div className="seq">
          <div className="seq-row">
            <div className="num">01<sup>KEY</sup></div>
            <div>
              <div className="seq-title">A single <em>bearer token.</em></div>
              <p className="seq-body">
                Sign in, name your project, copy the key. No wallets, no signing,
                no provider selection. The network is a configuration value.
              </p>
            </div>
            <div className="seq-visual">
              <div className="seq-keystamp">
                <div className="ring-stamp" />
                <div className="ring-stamp r2" />
                <div className="ring-stamp r3" />
                <div className="core">
                  <b>sk_live_</b>
                  h2RXk·····qF8
                </div>
              </div>
            </div>
          </div>

          <div className="seq-row">
            <div className="num">02<sup>CALL</sup></div>
            <div>
              <div className="seq-title">Drop in the <em>endpoint.</em></div>
              <p className="seq-body">
                OpenAI-compatible REST. Chat completions, image
                generation. Use any SDK — point its base URL at Huru.
              </p>
            </div>
            <div className="seq-visual">
              <div className="seq-envelope">
                <div className="lbl">POST · request</div>
                <code>
                  <div>{"{"}</div>
                  <div>&nbsp;&nbsp;&quot;model&quot;: <span className="acc">&quot;llama-3.3-70b&quot;</span>,</div>
                  <div>&nbsp;&nbsp;&quot;messages&quot;: [...],</div>
                  <div>&nbsp;&nbsp;&quot;verify&quot;: <span className="acc">true</span></div>
                  <div>{"}"}</div>
                </code>
              </div>
            </div>
          </div>

          <div className="seq-row">
            <div className="num">03<sup>PROOF</sup></div>
            <div>
              <div className="seq-title">The reply carries an <em>attestation.</em></div>
              <p className="seq-body">
                Every response is sealed by a Trusted Execution Environment.
                Inspect the proof when stakes are high. Skip it when they aren&apos;t.
                The cryptography is just there.
              </p>
            </div>
            <div className="seq-visual">
              <div className="seq-seal">
                <div className="seal-glow" />
                <Seal />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
