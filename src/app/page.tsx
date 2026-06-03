"use client";

import { HuruNavbar } from "@/components/huru-navbar";
import { HuruHero } from "@/components/huru-hero";
import { HuruTicker } from "@/components/huru-ticker";
import { HuruQuickstart } from "@/components/huru-quickstart";
import { HuruSequence } from "@/components/huru-sequence";
import { HuruManifesto } from "@/components/huru-manifesto";
import { HuruDepartures } from "@/components/huru-models-marquee";
import { HuruPricing } from "@/components/huru-pricing";
import { HuruCtaMonument } from "@/components/huru-cta-footer";
import { HuruFooter } from "@/components/huru-footer";
import { HuruReveal } from "@/components/huru-reveal";

export default function Home() {
  return (
    <>
      <HuruNavbar />
      <HuruReveal />
      <HuruHero />
      <HuruTicker />

      <section className="section" id="quickstart" data-reveal>
        <div className="container">
          <div className="eyebrow-row">
            <span className="idx">01 ·</span>
            <b>Quickstart</b>
            <span>2 endpoints</span>
          </div>
          <div className="display" style={{ maxWidth: "16ch" }}>
            Three lines to <em>verified AI.</em>
          </div>
          <HuruQuickstart />
        </div>
      </section>

      <div data-reveal><HuruSequence /></div>
      <div data-reveal><HuruManifesto /></div>
      <div data-reveal><HuruDepartures /></div>
      <div data-reveal><HuruPricing /></div>
      <HuruCtaMonument />
      <HuruFooter />
    </>
  );
}
