import type { ReactNode } from "react";
import { HuruNavbar } from "@/components/huru-navbar";

type NavItem = {
  href: string;
  label: string;
};

type HuruSurfaceFrameProps = {
  navLinks?: NavItem[];
  children: ReactNode;
};

export function HuruSurfaceFrame({
  children,
}: HuruSurfaceFrameProps) {
  return (
    <main className="relative flex-1 w-full max-w-full overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.02),_transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-12">
        <div className="mb-8">
          <HuruNavbar />
        </div>
        <div className="flex flex-col gap-8">{children}</div>
      </div>
    </main>
  );
}
