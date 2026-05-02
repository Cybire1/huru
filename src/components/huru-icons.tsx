type IconProps = {
  className?: string;
};

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldTickIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3L20 7V12C20 16.4 16.8 20.1 12 22C7.2 20.1 4 16.4 4 12V7L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KeyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 12L20 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 3H20V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 9L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 2L14 9L21 12L14 15L12 22L10 15L3 12L10 9L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 20V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 20H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 15L11 11L14 13L19 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 3H15L20 8V21H6V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15 3V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 15.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HuruLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 40" fill="none" aria-hidden="true" className={className}>
      {/* Faceted angular flame — 6 prismatic segments, lit from upper-right */}
      <path d="M16 0 L7 16 L16 18 Z" fill="currentColor" fillOpacity="0.65" />
      <path d="M16 0 L16 18 L25 16 Z" fill="currentColor" fillOpacity="0.9" />
      <path d="M7 16 L4 26 L16 26 L16 18 Z" fill="currentColor" fillOpacity="0.5" />
      <path d="M25 16 L16 18 L16 26 L28 26 Z" fill="currentColor" fillOpacity="0.8" />
      <path d="M4 26 L8 34 L14 40 L16 30 L16 26 Z" fill="currentColor" fillOpacity="0.35" />
      <path d="M28 26 L16 26 L16 30 L18 40 L24 34 Z" fill="currentColor" fillOpacity="0.65" />
    </svg>
  );
}

export function TerminalIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9L10 12L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
