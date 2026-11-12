"use client";
/**
 * Navigation (#45): unten am Handy (Daumen-Reichweite, wie bei SpielerPlus), oben am Computer.
 * Fünf feste Bereiche für alle Rollen; was jemand darin tun darf, regeln die Seiten (REQ-SEC-01).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, ChatIcon, HomeIcon, TeamIcon, WalletIcon } from "./icons";

const AREAS = [
  { href: "/start", label: "Start", Icon: HomeIcon },
  { href: "/termine", label: "Termine", Icon: CalendarIcon },
  { href: "/kasse", label: "Kasse", Icon: WalletIcon },
  { href: "/team", label: "Team", Icon: TeamIcon },
  { href: "/chat", label: "Chat", Icon: ChatIcon },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function TopNav() {
  const path = usePathname();
  return (
    <nav className="hidden gap-1 md:flex" aria-label="Hauptnavigation">
      {AREAS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(path, href) ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            isActive(path, href) ? "bg-ink text-white" : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="bottom-safe fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {AREAS.map(({ href, label, Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  active ? "text-ink" : "text-stone-400"
                }`}
              >
                <span className={`rounded-full px-3 py-0.5 ${active ? "bg-accent" : ""}`}>
                  <Icon className="h-6 w-6" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
