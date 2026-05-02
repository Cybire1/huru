"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/* ─── Model data ─── */

interface ModelCard {
  name: string;
  category: "Chat" | "Code" | "Vision" | "Speech" | "Image";
}

const row1Models: ModelCard[] = [
  { name: "Meta Llama 3.1 70B", category: "Chat" },
  { name: "Mistral Large", category: "Chat" },
  { name: "DeepSeek V3", category: "Code" },
  { name: "Qwen 2.5 72B", category: "Chat" },
  { name: "Nous Hermes", category: "Chat" },
  { name: "Command R+", category: "Chat" },
  { name: "Gemma 2 27B", category: "Chat" },
  { name: "Yi 1.5 34B", category: "Chat" },
];

const row2Models: ModelCard[] = [
  { name: "Whisper Large V3", category: "Speech" },
  { name: "SDXL Turbo", category: "Image" },
  { name: "Llama 3.1 8B", category: "Chat" },
  { name: "Phi-3 Medium", category: "Code" },
  { name: "CodeLlama 34B", category: "Code" },
  { name: "Mixtral 8x7B", category: "Chat" },
  { name: "StableLM 2", category: "Chat" },
  { name: "Llama Guard 3", category: "Vision" },
];

/* ─── Model pill component ─── */

function ModelPill({ model }: { model: ModelCard }) {
  return (
    <div className="inline-flex shrink-0 items-center gap-2.5 rounded-xl border border-og-border bg-og-surface px-5 py-3">
      <span className="text-sm font-medium text-og-black whitespace-nowrap">
        {model.name}
      </span>
      <span className="rounded-full bg-og-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wider text-og-text-3 whitespace-nowrap">
        {model.category}
      </span>
    </div>
  );
}

/* ─── Marquee row ─── */

function MarqueeRow({
  models,
  reverse,
}: {
  models: ModelCard[];
  reverse?: boolean;
}) {
  // Duplicate content so the loop is seamless
  const items = [...models, ...models];

  return (
    <div className="overflow-hidden">
      <div
        className="animate-huru-marquee flex gap-4"
        style={{
          width: "max-content",
          animationDuration: "30s",
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {items.map((model, i) => (
          <ModelPill key={`${model.name}-${i}`} model={model} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main section component ─── */

export function HuruModelsMarquee() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      const scope = sectionRef.current;

      // Entire section fades up on scroll
      gsap.fromTo(
        scope.querySelector("[data-marquee-content]"),
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: scope,
            start: "top 85%",
            once: true,
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="py-20 sm:py-28">
      <div data-marquee-content>
        {/* Section heading */}
        <div className="mb-10 text-center sm:mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">
            Ecosystem
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-og-black">
            Access every model in the network
          </h2>
        </div>

        {/* Marquee rows with edge fade */}
        <div
          className="flex flex-col gap-4"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <MarqueeRow models={row1Models} />
          <MarqueeRow models={row2Models} reverse />
        </div>
      </div>
    </section>
  );
}
