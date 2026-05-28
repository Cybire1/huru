"use client";

import React from "react";

interface HuruFlameProps {
  size?: number;
  glow?: boolean;
  drift?: boolean;
}

export function HuruFlame({ size = 440, glow = true, drift = true }: HuruFlameProps) {
  const id = React.useId();
  return (
    <div className="flame-stage" style={{ width: size, maxWidth: "100%", height: size, position: "relative" }}>
      {glow && <div className="glow" />}
      <svg
        className="flame"
        viewBox="-100 -110 200 220"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`g1-${id}`} x1="0" y1="-110" x2="0" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--acc-bright)" />
            <stop offset="55%" stopColor="var(--acc)" />
            <stop offset="100%" stopColor="var(--acc-deep)" />
          </linearGradient>
          <linearGradient id={`g2-${id}`} x1="0" y1="-110" x2="0" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--acc-deep)" />
            <stop offset="50%" stopColor="var(--acc)" />
            <stop offset="100%" stopColor="var(--acc-bright)" />
          </linearGradient>
          <linearGradient id={`g3-${id}`} x1="-100" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--acc-bright)" />
            <stop offset="60%" stopColor="var(--acc)" />
            <stop offset="100%" stopColor="var(--acc-deep)" />
          </linearGradient>
          <linearGradient id={`g4-${id}`} x1="-100" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--acc-deep)" />
            <stop offset="40%" stopColor="var(--acc)" />
            <stop offset="100%" stopColor="var(--acc-bright)" />
          </linearGradient>
          <linearGradient id={`g5-${id}`} x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--acc)" />
            <stop offset="100%" stopColor="var(--acc-deep)" />
          </linearGradient>
          <radialGradient id={`g-glow-${id}`} cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--acc-bright)" stopOpacity="0.55" />
            <stop offset="60%" stopColor="var(--acc)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="0" cy="0" r="100" fill={`url(#g-glow-${id})`} />

        <path
          d="M 0,-95 L 28,-50 L 58,15 L 38,75 L 0,95 L -38,75 L -58,15 L -28,-50 Z"
          fill={`url(#g5-${id})`}
          opacity="0.92"
        />

        <polygon className="facet huru-f1" points="0,-95 -28,-50 0,-50" fill={`url(#g1-${id})`} />
        <polygon className="facet huru-f2" points="0,-95 0,-50 28,-50" fill={`url(#g2-${id})`} />
        <polygon className="facet huru-f3" points="-28,-50 -58,15 0,15 0,-50" fill={`url(#g3-${id})`} />
        <polygon className="facet huru-f4" points="28,-50 0,-50 0,15 58,15" fill={`url(#g4-${id})`} />
        <polygon className="facet huru-f5" points="-58,15 -38,75 0,95 0,15" fill={`url(#g4-${id})`} />
        <polygon className="facet huru-f6" points="58,15 0,15 0,95 38,75" fill={`url(#g3-${id})`} />

        <g stroke="var(--acc-bright)" strokeWidth="0.6" strokeLinecap="round" opacity="0.7" fill="none">
          <path d="M 0,-95 L 0,95" />
          <path d="M -28,-50 L 28,-50" />
          <path d="M -58,15 L 58,15" />
        </g>

        <path d="M 0,-95 L 28,-50 L 0,-50 Z" fill="white" opacity="0.16" />
      </svg>
    </div>
  );
}

export function FlameMini({ className = "flame-mini" }: { className?: string }) {
  const id = React.useId();
  return (
    <svg className={className} viewBox="-100 -110 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`m-${id}`} x1="0" y1="-110" x2="0" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--acc-bright)" />
          <stop offset="60%" stopColor="var(--acc)" />
          <stop offset="100%" stopColor="var(--acc-deep)" />
        </linearGradient>
      </defs>
      <path
        d="M 0,-95 L 28,-50 L 58,15 L 38,75 L 0,95 L -38,75 L -58,15 L -28,-50 Z"
        fill={`url(#m-${id})`}
      />
      <g stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M 0,-95 L 0,95" />
      </g>
    </svg>
  );
}
