/**
 * Hilfen für Server Actions: Formularwerte lesen und einheitlich reagieren.
 * - Erfolg ohne Ziel: Seite bleibt, wird nur aktualisiert (1-Klick-Aktionen springen nicht nach oben)
 * - Erfolg mit Ziel/Meldung: Weiterleitung, Meldung erscheint oben (?info=…)
 * - Fehler: zurück zur aufrufenden Seite, Meldung erscheint oben (?fehler=…), statt die Seite abstürzen zu lassen
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const text = (formData: FormData, key: string) => formData.get(key)?.toString() ?? "";
export const message = (e: unknown) => (e instanceof Error ? e.message : "Unbekannter Fehler.");

/** Nur Pfade innerhalb der App (Schutz vor Weiterleitung auf fremde Seiten). */
export function safePath(value: string | null | undefined): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

/** Adresse mit gesetztem Parameter; alte Meldungen (info/fehler) werden entfernt. */
export function withParam(path: string, key: "info" | "fehler", value: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.delete("info");
  url.searchParams.delete("fehler");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

/** Seite, von der das Formular kam: verstecktes Feld „back“, sonst Referer, sonst `fallback`. */
async function backPath(formData: FormData, fallback: string): Promise<string> {
  const fromField = safePath(text(formData, "back"));
  if (fromField) return fromField;
  const referer = (await headers()).get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      url.searchParams.delete("info");
      url.searchParams.delete("fehler");
      return `${url.pathname}${url.search}`;
    } catch {
      /* ungültiger Referer: Fallback */
    }
  }
  return fallback;
}

export type ActionResult = { to?: string; info?: string } | void;

/** Führt eine Aktion aus und reagiert wie oben beschrieben. */
export async function handle(formData: FormData, fallback: string, fn: () => Promise<ActionResult>): Promise<void> {
  const back = await backPath(formData, fallback);
  let target: string | null = null;
  try {
    const result = await fn();
    if (result?.to || result?.info) {
      target = result.to ?? back;
      if (result.info) target = withParam(target, "info", result.info);
    }
  } catch (e) {
    target = withParam(back, "fehler", message(e));
  }
  revalidatePath("/", "layout");
  if (target) redirect(target);
}
