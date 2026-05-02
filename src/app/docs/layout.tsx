import type { ReactNode } from "react";
import { HuruNavbar } from "@/components/huru-navbar";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      <div className="mx-auto max-w-[90rem]">
        {/* Top navbar */}
        <div className="px-5 pt-6 sm:px-8">
          <HuruNavbar
            links={[
              { href: "/", label: "Home" },
              { href: "/dashboard", label: "Dashboard" },
              { href: "/docs", label: "Docs" },
            ]}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
