"use client";

import { useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ChartIcon, KeyIcon, SparkIcon, TerminalIcon } from "@/components/huru-icons";
import { useDash } from "../dash-context";
import { EmptyState, SectionLoader } from "../dash-shared";

gsap.registerPlugin(ScrollTrigger);

export function DashOverview() {
  const { projectDetail, detailLoading, detailStatus, setShowProjectModal, setActiveSection, contentRef } = useDash();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  /* KPI countup animation */
  useGSAP(() => {
    if (!contentRef.current || !projectDetail) return;
    const kpiNums = contentRef.current.querySelectorAll<HTMLElement>("[data-kpi-num]");
    kpiNums.forEach((el) => {
      const target = Number(el.dataset.kpiTarget);
      if (Number.isNaN(target) || target === 0) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => { el.textContent = String(Math.round(obj.val)); },
      });
    });
  }, { scope: contentRef, dependencies: [projectDetail] });

  if (!projectDetail) {
    if (detailLoading) return <SectionLoader />;
    if (detailStatus) return <p style={{ fontSize: 13, color: "var(--ink-2)" }}>{detailStatus}</p>;
    return (
      <EmptyState icon={SparkIcon} title="No project selected" description="Select a project from the sidebar or create a new one to get started."
        cta={{ label: "New project", onClick: () => setShowProjectModal(true) }} />
    );
  }

  const kpis = [
    { label: "Total Requests", value: projectDetail.usage.requests, icon: TerminalIcon },
    { label: "Credits Used", value: projectDetail.usage.creditsUsed, icon: ChartIcon },
    { label: "Balance", value: projectDetail.usage.currentBalance, icon: SparkIcon, warn: projectDetail.usage.currentBalance < 10 },
    { label: "API Key", value: projectDetail.key?.prefix ? `${projectDetail.key.prefix}...` : "none", icon: KeyIcon },
  ];

  return (
    <>
      {/* KPI cards */}
      <div data-huru-card className="dash-grid-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="dash-kpi">
            <div className="kpi-icon">
              <kpi.icon style={{ width: 16, height: 16 }} />
            </div>
            <p className="kpi-label">{kpi.label}</p>
            {typeof kpi.value === "number" ? (
              <p data-kpi-num data-kpi-target={kpi.value} className={`kpi-value${kpi.warn ? " warn" : ""}`}>0</p>
            ) : (
              <p className="kpi-value" style={{ fontSize: 14 }}>{kpi.value}</p>
            )}
          </div>
        ))}
      </div>

      {detailStatus && <p data-huru-card style={{ fontSize: 13, color: "var(--ink-2)" }}>{detailStatus}</p>}

      {/* Usage chart (last 7 days) */}
      {projectDetail.usage.breakdown.length > 0 && (
        <div data-huru-card className="dash-card">
          <p className="dash-section-label">Usage — last 7 days</p>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {projectDetail.usage.breakdown.slice(-7).map((b) => {
              const peak = Math.max(...projectDetail.usage.breakdown.map((r) => r.creditsUsed), 1);
              const w = Math.max(4, Math.round((b.creditsUsed / peak) * 100));
              return (
                <div key={b.date}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)" }}>
                    <span>{b.date}</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{b.requests} req / {b.creditsUsed} cr</span>
                  </div>
                  <div className="dash-bar">
                    <div className="dash-bar-fill" style={{ width: `${w}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent requests (top 5) */}
      <div data-huru-card className="dash-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="dash-section-label">Recent requests</p>
          {projectDetail.requests.length > 5 && (
            <button type="button" onClick={() => setActiveSection("usage")} style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)", cursor: "pointer" }}>
              View all
            </button>
          )}
        </div>
        {projectDetail.requests.length === 0 ? (
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>No requests yet.</p>
        ) : (
          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Credits</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {projectDetail.requests.slice(0, 5).map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className={`dash-dot ${req.status === "completed" ? "ok" : "err"}`} />
                        <span>{req.status}</span>
                      </span>
                    </td>
                    <td className="td-mono">{req.method}</td>
                    <td>{req.endpoint}</td>
                    <td className="td-mono">{req.creditsUsed}</td>
                    <td style={{ color: "var(--ink-3)" }}>{new Date(req.startedAt).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/dashboard/requests/${req.id}`} style={{ fontSize: 12, fontWeight: 500, color: "var(--acc)" }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
