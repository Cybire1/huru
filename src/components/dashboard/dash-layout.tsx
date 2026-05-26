"use client";

import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DocumentIcon, HuruLogo } from "@/components/huru-icons";
import { useDash } from "./dash-context";
import { DashSidebar } from "./dash-sidebar";
import { DashMobileTabs, DashMobileProjectBar } from "./dash-mobile-nav";
import { DashProjectModal } from "./dash-project-modal";
import { DashOverview } from "./sections/dash-overview";
import { DashApiKeys } from "./sections/dash-api-keys";
import { DashUsage } from "./sections/dash-usage";
import { DashBilling } from "./sections/dash-billing";
import { DashPlayground } from "./sections/dash-playground";
import type { DashboardSection } from "./dash-types";

gsap.registerPlugin(ScrollTrigger);

const sectionComponents: Record<DashboardSection, React.ComponentType> = {
  overview: DashOverview,
  "api-keys": DashApiKeys,
  usage: DashUsage,
  billing: DashBilling,
  playground: DashPlayground,
};

export function DashLayout() {
  const { overview, activeSection, selectedProjectId, contentRef, panelRef, projectDetail, sessionReady } = useDash();

  const selectedProject = overview?.projects.find((p) => p.id === selectedProjectId);
  const SectionComponent = sectionComponents[activeSection];

  /* Card fade-in animation on section / detail change */
  useGSAP(() => {
    if (!contentRef.current) return;
    const cards = contentRef.current.querySelectorAll("[data-huru-card]");
    if (!cards.length) return;
    gsap.fromTo(cards, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.06 });
  }, { scope: contentRef, dependencies: [activeSection, projectDetail, overview, sessionReady] });

  return (
    <main ref={panelRef} className="dash-main">
      {/* Top bar */}
      <header className="dash-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <HuruLogo style={{ width: 20, height: 20, color: "var(--ink)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Huru</span>
              <span style={{ padding: "2px 6px", borderRadius: 999, background: "var(--acc-tint)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--acc)" }}>Beta</span>
            </Link>
            {selectedProject && (
              <>
                <span style={{ color: "var(--ink-3)" }}>/</span>
                <span style={{ fontSize: 13, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedProject.name}</span>
              </>
            )}
          </div>
          <Link href="/docs" className="dash-btn-ghost">
            <DocumentIcon style={{ width: 14, height: 14 }} />
            Docs
          </Link>
        </div>
      </header>

      <DashMobileTabs />
      <DashMobileProjectBar />

      <div style={{ display: "flex", flex: 1 }}>
        <DashSidebar />

        {/* Content area */}
        <div ref={contentRef} className="dash-content">
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionComponent />
          </div>
        </div>
      </div>

      <DashProjectModal />

      <style>{`
        @media (min-width: 1024px) {
          #dash-sidebar { display: flex !important; }
          .dash-mobile-tabs { display: none !important; }
          .lg-hide { display: none !important; }
        }
        @media (max-width: 1023px) {
          #dash-sidebar { display: none !important; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
