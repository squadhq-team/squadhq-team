/**
 * Hält die Supabase-Sitzung aktuell: läuft vor jeder Seite und erneuert abgelaufene Zugangs-Tokens,
 * damit angemeldete Nutzer nicht nach einer Stunde herausfliegen. Ohne Supabase-Einstellungen tut sie nichts.
 * Muster aus der Supabase-Dokumentation für Next.js (@supabase/ssr).
 */
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // nicht für statische Dateien und Bilder
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
