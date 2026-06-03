"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HuruLogo } from "@/components/huru-icons";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
};

const defaultLinks: NavItem[] = [
  { href: "/docs", label: "Docs" },
  { href: "/dashboard", label: "Dashboard" },
];

export function HuruNavbar({
  links = defaultLinks,
  cta = { href: "/dashboard", label: "Get started" },
  current: _current,
}: {
  links?: NavItem[];
  cta?: { href: string; label: string };
  current?: string;
}) {
  void _current;
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Track scroll for shrink effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Animate hover indicator
  useEffect(() => {
    if (!linksRef.current || !indicatorRef.current) return;
    const indicator = indicatorRef.current;
    const linkEls = linksRef.current.querySelectorAll<HTMLAnchorElement>("[data-nav-link]");

    // Determine which link to highlight: hovered > active path
    let targetIdx = hoveredIdx;
    if (targetIdx === null) {
      // Find active link by pathname
      linkEls.forEach((el, i) => {
        const href = el.getAttribute("href") || "";
        if (pathname === href || (href !== "/" && pathname.startsWith(href))) {
          targetIdx = i;
        }
      });
    }

    if (targetIdx !== null && linkEls[targetIdx]) {
      const el = linkEls[targetIdx];
      const parentRect = linksRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      indicator.style.opacity = "1";
      indicator.style.width = `${elRect.width}px`;
      indicator.style.transform = `translateX(${elRect.left - parentRect.left}px)`;
    } else {
      indicator.style.opacity = "0";
    }
  }, [hoveredIdx, pathname]);

  return (
    <nav
      ref={navRef}
      className={`sticky top-4 z-50 mx-auto flex w-fit items-center gap-1 rounded-full border transition-all duration-500 ${
        scrolled
          ? "border-og-border bg-og-surface/80 px-2 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-2xl"
          : "border-og-border bg-og-surface/70 px-3 py-2 shadow-[0_2px_16px_rgba(0,0,0,0.04)] backdrop-blur-xl"
      }`}
    >
      {/* Logo */}
      <Link
        href="/"
        className="mr-0.5 flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors hover:bg-og-border sm:mr-1 sm:gap-2 sm:px-2.5"
      >
        <HuruLogo className={`transition-all duration-500 text-og-black hover:rotate-[8deg] ${scrolled ? "h-5 w-5" : "h-5 w-5 sm:h-6 sm:w-6"}`} />
        <span className="text-[13px] font-semibold text-og-black sm:text-sm">Huru</span>
        <span
          aria-label="Beta"
          className="hidden rounded-[4px] border border-og-border-hover px-1.5 py-[1px] font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-og-text-3 sm:inline-block"
        >
          beta
        </span>
      </Link>

      {/* Separator — hidden on very small screens */}
      <div className="mx-0.5 hidden h-4 w-px bg-og-border animate-huru-sep-pulse sm:mx-1 sm:block" />

      {/* Links with sliding indicator — hidden below sm */}
      <div
        ref={linksRef}
        className="relative hidden items-center sm:flex"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Sliding pill indicator */}
        <div
          ref={indicatorRef}
          className="pointer-events-none absolute top-0 left-0 h-full rounded-full bg-og-border opacity-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        />

        {links.map((link, i) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              data-nav-link
              onMouseEnter={() => setHoveredIdx(i)}
              className={`relative z-10 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 sm:px-3.5 ${
                isActive
                  ? "text-og-black"
                  : "text-og-text-2 hover:text-og-black"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Separator — hidden below sm */}
      <div className="mx-0.5 hidden h-4 w-px bg-og-border animate-huru-sep-pulse sm:mx-1 sm:block" />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* CTA */}
      <Link
        href={cta.href}
        className={`group relative overflow-hidden rounded-full bg-[#0a0a0a] font-medium text-white transition-all duration-300 hover:bg-[#222] hover:shadow-[0_2px_12px_rgba(0,0,0,0.15)] active:scale-[0.97] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 ${
          scrolled ? "px-3 py-1.5 text-xs sm:px-3.5" : "px-3.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-[13px]"
        }`}
      >
        <span className="relative z-10">{cta.label}</span>
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </Link>
    </nav>
  );
}
