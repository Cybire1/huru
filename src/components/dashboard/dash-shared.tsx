import type { SparkIcon } from "@/components/huru-icons";

export function EmptyState({ icon: Icon, title, description, cta }: {
  icon: typeof SparkIcon;
  title: string;
  description: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="dash-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center", borderStyle: "dashed" }}>
      <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--surface-2)" }}>
        <Icon style={{ width: 20, height: 20, color: "var(--ink-3)" }} />
      </div>
      <p style={{ marginTop: 16, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{title}</p>
      <p style={{ marginTop: 4, maxWidth: 280, fontSize: 13, color: "var(--ink-3)" }}>{description}</p>
      {cta && (
        <button type="button" onClick={cta.onClick} className="dash-btn sm" style={{ marginTop: 16 }}>
          {cta.label}
        </button>
      )}
    </div>
  );
}

export function SectionLoader() {
  return (
    <div className="dash-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", borderStyle: "dashed" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--line)", borderTopColor: "var(--acc)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Loading...</p>
      </div>
    </div>
  );
}
