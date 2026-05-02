"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HuruGeometrySection } from "@/components/huru-geometry-section";
import { HuruMotionPanels } from "@/components/huru-motion-panels";
import { HuruNavbar } from "@/components/huru-navbar";
import { HuruHero } from "@/components/huru-hero";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!mainRef.current) return;
      const scope = mainRef.current;

      // Footer: fade in
      const footer = scope.querySelector("[data-footer]");
      if (footer) {
        gsap.fromTo(
          footer,
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: {
              trigger: footer,
              start: "top 95%",
              once: true,
            },
          },
        );
      }
    },
    { scope: mainRef },
  );

  return (
    <main ref={mainRef} className="relative flex-1 w-full overflow-x-hidden">
      <div className="relative mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-12">
        <HuruNavbar />
      </div>

      <HuruHero />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-16 pb-12 sm:gap-28 sm:pb-20">

          {/* Geometric illustrations */}
          <HuruGeometrySection />

          {/* Features bento */}
          <HuruMotionPanels />

          {/* Footer */}
          <footer data-footer className="flex flex-col items-center gap-3 border-t border-og-border pt-6 pb-4 text-xs text-og-text-3 sm:flex-row sm:justify-between sm:gap-0 sm:pt-8">
            <span>Huru — AI inference on 0G</span>
            <div className="flex gap-5">
              <Link href="/docs" className="transition hover:text-og-black">Docs</Link>
              <Link href="/dashboard" className="transition hover:text-og-black">Dashboard</Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
