"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useDash } from "./dash-context";

export function DashProjectModal() {
  const { showProjectModal, setShowProjectModal, newProjectName, setNewProjectName, createProject, isPending } = useDash();

  useGSAP(() => {
    if (!showProjectModal) return;
    const modal = document.querySelector("[data-project-modal]");
    if (!modal) return;
    gsap.fromTo(modal, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power3.out" });
  }, { dependencies: [showProjectModal] });

  if (!showProjectModal) return null;

  return (
    <div className="dash-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) { setShowProjectModal(false); setNewProjectName(""); } }}
      onKeyDown={(e) => { if (e.key === "Escape") { setShowProjectModal(false); setNewProjectName(""); } }}
      role="dialog" aria-modal="true" aria-label="Create project" tabIndex={-1}>
      <div data-project-modal className="dash-modal">
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>Create project</h3>
        <p style={{ marginTop: 4, fontSize: 14, color: "var(--ink-2)" }}>Give your project a name. You can change it later.</p>
        <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="My First App" autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && newProjectName.trim()) { void createProject(newProjectName); } }}
          className="dash-input" style={{ marginTop: 16 }} />
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={() => { setShowProjectModal(false); setNewProjectName(""); }} className="dash-btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={() => { void createProject(newProjectName); }}
            disabled={!newProjectName.trim() || isPending} className="dash-btn">
            {isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
