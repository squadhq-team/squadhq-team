/**
 * Spielplan-Import: liest Termine aus einer Kalenderdatei (iCalendar, .ics), wie sie z. B. fussball.de
 * oder Google Kalender zum Abonnieren anbieten. Reine Funktion ohne Datenbank, damit sie per Unit-Test prüfbar ist.
 * Unterstützt: VEVENT mit UID, SUMMARY, DTSTART (UTC „Z“, mit TZID oder ohne Zeitzone = deutsche Zeit), LOCATION, DESCRIPTION.
 */

export interface ImportedEvent {
  uid: string;
  title: string;
  startsAt: Date;
  location: string | null;
  description: string | null;
}

/** Zeilen einer ICS-Datei entfalten (Fortsetzungszeilen beginnen mit Leerzeichen oder Tab). */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\;/g, ";").replace(/\\\\/g, "\\").trim();
}

/**
 * Datum aus DTSTART lesen. `toBerlin` rechnet eine Ortszeit (ohne „Z“) als deutsche Zeit um,
 * damit die Funktion selbst keine Zeitzonen-Bibliothek braucht.
 */
function parseIcsDate(value: string, params: string, toBerlin: (local: string) => Date): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", , z] = m;
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
  // Ganztägig (VALUE=DATE) oder Ortszeit: als deutsche Zeit lesen; ganztägige Termine bekommen 12:00 Uhr
  const allDay = /VALUE=DATE(?!-)/i.test(params) || m[4] === undefined;
  return toBerlin(`${y}-${mo}-${d}T${allDay ? "12" : h}:${allDay ? "00" : mi}`);
}

export function parseIcs(text: string, toBerlin: (local: string) => Date): ImportedEvent[] {
  const events: ImportedEvent[] = [];
  let current: Record<string, { value: string; params: string }> | null = null;
  for (const line of unfold(text)) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (current?.DTSTART && current.SUMMARY) {
        const startsAt = parseIcsDate(current.DTSTART.value, current.DTSTART.params, toBerlin);
        if (startsAt && !Number.isNaN(startsAt.getTime())) {
          const title = unescapeText(current.SUMMARY.value);
          events.push({
            uid: current.UID?.value.trim() || `${startsAt.toISOString()}-${title}`,
            title,
            startsAt,
            location: current.LOCATION ? unescapeText(current.LOCATION.value) || null : null,
            description: current.DESCRIPTION ? unescapeText(current.DESCRIPTION.value) || null : null,
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const [name, ...params] = line.slice(0, colon).split(";");
    current[name.toUpperCase()] = { value: line.slice(colon + 1), params: params.join(";") };
  }
  return events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
