"use client";

import { useState } from "react";
import { ArrowUpRightIcon } from "@/components/huru-icons";
import { creditPacks } from "../dash-constants";
import { useDash } from "../dash-context";
import { EmptyState, SectionLoader } from "../dash-shared";

const USD_PER_NGN = 1 / 1400;

function formatPrice(amountMinor: number, currency: string, mode: "NGN" | "USD") {
  const ngn = amountMinor / 100;
  if (mode === "USD") {
    const usd = ngn * USD_PER_NGN;
    return `$${usd < 10 ? usd.toFixed(2) : Math.round(usd).toString()}`;
  }
  return `₦${ngn.toLocaleString()}`;
}

function ratePerCredit(amountMinor: number, credits: number, mode: "NGN" | "USD") {
  const ngnPerCredit = amountMinor / 100 / credits;
  if (mode === "USD") {
    const usd = ngnPerCredit * USD_PER_NGN;
    return `$${usd.toFixed(4)}`;
  }
  return `₦${ngnPerCredit.toFixed(2)}`;
}

export function DashBilling() {
  const { projectDetail, detailLoading, detailStatus, topUp } = useDash();
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");

  if (!projectDetail) {
    if (detailLoading) return <SectionLoader />;
    return <EmptyState icon={ArrowUpRightIcon} title="No project selected" description="Select a project to manage billing and top up credits." />;
  }

  return (
    <>
      <div data-huru-card className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="dash-section-label">Top up credits</p>
            <p style={{ marginTop: 6, fontSize: 13, color: "var(--ink-2)" }}>
              1 credit ≈ 1,000 tokens of chat &middot; 40 credits per image &middot; credits never expire
            </p>
          </div>
          <div className="currency-row" style={{ flexShrink: 0 }}>
            {(["NGN", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={currency === c ? "active" : ""}
                onClick={() => setCurrency(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="dash-grid-4" style={{ marginTop: 20 }}>
          {creditPacks.map((pack) => (
            <button
              key={pack.packId}
              type="button"
              onClick={() => { void topUp(pack.packId); }}
              style={{
                padding: 20,
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                textAlign: "left",
                transition: "all 0.2s ease",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--acc)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{pack.name}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: "var(--acc)", lineHeight: 1 }}>
                {pack.creditsAwarded.toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: -4 }}>credits</p>
              <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink)", fontWeight: 500 }}>
                  {formatPrice(pack.amountMinor, pack.currency, currency)}
                </p>
                <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                  {ratePerCredit(pack.amountMinor, pack.creditsAwarded, currency)} / credit
                </p>
              </div>
            </button>
          ))}
        </div>
        {detailStatus && (
          <p
            style={{
              marginTop: 16,
              padding: "10px 14px",
              fontSize: 13,
              color: detailStatus.toLowerCase().includes("error") || detailStatus.toLowerCase().includes("could not") || detailStatus.toLowerCase().includes("failed")
                ? "var(--err)"
                : "var(--ink-2)",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r)",
            }}
          >
            {detailStatus}
          </p>
        )}
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
                    <td className="td-mono">{pu.creditsAwarded.toLocaleString()}</td>
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
