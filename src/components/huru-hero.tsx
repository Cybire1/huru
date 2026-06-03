"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowUpRightIcon, DocumentIcon } from "@/components/huru-icons";

export function HuruHero() {
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!heroRef.current) return;
      const scope = heroRef.current;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Container fades in
      tl.fromTo(
        scope.querySelector("[data-hero-container]"),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        0,
      );

      // Left side: headline letters
      tl.fromTo(
        scope.querySelectorAll("[data-hero-word]"),
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.06 },
        0.35,
      );

      // Left side: separator line
      tl.fromTo(
        scope.querySelector("[data-hero-line]"),
        { scaleX: 0, transformOrigin: "left" },
        { scaleX: 1, duration: 0.6, ease: "power2.inOut" },
        0.7,
      );

      // Left side: subtitle
      tl.fromTo(
        scope.querySelector("[data-hero-sub]"),
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        0.8,
      );

      // Left side: stats
      tl.fromTo(
        scope.querySelectorAll("[data-hero-stat]"),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 },
        0.95,
      );

      // Left side: CTAs
      tl.fromTo(
        scope.querySelectorAll("[data-hero-cta]"),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        1.05,
      );

      // Right side: 3D logo reveal
      tl.fromTo(
        scope.querySelector("[data-hero-logo-3d]"),
        { opacity: 0, scale: 0.7 },
        { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" },
        0.5,
      );
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="relative px-5 pb-8 pt-2 sm:px-8 sm:pb-12 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        {/* Rounded container */}
        <div
          data-hero-container
          className="relative overflow-hidden rounded-2xl bg-og-surface-2 p-6 sm:rounded-3xl sm:p-10 lg:p-14"
        >
          {/* Subtle radial glow */}
          <div className="pointer-events-none absolute top-0 right-0 h-[70%] w-[60%] bg-[radial-gradient(ellipse_at_70%_30%,rgba(120,120,120,0.07)_0%,transparent_70%)]" />

          <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* ─── Left column ─── */}
            <div className="flex flex-col">
              {/* Giant headline */}
              <h1 className="text-[clamp(3.5rem,8vw,7rem)] font-bold leading-[0.9] tracking-[-0.05em] text-og-black">
                <span className="overflow-hidden inline-block">
                  <span data-hero-word className="inline-block">
                    Huru
                  </span>
                </span>
                <sup className="overflow-hidden inline-block">
                  <span
                    data-hero-word
                    className="inline-block text-[0.35em] font-semibold tracking-normal text-og-text-3 align-super"
                  >
                    ai
                  </span>
                </sup>
              </h1>

              {/* Separator */}
              <div
                data-hero-line
                className="mt-6 h-px w-full max-w-md bg-og-border-hover sm:mt-8"
              />

              {/* Subtitle */}
              <p
                data-hero-sub
                className="mt-5 max-w-md text-[15px] leading-relaxed text-og-text-2 sm:mt-6 sm:text-base sm:leading-relaxed"
              >
                Drop-in REST API for decentralized AI compute. Chat
                completions, transcriptions, bearer auth — no wallets required.
              </p>

              {/* Inline stats */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 sm:mt-8">
                {[
                  { value: "< 200ms", label: "Avg latency" },
                  { value: "99.9%", label: "Uptime" },
                  { value: "0", label: "Wallets needed" },
                ].map((s) => (
                  <div
                    key={s.label}
                    data-hero-stat
                    className="flex items-baseline gap-1.5"
                  >
                    <span className="text-lg font-bold tracking-tight text-og-black sm:text-xl">
                      {s.value}
                    </span>
                    <span className="text-xs text-og-text-3">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row">
                <Link
                  href="/dashboard"
                  data-hero-cta
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0a0a0a] px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#222] hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 sm:text-[15px]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get your API key
                    <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
                <Link
                  href="/docs"
                  data-hero-cta
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-og-border bg-og-surface/60 px-6 py-3.5 text-sm font-medium text-og-text backdrop-blur-sm transition-all duration-300 hover:border-og-border-hover hover:bg-og-surface/80 hover:scale-[1.02] active:scale-[0.98] sm:text-[15px]"
                >
                  <DocumentIcon className="h-4 w-4 text-og-text-3 transition-colors group-hover:text-og-text" />
                  Read the docs
                </Link>
              </div>
            </div>

            {/* ─── Right column: cinematic 3D flame ─── */}
            <div
              data-hero-logo-3d
              className="relative flex min-h-[380px] items-center justify-center sm:min-h-[480px] lg:min-h-[560px]"
              style={{ perspective: "1200px" }}
            >
              {/* Deep ambient glow layers */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="absolute h-[500px] w-[500px] rounded-full bg-og-black/[0.03] blur-[120px] animate-[huru-glow-breathe_8s_ease-in-out_infinite] dark:bg-white/[0.04]" />
                <div className="absolute h-[300px] w-[300px] rounded-full bg-og-black/[0.06] blur-[80px] animate-[huru-glow-breathe_6s_ease-in-out_infinite_1s] dark:bg-white/[0.06]" />
                <div className="absolute h-[160px] w-[160px] rounded-full bg-og-black/[0.08] blur-[50px] animate-[huru-glow-breathe_4s_ease-in-out_infinite_0.5s] dark:bg-white/[0.08]" />
              </div>

              {/* Outer orbiting ring — slow */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[340px] w-[340px] animate-[spin_30s_linear_infinite] sm:h-[420px] sm:w-[420px] lg:h-[480px] lg:w-[480px]">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <div key={`o-${deg}`} className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${deg}deg) translateY(-50%)` }}>
                      <div className="h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-og-black/10 animate-[huru-particle-bloom_3s_ease-in-out_infinite] dark:bg-white/15"
                        style={{ animationDelay: `${deg / 360 * 3}s` }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Inner orbiting ring — counter-rotate */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[220px] w-[220px] animate-[spin_18s_linear_infinite_reverse] sm:h-[280px] sm:w-[280px] lg:h-[320px] lg:w-[320px]">
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <div key={`i-${deg}`} className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${deg}deg) translateY(-50%)` }}>
                      <div className="h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-og-black/15 animate-[huru-particle-bloom_2.5s_ease-in-out_infinite] dark:bg-white/20"
                        style={{ animationDelay: `${deg / 360 * 2.5}s` }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Horizontal lens flare streak */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[1px] w-[280px] bg-gradient-to-r from-transparent via-og-black/10 to-transparent animate-[huru-flare_5s_ease-in-out_infinite] dark:via-white/10 sm:w-[360px] lg:w-[420px]" />
              </div>

              {/* 3D rotating flame body */}
              <div className="relative animate-[huru-3d-cinema_8s_cubic-bezier(0.37,0,0.63,1)_infinite]"
                style={{ transformStyle: "preserve-3d" }}>

                {/* Ground reflection */}
                <div className="absolute -bottom-16 left-1/2 h-10 w-56 -translate-x-1/2 rounded-[100%] bg-og-black/8 blur-2xl animate-[huru-shadow-cinema_8s_ease-in-out_infinite] dark:bg-white/8 sm:w-72" />

                {/* Flame SVG — cinematic scale */}
                <svg
                  viewBox="0 0 32 40"
                  fill="none"
                  aria-hidden="true"
                  className="h-64 w-auto sm:h-80 lg:h-[22rem]"
                  style={{ transformStyle: "preserve-3d", filter: "drop-shadow(0 0 60px rgba(0,0,0,0.12))" }}
                >
                  {/* Facet 1 — top left (darkest shadow side) */}
                  <path d="M16 0 L7 16 L16 18 Z" className="animate-[huru-f1_4s_ease-in-out_infinite]">
                    <animate attributeName="fill-opacity" values="0.45;0.7;0.45" dur="4s" repeatCount="indefinite" />
                  </path>
                  {/* Facet 2 — top right (lit face) */}
                  <path d="M16 0 L16 18 L25 16 Z" className="animate-[huru-f2_4s_ease-in-out_infinite_0.2s]">
                    <animate attributeName="fill-opacity" values="0.85;0.55;0.85" dur="4s" begin="0.2s" repeatCount="indefinite" />
                  </path>
                  {/* Facet 3 — mid left */}
                  <path d="M7 16 L4 26 L16 26 L16 18 Z" className="animate-[huru-f3_4s_ease-in-out_infinite_0.4s]">
                    <animate attributeName="fill-opacity" values="0.35;0.6;0.35" dur="4s" begin="0.4s" repeatCount="indefinite" />
                  </path>
                  {/* Facet 4 — mid right (bright) */}
                  <path d="M25 16 L16 18 L16 26 L28 26 Z" className="animate-[huru-f4_4s_ease-in-out_infinite_0.6s]">
                    <animate attributeName="fill-opacity" values="0.75;0.45;0.75" dur="4s" begin="0.6s" repeatCount="indefinite" />
                  </path>
                  {/* Facet 5 — bottom left (deepest shadow) */}
                  <path d="M4 26 L8 34 L14 40 L16 30 L16 26 Z" className="animate-[huru-f5_4s_ease-in-out_infinite_0.8s]">
                    <animate attributeName="fill-opacity" values="0.2;0.45;0.2" dur="4s" begin="0.8s" repeatCount="indefinite" />
                  </path>
                  {/* Facet 6 — bottom right */}
                  <path d="M28 26 L16 26 L16 30 L18 40 L24 34 Z" className="animate-[huru-f6_4s_ease-in-out_infinite_1s]">
                    <animate attributeName="fill-opacity" values="0.55;0.3;0.55" dur="4s" begin="1s" repeatCount="indefinite" />
                  </path>

                  {/* All facets use currentColor */}
                  <style>{`
                    svg path { fill: currentColor; }
                  `}</style>
                </svg>

                {/* Micro-vibration overlay — gives that cinematic instability feel */}
                <div className="absolute inset-0 animate-[huru-micro-shake_0.15s_linear_infinite]" />
              </div>

              {/* Rising ember particles */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                {[
                  { x: -40, delay: 0, dur: 3, size: 2 },
                  { x: 20, delay: 0.8, dur: 3.5, size: 1.5 },
                  { x: -15, delay: 1.6, dur: 2.8, size: 2.5 },
                  { x: 35, delay: 0.4, dur: 3.2, size: 1 },
                  { x: -30, delay: 2, dur: 3.8, size: 2 },
                  { x: 10, delay: 1.2, dur: 2.6, size: 1.5 },
                  { x: 45, delay: 0.6, dur: 3.4, size: 1 },
                  { x: -5, delay: 1.8, dur: 3, size: 2 },
                ].map((p, i) => (
                  <div
                    key={`ember-${i}`}
                    className="absolute rounded-full bg-og-black/15 dark:bg-white/20"
                    style={{
                      width: p.size,
                      height: p.size,
                      left: `calc(50% + ${p.x}px)`,
                      bottom: "30%",
                      animation: `huru-ember-rise ${p.dur}s ease-out infinite`,
                      animationDelay: `${p.delay}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
