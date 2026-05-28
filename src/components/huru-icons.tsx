"use client";

import React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

export const Icon = {
  Shield: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3 4 6v6c0 4.5 3 7.8 8 9 5-1.2 8-4.5 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Key: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="8" cy="14" r="4" />
      <path d="m10.8 11.2 9.4-9.4M16.3 5.7l3 3M14 8l3 3" />
    </svg>
  ),
  Bolt: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  ),
  Chart: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 21h18" />
      <path d="M7 21V10M12 21V4M17 21v-7" />
    </svg>
  ),
  Code: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
    </svg>
  ),
  Globe: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  Layers: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5M3 18l9 5 9-5" />
    </svg>
  ),
  Arrow: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Sun: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
    </svg>
  ),
  Moon: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  ),
  Copy: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  ),
  Mic: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  ),
  Image: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  ),
  Chat: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12a8 8 0 1 1-3.5-6.6L21 4l-1 4.2A7.9 7.9 0 0 1 21 12Z" />
    </svg>
  ),
  Hamburger: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <path d="M19 19 5 5M19 5 5 19" />
    </svg>
  ),
  Github: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.6.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.5-1.3.1-2.8 0 0 .9-.3 2.8 1a9.7 9.7 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .6 1.5.2 2.5.1 2.8.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4-1.3 6.8-5.1 6.8-9.6C22 6.6 17.5 2 12 2Z" />
    </svg>
  ),
  Twitter: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M18.3 3h3.3l-7.2 8.2L23 21h-6.7l-5.2-6.8L5.1 21H1.8l7.7-8.8L1 3h6.9l4.7 6.2L18.3 3Zm-1.2 16h1.8L7 5H5l12.1 14Z" />
    </svg>
  ),
  Discord: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M19.5 5.6A17 17 0 0 0 15.2 4l-.2.4a13 13 0 0 0-6 0L8.8 4A17 17 0 0 0 4.5 5.6C1.8 9.6 1 13.5 1.4 17.4a17.4 17.4 0 0 0 5.2 2.6l1.1-1.8a11 11 0 0 1-1.8-.9c.2-.1.3-.2.4-.3a12.4 12.4 0 0 0 11.4 0c.1.1.2.2.4.3-.6.3-1.2.6-1.8.9l1.1 1.8a17.4 17.4 0 0 0 5.2-2.6c.5-4.5-.7-8.4-3-11.8ZM8.5 14.8a2 2 0 0 1-1.9-2.1 2 2 0 0 1 1.9-2.1 2 2 0 0 1 1.9 2.1 2 2 0 0 1-1.9 2.1Zm7 0a2 2 0 0 1-1.9-2.1 2 2 0 0 1 1.9-2.1 2 2 0 0 1 1.9 2.1 2 2 0 0 1-1.9 2.1Z" />
    </svg>
  ),
  Sparkle: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" opacity=".5" />
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Search: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  ),
};

// Legacy exports for backwards compat with dashboard pages
type DashIconProps = { className?: string; style?: React.CSSProperties };

export function HuruLogo({ className, style }: DashIconProps) {
  return (
    <svg className={className} style={style} viewBox="-100 -110 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="huru-logo-g" x1="0" y1="-110" x2="0" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--acc-bright, #E0D2FF)" />
          <stop offset="60%" stopColor="var(--acc, #B59CFF)" />
          <stop offset="100%" stopColor="var(--acc-deep, #6A4FE0)" />
        </linearGradient>
      </defs>
      <path d="M 0,-95 L 28,-50 L 58,15 L 38,75 L 0,95 L -38,75 L -58,15 L -28,-50 Z" fill="url(#huru-logo-g)" />
      <g stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M 0,-95 L 0,95" />
      </g>
    </svg>
  );
}

export function ArrowUpRightIcon({ className, style }: DashIconProps) {
  return <Icon.Arrow className={className} style={style} />;
}

export function TerminalIcon({ className, style }: DashIconProps) {
  return <Icon.Code className={className} style={style} />;
}

export function KeyIcon({ className, style }: DashIconProps) {
  return <Icon.Key className={className} style={style} />;
}

export function ShieldTickIcon({ className, style }: DashIconProps) {
  return <Icon.Shield className={className} style={style} />;
}

export function ChartIcon({ className, style }: DashIconProps) {
  return <Icon.Chart className={className} style={style} />;
}

export function DocumentIcon({ className, style }: DashIconProps) {
  return <Icon.Layers className={className} style={style} />;
}

export function SparkIcon({ className, style }: DashIconProps) {
  return <Icon.Sparkle className={className} style={style} />;
}
