"use client";

import { useDash } from "./dash-context";
import { sidebarNav } from "./dash-constants";

export function DashMobileTabs() {
  const { activeSection, setActiveSection } = useDash();

  return (
    <div className="dash-mobile-tabs" style={{ display: "flex" }}>
      {sidebarNav.map((item) => (
        <button key={item.key} type="button" onClick={() => setActiveSection(item.key)}
          className={`dash-mobile-tab ${activeSection === item.key ? "active" : ""}`}>
          <item.icon style={{ width: 14, height: 14 }} />
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function DashMobileProjectBar() {
  const {
    overview, selectedProjectId, setSelectedProjectId,
    setShowProjectModal, setNewProjectName, onSignOut,
  } = useDash();

  if (!overview) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }} className="lg-hide">
      <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }} className="scrollbar-hide">
        {overview.projects.map((p) => (
          <button key={p.id} type="button" onClick={() => setSelectedProjectId(p.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: "var(--r-sm)", fontSize: 12, flexShrink: 0, transition: "all 0.2s ease",
              background: selectedProjectId === p.id ? "var(--surface-2)" : "transparent",
              color: selectedProjectId === p.id ? "var(--ink)" : "var(--ink-3)",
              fontWeight: selectedProjectId === p.id ? 500 : 400 }}>
            {selectedProjectId === p.id && <span className="dash-dot ok animate-pulse-dot" />}
            {p.name}
          </button>
        ))}
        <button type="button" onClick={() => { setNewProjectName(""); setShowProjectModal(true); }}
          style={{ padding: "4px 8px", fontSize: 12, color: "var(--ink-3)", flexShrink: 0 }}>+ New</button>
      </div>
      <button type="button" onClick={onSignOut}
        style={{ padding: "4px 8px", fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>
        Sign out
      </button>
    </div>
  );
}
