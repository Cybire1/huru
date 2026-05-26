"use client";

import Link from "next/link";
import { Icon } from "./huru-icons";

const COLUMNS = [
  {
    h: "Product",
    links: [
      ["Models", "/#models"],
      ["Pricing", "/#pricing"],
      ["Features", "/#manifesto"],
      ["Status", "#"],
      ["Changelog", "#"],
    ],
  },
  {
    h: "Developers",
    links: [
      ["Docs", "/docs"],
      ["API reference", "/docs#reference"],
      ["Quickstart", "/#quickstart"],
      ["SDKs", "#"],
      ["CLI", "#"],
    ],
  },
  {
    h: "Company",
    links: [
      ["About", "#"],
      ["Blog", "#"],
      ["Careers", "#"],
      ["Press", "#"],
      ["Contact", "#"],
    ],
  },
  {
    h: "Legal",
    links: [
      ["Terms", "#"],
      ["Privacy", "#"],
      ["Security", "#"],
      ["DPA", "#"],
      ["Acceptable use", "#"],
    ],
  },
];

export function HuruFooter() {
  return (
    <footer className="foot">
      <div className="container" style={{ padding: 0 }}>
        <div className="foot-grid">
          {COLUMNS.map((c, i) => (
            <div key={i} className="foot-col">
              <h4>{c.h}</h4>
              <ul>
                {c.links.map(([label, href], j) => (
                  <li key={j}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="foot-bottom">
          <span>&copy; 2026 HURU LABS &middot; INFERENCE, ATTESTED &middot; ALL SYSTEMS OPERATIONAL</span>
          <div className="foot-socials">
            <a href="#" aria-label="GitHub"><Icon.Github /></a>
            <a href="#" aria-label="X"><Icon.Twitter /></a>
            <a href="#" aria-label="Discord"><Icon.Discord /></a>
          </div>
        </div>
      </div>
      <div className="foot-monument">
        huru<span style={{ color: "var(--acc)", WebkitTextFillColor: "var(--acc)" }}>&middot;</span>
      </div>
    </footer>
  );
}
