import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { Suspense } from "react";
import Link from "next/link";
import { UrlInfo } from "@/components/UrlInfo";
import { BottomNav, TopNav } from "@/components/Nav";
import { Avatar } from "@/components/ui";
import { Logo } from "@/components/icons";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { getTeamName } from "@/services/teamService";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SquadHQ",
  description: "Termine, Zusagen, Strafenkatalog und Teamkasse für Amateurteams",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SquadHQ", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

/** Rahmen aller Seiten: Kopfzeile mit Team und Profil, Navigation (oben am Computer, unten am Handy). */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const teamName = user?.teamId ? await getTeamName(user.teamId) : null;
  const inTeam = Boolean(teamName);
  return (
    <html lang="de" className={`${inter.variable} ${barlow.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
            <Link href={user ? (inTeam ? "/start" : "/willkommen") : "/"} className="flex min-w-0 items-center gap-2">
              <Logo className="h-8 w-8 shrink-0" />
              <span className="min-w-0">
                <span className="display block text-xl">SquadHQ</span>
                {teamName && <span className="block truncate text-xs leading-tight text-stone-500">{teamName}</span>}
              </span>
            </Link>
            {inTeam && <TopNav />}
            {user && (
              <Link
                href="/profil"
                className="flex items-center gap-2 rounded-full py-0.5 pl-2 hover:bg-stone-100"
                aria-label="Mein Profil"
              >
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
                <Avatar name={user.name} size="sm" />
              </Link>
            )}
          </div>
        </header>
        <main className={`mx-auto max-w-3xl space-y-4 px-4 py-5 ${inTeam ? "pb-safe" : ""}`}>
          <Suspense>
            <UrlInfo />
          </Suspense>
          {children}
        </main>
        {inTeam && <BottomNav />}
      </body>
    </html>
  );
}
