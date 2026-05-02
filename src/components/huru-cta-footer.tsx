"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowUpRightIcon, HuruLogo } from "@/components/huru-icons";

gsap.registerPlugin(ScrollTrigger);

/* ─── Footer link data ─── */

interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

const footerColumns: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Docs", href: "/docs" },
      { label: "Pricing", href: "#pricing" },
      { label: "Models", href: "#models" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API Reference", href: "/docs" },
      { label: "Quickstart", href: "/docs" },
      { label: "SDKs", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Twitter", href: "#" },
      { label: "GitHub", href: "#" },
    ],
  },
];

/* ─── CTA Banner ─── */

export function HuruCtaBanner() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      const scope = sectionRef.current;

      gsap.fromTo(
        scope.querySelectorAll("[data-cta-fade]"),
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: "power3.out",
          duration: 0.7,
          stagger: 0.1,
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
    <section ref={sectionRef} className="border-t border-og-border">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        {/* Label */}
        <p
          data-cta-fade
          className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3"
        >
          Get started
        </p>

        {/* Heading */}
        <h2
          data-cta-fade
          className="mt-4 text-3xl font-bold tracking-tight text-og-black sm:text-4xl lg:text-5xl"
        >
          Start building with Huru today
        </h2>

        {/* Subtitle */}
        <p
          data-cta-fade
          className="mx-auto mt-4 max-w-lg text-base text-og-text-2 sm:text-lg"
        >
          Get your API key in seconds. 10 free credits, no credit card required.
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:mt-10">
          <Link
            href="/dashboard"
            data-cta-fade
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0a0a0a] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all duration-300 hover:bg-[#222] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 sm:w-auto sm:text-[15px]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get your API key
              <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            {/* Hover shimmer */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
          <Link
            href="/docs"
            data-cta-fade
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-og-border bg-og-surface/80 px-6 py-3.5 text-sm font-medium text-og-black shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all duration-300 hover:border-og-border-hover hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:text-[15px]"
          >
            Read the docs
          </Link>
        </div>
      </div>
      <div className="border-t border-og-border" />
    </section>
  );
}

/* ─── Footer ─── */

export function HuruFooter() {
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!footerRef.current) return;

      gsap.fromTo(
        footerRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          ease: "power2.out",
          duration: 0.8,
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 90%",
            once: true,
          },
        },
      );
    },
    { scope: footerRef },
  );

  return (
    <footer
      ref={footerRef}
      className="border-t border-og-border bg-og-surface"
    >
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 sm:pt-16 sm:pb-10 lg:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <HuruLogo className="h-8 w-5 text-og-black" />
              <span className="text-lg font-semibold text-og-black">
                Huru
              </span>
            </div>
            <p className="mt-3 text-sm text-og-text-3">
              AI inference on 0G Network
            </p>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-og-text-3">
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-og-text-2 transition hover:text-og-black"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-og-border pt-6 text-xs text-og-text-3 sm:flex-row sm:justify-between">
          <p>&copy; 2025 Huru. All rights reserved.</p>
          <div className="flex gap-4">
            <Link
              href="#"
              className="transition hover:text-og-black"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="transition hover:text-og-black"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
