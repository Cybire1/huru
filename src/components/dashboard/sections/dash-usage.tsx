"use client";

import { ChartIcon, ShieldTickIcon } from "@/components/huru-icons";
import {
  BurnRateCard,
  EndpointBarChart,
  UsageLineChart,
  VerificationBadge,
} from "@/components/dashboard/usage-charts";
import { useDash } from "../dash-context";
import { EmptyState, SectionLoader } from "../dash-shared";

export function DashUsage() {
  const {
    projectDetail, detailLoading,
    analytics, analyticsLoading,
    analyticsPage, setAnalyticsPage,
    analyticsEndpointFilter, setAnalyticsEndpointFilter,
    analyticsStatusFilter, setAnalyticsStatusFilter,
  } = useDash();

  if (!projectDetail) {
    if (detailLoading) return <SectionLoader />;
    return <EmptyState icon={ChartIcon} title="No project selected" description="Select a project to see its usage data." />;
  }

  if (analyticsLoading && !analytics) return <SectionLoader />;

  return (
    <>
      {analytics ? (
        <>
          {/* Usage line chart */}
          <div data-huru-card className="dash-card">
            <p className="dash-section-label">Usage (last 30 days)</p>
            <div style={{ marginTop: 16 }}>
              <UsageLineChart data={analytics.daily} />
            </div>
          </div>

          {/* Stats row */}
          <div className="dash-grid-3">
            <div data-huru-card className="dash-card">
              <p className="dash-section-label">By endpoint</p>
              <div style={{ marginTop: 16 }}>
                <EndpointBarChart data={analytics.endpoints} />
              </div>
            </div>

            <div data-huru-card className="dash-card">
              <p className="dash-section-label">TEE verification</p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <VerificationBadge rate={analytics.verification.rate} />
                <p style={{ fontSize: 12, color: "var(--ink-3)" }}>{analytics.verification.verified}/{analytics.verification.total} verified</p>
              </div>
            </div>

            <div data-huru-card className="dash-card">
              <p className="dash-section-label">Credit burn rate</p>
              <div style={{ marginTop: 16 }}>
                <BurnRateCard
                  avgDailyCredits={analytics.burnRate.avgDailyCredits}
                  currentBalance={analytics.burnRate.currentBalance}
                  estimatedDaysRemaining={analytics.burnRate.estimatedDaysRemaining}
                />
              </div>
            </div>
          </div>

          {/* Consumer breakdown */}
          {analytics.consumers.length > 0 && (
            <div data-huru-card className="dash-card">
              <p className="dash-section-label">Top consumers</p>
              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Requests</th>
                      <th>Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.consumers.map((c) => (
                      <tr key={c.email}>
                        <td style={{ color: "var(--ink)" }}>{c.email}</td>
                        <td className="td-mono">{c.requests}</td>
                        <td className="td-mono">{c.creditsUsed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginated request table */}
          <div data-huru-card className="dash-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <p className="dash-section-label">Request history</p>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={analyticsEndpointFilter} onChange={(e) => { setAnalyticsEndpointFilter(e.target.value); setAnalyticsPage(1); }} className="dash-select">
                  <option value="">All endpoints</option>
                  <option value="/v1/chat/completions">Chat</option>
                  <option value="/v1/audio/transcriptions">Audio</option>
                  <option value="/v1/images/generations">Image</option>
                </select>
                <select value={analyticsStatusFilter} onChange={(e) => { setAnalyticsStatusFilter(e.target.value); setAnalyticsPage(1); }} className="dash-select">
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </div>
            {analytics.requests.items.length === 0 ? (
              <p style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>No requests match the current filters.</p>
            ) : (
              <>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {analytics.requests.items.map((req) => (
                    <div key={req.id} style={{ padding: 12, borderRadius: "var(--r)", border: "1px solid var(--line)", transition: "all 0.2s ease", cursor: "default" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--line-2)"; (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ fontSize: 13, color: "var(--ink)" }}>{req.method} {req.endpoint}</p>
                          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                            {req.model} — {req.creditsUsed} cr — {new Date(req.startedAt).toLocaleString()}
                            {req.consumerEmail && <span> — {req.consumerEmail}</span>}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {req.verified && <ShieldTickIcon style={{ width: 14, height: 14, color: "var(--ok)" }} />}
                          <span className={`dash-tag ${req.status === "completed" ? "ok" : "err"}`}>{req.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination */}
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                    {analytics.requests.total} total — page {analytics.requests.page}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" disabled={analyticsPage <= 1}
                      onClick={() => setAnalyticsPage((p) => Math.max(1, p - 1))} className="dash-btn-ghost" style={{ opacity: analyticsPage <= 1 ? 0.4 : 1 }}>
                      Prev
                    </button>
                    <button type="button" disabled={analyticsPage * 20 >= analytics.requests.total}
                      onClick={() => setAnalyticsPage((p) => p + 1)} className="dash-btn-ghost" style={{ opacity: analyticsPage * 20 >= analytics.requests.total ? 0.4 : 1 }}>
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <EmptyState icon={ChartIcon} title="No usage data" description="Make some API requests to see usage breakdown here." />
      )}
    </>
  );
}
