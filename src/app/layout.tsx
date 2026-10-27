import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { areasFor, getCurrentUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "SquadHQ",
  description: "Trainingszusagen, Strafenkatalog und Teamkasse für Amateurteams",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">
        <header className="bg-emerald-800 text-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              SquadHQ
            </Link>
            {user && (
              <form action={logout} className="flex items-center gap-2 text-sm">
                <span className="hidden sm:inline">
                  {user.name} · {ROLE_LABEL[user.role]}
                </span>
                <button className="rounded-lg bg-white/15 px-3 py-1 hover:bg-white/25">Abmelden</button>
              </form>
            )}
          </div>
          {user && (
            <nav className="mx-auto flex max-w-3xl gap-1 px-4 pb-2 text-sm">
              {areasFor(user.role).map((a) => (
                <Link key={a.href} href={a.href} className="rounded-lg px-3 py-1 hover:bg-white/15">
                  {a.label}
                </Link>
              ))}
            </nav>
          )}
        </header>
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
