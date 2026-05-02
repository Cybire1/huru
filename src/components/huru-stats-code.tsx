"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { runtimeConfig } from "@/lib/huru/config";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/*  Stats data                                                        */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "< 200ms", label: "Avg latency" },
  { value: "99.9%", label: "Uptime" },
  { value: "10+", label: "Models" },
  { value: "0", label: "Wallets needed" },
] as const;

/* ------------------------------------------------------------------ */
/*  HuruStatsStrip                                                    */
/* ------------------------------------------------------------------ */

export function HuruStatsStrip() {
  const stripRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!stripRef.current) return;
      const cells = gsap.utils.toArray<HTMLElement>(
        "[data-stat-cell]",
        stripRef.current,
      );
      if (!cells.length) return;

      gsap.fromTo(
        cells,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: stripRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );
    },
    { scope: stripRef },
  );

  return (
    <div
      ref={stripRef}
      className="rounded-2xl border border-og-border bg-og-border gap-px overflow-hidden grid grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((s) => (
        <div
          key={s.label}
          data-stat-cell
          className="bg-og-surface text-center px-4 py-6 sm:py-8 transition-colors duration-300 hover:bg-og-surface-2"
        >
          <p className="text-2xl font-bold tracking-tight text-og-black sm:text-3xl">
            {s.value}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.15em] text-og-text-3">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Code samples                                                      */
/* ------------------------------------------------------------------ */

type TabKey = "curl" | "python" | "nodejs";

const tabs: { key: TabKey; label: string }[] = [
  { key: "curl", label: "curl" },
  { key: "python", label: "Python" },
  { key: "nodejs", label: "Node.js" },
];

function getCodeSample(tab: TabKey): string {
  const url = runtimeConfig.appUrl;

  switch (tab) {
    case "curl":
      return `curl ${url}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "huru/chat-1", "messages": [{"role": "user", "content": "Hello"}]}'`;

    case "python":
      return `import requests

r = requests.post("${url}/v1/chat/completions",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={"model": "huru/chat-1", "messages": [{"role": "user", "content": "Hello"}]})
print(r.json()["choices"][0]["message"]["content"])`;

    case "nodejs":
      return `const res = await fetch("${url}/v1/chat/completions", {
  method: "POST",
  headers: { "Authorization": "Bearer YOUR_API_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ model: "huru/chat-1", messages: [{ role: "user", content: "Hello" }] })
});
console.log((await res.json()).choices[0].message.content);`;
  }
}

/* ------------------------------------------------------------------ */
/*  HuruCodeBlock                                                     */
/* ------------------------------------------------------------------ */

export function HuruCodeBlock() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("curl");

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const heading = sectionRef.current.querySelector(
        "[data-code-heading]",
      );
      if (heading) {
        gsap.fromTo(
          heading,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: {
              trigger: heading,
              start: "top 85%",
              once: true,
            },
          },
        );
      }

      const block = sectionRef.current.querySelector("[data-code-block]");
      if (block) {
        gsap.fromTo(
          block,
          { y: 32, opacity: 0, scale: 0.97 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: block,
              start: "top 85%",
              once: true,
            },
          },
        );
      }
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef}>
      {/* Section header */}
      <div data-code-heading className="mb-8 text-center sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">
          Quickstart
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-og-black sm:text-3xl lg:text-4xl">
          Three lines to your first request
        </h2>
      </div>

      {/* Code block */}
      <div
        data-code-block
        className="overflow-hidden rounded-2xl border border-og-code-border bg-og-code-bg"
      >
        {/* Terminal dots */}
        <div className="flex items-center gap-1.5 px-4 pt-3.5">
          <span className="h-3 w-3 rounded-full bg-white/10" />
          <span className="h-3 w-3 rounded-full bg-white/10" />
          <span className="h-3 w-3 rounded-full bg-white/10" />
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-white/10 px-4 pt-3 pb-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                activeTab === t.key
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Code content */}
        <div className="overflow-x-auto p-4 sm:p-6">
          <pre className="text-[13px] leading-relaxed sm:text-sm">
            <code className="font-mono text-white/80 whitespace-pre">
              {getCodeSample(activeTab)}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
