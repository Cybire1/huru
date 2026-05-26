"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Icon } from "./huru-icons";
import { FlameMini } from "./huru-flame";

const NAV_ITEMS = [
  { key: "how", label: "How it works", href: "/#how" },
  { key: "manifesto", label: "Features", href: "/#manifesto" },
  { key: "models", label: "Models", href: "/#models" },
  { key: "pricing", label: "Pricing", href: "/#pricing" },
  { key: "docs", label: "Docs", href: "/docs" },
];

interface NavbarProps {
  current?: string;
}

export function HuruNavbar({ current = "home" }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const toggleMode = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <nav className="nav-bar">
      <Link className="nav-brand" href="/">
        <FlameMini />
        <span>Huru</span>
        <span className="beta-pill">Beta</span>
      </Link>
      <div className="nav-mid">
        {NAV_ITEMS.map((it) => (
          <Link
            key={it.key}
            className={`nav-link ${current === it.key ? "active" : ""}`}
            href={it.href}
          >
            {it.label}
          </Link>
        ))}
      </div>
      <div className="nav-right">
        <button className="icon-btn" onClick={toggleMode} aria-label="Toggle theme">
          {theme === "dark" ? <Icon.Sun /> : <Icon.Moon />}
        </button>
        <Link className="btn btn-primary btn-sm" href="/dashboard">
          Get API key
          <span className="btn-arrow"><Icon.Arrow width={12} height={12} /></span>
        </Link>
      </div>
    </nav>
  );
}
