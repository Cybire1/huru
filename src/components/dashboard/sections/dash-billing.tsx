"use client";

import { ArrowUpRightIcon } from "@/components/huru-icons";
import { creditPacks } from "../dash-constants";
import { useDash } from "../dash-context";
import { EmptyState, SectionLoader } from "../dash-shared";

export function DashBilling() {
  const { projectDetail, detailLoading, detailStatus, topUp } = useDash();

  if (!projectDetail) {
    if (detailLoading) return <SectionLoader />;
    return <EmptyState icon={ArrowUpRightIcon} title="No project selected" description="Select a project to manage billing and top up credits." />;
  }

  return (
    <>
      <div data-huru-card className="dash-card">
        <p className="dash-section-label">Top up credits</p>
        <div className="dash-grid-3" style={{ marginTop: 16 }}>
          {creditPacks.map((pack) => (
            <button key={pack.packId} type="button" onClick={() => { void topUp(pack.packId); }}
              style={{ padding: 16, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", textAlign: "left", transition: "all 0.2s ease", cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--acc)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{pack.name}</p>
              <p style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 600, color: "var(--acc)" }}>{pack.creditsAwarded}</p>
              <p style={{ fontSize: 11, color: "var(--ink-3)" }}>credits</p>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-2)" }}>{(pack.amountMinor / 100).toFixed(2)} {pack.currency}</p>
                <ArrowUpRightIcon style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
              </div>
            </button>
          ))}
        </div>
        {detailStatus && <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-2)" }}>{detailStatus}</p>}
      </div>

      {/* Purchase history */}
      <div data-huru-card className="dash-card">
        <p className="dash-section-label">Purchase history</p>
        {projectDetail.purchases.length === 0 ? (
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>No purchases yet.</p>
        ) : (
          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Pack</th>
                  <th>Reference</th>
                  <th>Credits</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projectDetail.purchases.map((pu) => (
                  <tr key={pu.id}>
                    <td style={{ color: "var(--ink)" }}>{pu.name}</td>
                    <td className="td-mono" style={{ color: "var(--ink-3)" }}>{pu.reference}</td>
                    <td className="td-mono">{pu.creditsAwarded}</td>
                    <td>
                      <span className={`dash-tag ${
                        pu.status === "credited" ? "ok"
                          : pu.status === "verified" ? "warn"
                          : pu.status === "pending" ? "warn"
                          : "neutral"
                      }`}>
                        {pu.status}
                      </span>
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
