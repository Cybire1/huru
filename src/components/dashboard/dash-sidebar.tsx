"use client";

import { useDash } from "./dash-context";
import { sidebarNav } from "./dash-constants";

export function DashSidebar() {
  const {
    overview, activeSection, setActiveSection,
    selectedProjectId, setSelectedProjectId,
    setShowProjectModal, setNewProjectName,
    isPending, status, onSignOut,
  } = useDash();

  if (!overview) return null;

  return (
    <aside className="dash-sidebar" style={{ display: "none" }} id="dash-sidebar">
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12, flex: 1 }}>
        {sidebarNav.map((item) => (
          <button key={item.key} type="button" onClick={() => setActiveSection(item.key)}
            className={`dash-sidebar-btn ${activeSection === item.key ? "active" : ""}`}>
            <item.icon style={{ width: 16, height: 16 }} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Project selector */}
      <div style={{ borderTop: "1px solid var(--line)", padding: 12 }}>
        <p className="dash-section-label" style={{ padding: "0 12px" }}>Projects</p>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {overview.projects.map((p) => (
            <button key={p.id} type="button" onClick={() => setSelectedProjectId(p.id)}
              className={`dash-project-btn ${selectedProjectId === p.id ? "active" : ""}`}>
              {selectedProjectId === p.id && (
                <span className="dash-dot ok animate-pulse-dot" />
              )}
              {p.name}
            </button>
          ))}
          <button type="button" onClick={() => { setNewProjectName(""); setShowProjectModal(true); }}
            disabled={isPending}
            className="dash-project-btn" style={{ color: "var(--ink-3)" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            New project
          </button>
        </div>
        {status && <p style={{ marginTop: 8, padding: "0 12px", fontSize: 12, color: "var(--ink-2)" }}>{status}</p>}
      </div>

      {/* User + sign out */}
      <div style={{ borderTop: "1px solid var(--line)", padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{overview.user.name || overview.user.email.split("@")[0]}</p>
            <p style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{overview.user.email}</p>
          </div>
          <button type="button" onClick={onSignOut} className="dash-btn-ghost" style={{ flexShrink: 0 }}>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
