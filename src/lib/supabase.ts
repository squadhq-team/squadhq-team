/**
 * Verbindung zu Supabase Auth (Anmeldung, Registrierung, Passwort zurücksetzen).
 * Die Sitzung liegt in Cookies, die Supabase selbst signiert und verwaltet; @supabase/ssr liest und schreibt sie.
 *
 * Benötigte Umgebungsvariablen (nur auf dem Server, nicht im Browser):
 * - SUPABASE_URL       z. B. https://<projekt>.supabase.co
 * - SUPABASE_ANON_KEY  „anon public“-Key aus Supabase → Project Settings → API
 * Fehlen sie, startet die App zwar, aber niemand kann sich anmelden (die Startseite zeigt einen Hinweis).
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

/** Supabase-Client für Server Components, Server Actions und Route Handler; null, wenn nicht eingerichtet. */
export async function createSupabaseServerClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // In Server Components dürfen keine Cookies gesetzt werden; das Erneuern übernimmt src/middleware.ts.
        }
      },
    },
  });
}
