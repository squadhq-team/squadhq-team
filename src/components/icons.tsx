/** Einfache Linien-Icons (SVG) für die Navigation, ohne zusätzliche Bibliothek. */
import type { ReactNode } from "react";

function Icon({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
  </Icon>
);
export const CalendarIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);
export const WalletIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h13v4" />
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M16 13.5h2" />
  </Icon>
);
export const TeamIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16 14.2c2.9.3 5 2.7 5 5.8" />
  </Icon>
);
export const ChatIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Icon>
);
export const BellIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);

/** Logo: abgerundetes Quadrat mit Kreuz-Plus und „SQ“-Gefühl, vereinsneutral in Markengrün und Limette. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="9" fill="#0a6e3e" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#b6f24a" strokeWidth="2.6" />
      <path d="M16 10.5v11M10.5 16h11" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
