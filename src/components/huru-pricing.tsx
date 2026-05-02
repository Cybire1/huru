"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/* ─── Check icon ─── */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/* ─── Plan data ─── */

interface Plan {
  name: string;
  popular?: boolean;
  price: string;
  subtitle: string;
  features: string[];
  cta: string;
  ctaStyle: "outline" | "solid";
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    subtitle: "to get started",
    features: [
      "10 free credits on signup",
      "All models included",
      "TEE verification",
      "Community support",
    ],
    cta: "Get started",
    ctaStyle: "outline",
  },
  {
    name: "Builder",
    popular: true,
    price: "From $10",
    subtitle: "100 credits",
    features: [
      "Everything in Free",
      "Priority routing",
      "Usage dashboard",
      "Email support",
    ],
    cta: "Buy credits",
    ctaStyle: "solid",
    highlighted: true,
  },
  {
    name: "Pilot",
    price: "From $100",
    subtitle: "1,400 credits",
    features: [
      "Everything in Builder",
      "Volume discounts",
      "Dedicated support",
      "Custom rate limits",
    ],
    cta: "Buy credits",
    ctaStyle: "outline",
  },
];

/* ─── Main section component ─── */

export function HuruPricing() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      const scope = sectionRef.current;

      // Cards stagger fade-up on scroll
      const cards = gsap.utils.toArray<HTMLElement>(
        "[data-pricing-card]",
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
          stagger: 0.12,
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
    <section ref={sectionRef}>
      {/* Section heading */}
      <div className="mb-8 text-center sm:mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">
          Pricing
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-og-black sm:text-3xl lg:text-4xl">
          Simple, credit-based pricing
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-og-text-2 sm:text-[15px]">
          No subscriptions. Buy credits, use them when you want. Start free.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            data-pricing-card
            className={`rounded-2xl border bg-og-surface p-6 sm:p-8 transition-all ${
              plan.highlighted
                ? "border-og-border-hover shadow-[0_8px_30px_rgba(0,0,0,0.08)] lg:scale-[1.02]"
                : "border-og-border"
            }`}
          >
            {/* Plan name + popular badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-og-black">
                {plan.name}
              </span>
              {plan.popular && (
                <span className="inline-flex items-center rounded-full bg-[#0a0a0a] px-2.5 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-[#0a0a0a]">
                  Popular
                </span>
              )}
            </div>

            {/* Price */}
            <div className="mt-4">
              <span className="text-4xl font-bold text-og-black">
                {plan.price}
              </span>
            </div>

            {/* Subtitle */}
            <p className="mt-1 text-sm text-og-text-2">{plan.subtitle}</p>

            {/* Features */}
            <ul className="mt-6 flex flex-col gap-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <CheckIcon className="h-4 w-4 shrink-0 text-og-text-3" />
                  <span className="text-sm text-og-text-2">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href="/dashboard"
              className={`mt-8 block w-full text-center rounded-full px-6 py-3 text-sm font-semibold transition-all ${
                plan.ctaStyle === "solid"
                  ? "bg-[#0a0a0a] text-white hover:bg-[#222] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200"
                  : "border border-og-border text-og-black hover:border-og-border-hover hover:bg-og-surface-2"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
