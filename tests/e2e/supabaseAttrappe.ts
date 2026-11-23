/**
 * Attrappe von Supabase Auth für die Akzeptanztests (Browser-Tests mit Playwright).
 *
 * Die App meldet sich in echt bei Supabase an. Für wiederholbare Tests ohne Internet, ohne echte Konten und ohne
 * E-Mail-Bestätigung beantwortet dieser kleine Server die wenigen Aufrufe, die die App benutzt
 * (Registrieren, Anmelden, Sitzung prüfen, Abmelden, Passwort ändern), so wie Supabase es tun würde.
 * Konten liegen nur im Speicher und sind nach jedem Testlauf weg. Die App selbst wird dafür nicht verändert:
 * Sie bekommt nur SUPABASE_URL auf diesen Server gesetzt (playwright.config.ts).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

type Konto = {
  id: string;
  email: string;
  password: string;
  user_metadata: Record<string, unknown>;
  created_at: string;
};

const konten = new Map<string, Konto>(); // nach E-Mail
const sitzungen = new Map<string, string>(); // Token → Konto-ID

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function nutzer(k: Konto) {
  return {
    id: k.id,
    aud: "authenticated",
    role: "authenticated",
    email: k.email,
    email_confirmed_at: k.created_at,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: k.user_metadata,
    identities: [{ id: k.id, user_id: k.id, provider: "email", identity_data: { sub: k.id, email: k.email } }],
    created_at: k.created_at,
    updated_at: k.created_at,
  };
}

function sitzung(k: Konto) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  // Aufbau wie ein JWT (Kopf.Inhalt.Signatur), damit supabase-js das Token lesen kann; die Signatur prüft niemand
  const accessToken = `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({
    sub: k.id,
    email: k.email,
    role: "authenticated",
    aud: "authenticated",
    exp: expiresAt,
    session_id: randomUUID(),
  })}.attrappe`;
  const refreshToken = randomUUID();
  sitzungen.set(accessToken, k.id);
  sitzungen.set(`refresh:${refreshToken}`, k.id);
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user: nutzer(k),
  };
}

function kontoZuId(id: string | undefined): Konto | undefined {
  if (!id) return undefined;
  return [...konten.values()].find((k) => k.id === id);
}

function antwort(res: ServerResponse, status: number, body?: object) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body ? JSON.stringify(body) : "");
}

async function lesen(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = "";
  for await (const teil of req) text += teil;
  return text ? JSON.parse(text) : {};
}

function fehler(res: ServerResponse, status: number, msg: string) {
  antwort(res, status, { code: status, error_code: "attrappe", msg, error: msg, error_description: msg });
}

async function bearbeiten(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
  const angemeldet = kontoZuId(sitzungen.get(token));

  if (url.pathname === "/auth/v1/health") return antwort(res, 200, { name: "Supabase-Attrappe" });

  if (req.method === "POST" && url.pathname === "/auth/v1/signup") {
    const body = await lesen(req);
    const email = String(body.email ?? "").toLowerCase();
    if (konten.has(email)) return fehler(res, 422, "User already registered");
    if (String(body.password ?? "").length < 6) return fehler(res, 422, "Password should be at least 6 characters");
    const k: Konto = {
      id: randomUUID(),
      email,
      password: String(body.password),
      user_metadata: (body.data as Record<string, unknown>) ?? {},
      created_at: new Date().toISOString(),
    };
    konten.set(email, k);
    return antwort(res, 200, sitzung(k)); // wie Supabase mit abgeschalteter E-Mail-Bestätigung
  }

  if (req.method === "POST" && url.pathname === "/auth/v1/token") {
    const body = await lesen(req);
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const k = kontoZuId(sitzungen.get(`refresh:${String(body.refresh_token)}`));
      return k ? antwort(res, 200, sitzung(k)) : fehler(res, 400, "Invalid Refresh Token");
    }
    const k = konten.get(String(body.email ?? "").toLowerCase());
    if (!k || k.password !== body.password) return fehler(res, 400, "Invalid login credentials");
    return antwort(res, 200, sitzung(k));
  }

  if (url.pathname === "/auth/v1/user") {
    if (!angemeldet) return fehler(res, 401, "invalid JWT");
    if (req.method === "PUT") {
      const body = await lesen(req);
      if (typeof body.password === "string") angemeldet.password = body.password;
      if (body.data) angemeldet.user_metadata = { ...angemeldet.user_metadata, ...(body.data as object) };
    }
    return antwort(res, 200, nutzer(angemeldet));
  }

  if (req.method === "POST" && url.pathname === "/auth/v1/logout") {
    sitzungen.delete(token);
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "POST" && (url.pathname === "/auth/v1/recover" || url.pathname === "/auth/v1/resend")) {
    return antwort(res, 200, {});
  }

  fehler(res, 404, `Attrappe kennt ${req.method} ${url.pathname} nicht`);
}

export function starteSupabaseAttrappe(port: number) {
  const server = createServer((req, res) => {
    bearbeiten(req, res).catch((e) => fehler(res, 500, String(e)));
  });
  server.listen(port, "127.0.0.1");
  return server;
}

// Direkt gestartet (npx tsx tests/e2e/supabaseAttrappe.ts): läuft, bis der Prozess beendet wird
if (process.argv[1]?.endsWith("supabaseAttrappe.ts")) {
  const port = Number(process.env.ATTRAPPE_PORT ?? 54321);
  starteSupabaseAttrappe(port);
  process.stdout.write(`Supabase-Attrappe läuft auf http://127.0.0.1:${port}\n`);
}
