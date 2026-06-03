"use client";

import { type MouseEvent, useCallback, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: "Verified by default",
    body: "Every response carries TEE attestation. Check proof when you need it, skip it when you don't.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    span: "lg:col-span-2",
    label: "Security",
  },
  {
    title: "Standard API keys",
    body: "Bearer tokens. JSON. Request IDs. No wallets, no signing, no provider selection.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    span: "",
    label: "Auth",
  },
  {
    title: "Usage tracking",
    body: "Credits, daily breakdowns, and full request history. No block explorers needed.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 5-6" />
      </svg>
    ),
    span: "",
    label: "Billing",
  },
  {
    title: "OpenAI-compatible",
    body: "Drop-in replacement endpoints. Switch from OpenAI to decentralized compute with one line change.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="14" y1="4" x2="10" y2="20" />
      </svg>
    ),
    span: "lg:col-span-2",
    label: "API",
  },
];

export function HuruMotionPanels() {
  const sectionRef = useRef<HTMLElement | null>(null);

  // Cursor-following spotlight per card
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--spot-x", `${x}px`);
      card.style.setProperty("--spot-y", `${y}px`);
    },
    [],
  );

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      const scope = sectionRef.current;

      // Heading words stagger reveal
      const headingWords = gsap.utils.toArray<HTMLElement>(
        "[data-heading-word]",
        scope,
      );
      if (headingWords.length) {
        gsap.fromTo(
          headingWords,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: "power3.out",
            stagger: 0.1,
            scrollTrigger: {
              trigger: scope.querySelector("[data-section-heading]"),
              start: "top 85%",
              once: true,
            },
          },
        );
      }

      // Cards stagger in
      const cards = gsap.utils.toArray<HTMLElement>(
        "[data-motion-card]",
        scope,
      );
      gsap.fromTo(
        cards,
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: "power3.out",
          duration: 0.8,
          scrollTrigger: {
            trigger: scope,
            start: "top 85%",
            once: true,
          },
          stagger: 0.1,
        },
      );

      // Icon entrance
      const icons = gsap.utils.toArray<HTMLElement>(
        "[data-card-icon]",
        scope,
      );
      if (icons.length) {
        gsap.fromTo(
          icons,
          { scale: 0.6, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(2)",
            stagger: 0.1,
            delay: 0.3,
            scrollTrigger: {
              trigger: scope,
              start: "top 85%",
              once: true,
            },
          },
        );
      }

      // Card index numbers slide in
      const indices = gsap.utils.toArray<HTMLElement>(
        "[data-card-index]",
        scope,
      );
      if (indices.length) {
        gsap.fromTo(
          indices,
          { x: -8, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.4,
            ease: "power3.out",
            stagger: 0.1,
            delay: 0.5,
            scrollTrigger: {
              trigger: scope,
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
      <div data-section-heading className="mb-8 text-center sm:mb-10">
        <p className="overflow-hidden">
          <span
            data-heading-word
            className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3"
          >
            Why Huru
          </span>
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-og-black sm:text-3xl lg:text-4xl">
          <span className="overflow-hidden inline-block">
            <span data-heading-word className="inline-block">
              Built
            </span>
          </span>{" "}
          <span className="overflow-hidden inline-block">
            <span data-heading-word className="inline-block">
              for
            </span>
          </span>{" "}
          <span className="overflow-hidden inline-block">
            <span data-heading-word className="inline-block">
              developers,
            </span>
          </span>
          <br />
          <span className="overflow-hidden inline-block">
            <span data-heading-word className="inline-block">
              not
            </span>
          </span>{" "}
          <span className="overflow-hidden inline-block">
            <span data-heading-word className="inline-block">
              crypto
            </span>
          </span>{" "}
          <span className="overflow-hidden inline-block">
            <span data-heading-word className="inline-block">
              enthusiasts.
            </span>
          </span>
        </h2>
      </div>

      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-3">
        {features.map((card, i) => (
          <article
            key={card.title}
            data-motion-card
            onMouseMove={handleMouseMove}
            className={`group relative overflow-hidden rounded-2xl border border-og-border bg-og-surface p-6 transition-all duration-500 hover:border-og-border-hover sm:p-8 ${card.span}`}
            style={
              {
                "--spot-x": "50%",
                "--spot-y": "0%",
              } as React.CSSProperties
            }
          >
            {/* Cursor-following spotlight */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(600px_circle_at_var(--spot-x)_var(--spot-y),rgba(120,120,120,0.06),transparent_40%)]" />

            {/* Gradient border glow on hover */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 shadow-[inset_0_0_0_1px_rgba(120,120,120,0.15),0_0_20px_rgba(120,120,120,0.04)]" />

            {/* Top row: label + index */}
            <div className="relative flex items-center justify-between mb-6">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-og-text-3">
                <span className="inline-block h-1 w-1 rounded-full bg-current opacity-40" />
                {card.label}
              </span>
              <span
                data-card-index
                className="font-mono text-[11px] tabular-nums text-og-text-3/40"
              >
                0{i + 1}
              </span>
            </div>

            {/* Icon */}
            <div
              data-card-icon
              className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-og-border bg-og-surface-2 text-og-text-2 transition-all duration-500 group-hover:border-og-black group-hover:bg-og-black group-hover:text-white group-hover:shadow-[0_0_20px_rgba(0,0,0,0.12)]"
            >
              {card.icon}
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold tracking-[-0.01em] text-og-black sm:text-xl">
              {card.title}
            </h3>
            <p className="mt-2.5 max-w-md text-sm leading-relaxed text-og-text-2 sm:text-[15px] sm:leading-relaxed">
              {card.body}
            </p>

            {/* Hover arrow */}
            <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-og-text-3 opacity-0 transition-all duration-500 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0">
              <span>Learn more</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </div>

            {/* Bottom edge highlight on hover */}
            <div className="pointer-events-none absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-og-text-3/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </article>
        ))}
      </div>
    </section>
  );
}
