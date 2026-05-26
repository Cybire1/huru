import Link from "next/link";
import { HuruLogo } from "@/components/huru-icons";

export function DashLoading() {
  return (
    <main className="dash-main">
      <header className="dash-header">
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HuruLogo style={{ width: 24, height: 24, color: "var(--ink)" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Huru</span>
          </Link>
        </div>
      </header>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--line)", borderTopColor: "var(--acc)", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Loading...</p>
        </div>
      </div>
    </main>
  );
}
