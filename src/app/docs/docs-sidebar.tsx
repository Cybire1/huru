"use client";

import { useEffect, useState } from "react";

type SidebarSection = {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
};

const sections: SidebarSection[] = [
  { id: "quickstart", label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "models", label: "Models" },
  {
    id: "billing",
    label: "Billing",
    children: [
      { id: "credits", label: "Credits" },
      { id: "consumer-billing", label: "Consumer billing" },
      { id: "consumer-billing-headers", label: "Headers" },
    ],
  },
  {
    id: "api-reference",
    label: "API reference",
    children: [
      { id: "chat-completions", label: "Chat completions" },
      { id: "transcriptions", label: "Transcriptions" },
      { id: "consumers-list", label: "List consumers" },
      { id: "consumers-detail", label: "Consumer detail" },
      { id: "consumers-checkout", label: "Consumer checkout" },
      { id: "usage", label: "Usage" },
      { id: "requests", label: "Requests" },
      { id: "verification", label: "Verification" },
      { id: "billing-checkout", label: "Billing checkout" },
      { id: "projects", label: "Projects" },
    ],
  },
  {
    id: "guides",
    label: "Guides",
    children: [
      { id: "idempotency", label: "Idempotency" },
      { id: "streaming", label: "Streaming" },
      { id: "rate-limits", label: "Rate limits" },
      { id: "errors", label: "Errors" },
    ],
  },
];

function getAllIds(): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    ids.push(section.id);
    if (section.children) {
      for (const child of section.children) {
        ids.push(child.id);
      }
    }
  }
  return ids;
}

export function DocsSidebar() {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const ids = getAllIds();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="flex flex-col gap-1 text-[13px]">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col">
          <a
            href={`#${section.id}`}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeId === section.id
                ? "bg-og-surface-2 text-og-black"
                : "text-og-text-3 hover:text-og-text"
            }`}
          >
            {section.label}
          </a>
          {section.children && (
            <div className="ml-3 flex flex-col border-l border-og-border pl-3 pt-1">
              {section.children.map((child) => (
                <a
                  key={child.id}
                  href={`#${child.id}`}
                  className={`rounded-md px-2 py-1 transition-colors ${
                    activeId === child.id
                      ? "text-og-black font-medium"
                      : "text-og-text-3 hover:text-og-text"
                  }`}
                >
                  {child.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
