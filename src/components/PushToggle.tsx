"use client";
/**
 * Push-Benachrichtigungen an diesem Gerät an- oder ausschalten (#26).
 * Registriert den Service Worker (public/sw.js) und meldet das Gerät beim Server an.
 * Auf dem iPhone geht das nur, wenn SquadHQ zum Home-Bildschirm hinzugefügt wurde.
 */
import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "@/app/actions";
import { btn } from "./ui";
import { BellIcon } from "./icons";

type State = "laden" | "nicht-moeglich" | "aus" | "an" | "blockiert";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle({ publicKey, compact = false }: { publicKey: string | null; compact?: boolean }) {
  const [state, setState] = useState<State>("laden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("nicht-moeglich");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blockiert");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "an" : "aus"))
      .catch(() => setState("nicht-moeglich"));
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blockiert" : "aus");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
      setState("an");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("aus");
    } finally {
      setBusy(false);
    }
  }

  if (state === "laden" || (compact && state !== "aus")) return null;
  if (state === "nicht-moeglich")
    return (
      <p className="text-sm text-stone-500">
        Benachrichtigungen gehen in diesem Browser nicht. Auf dem iPhone: SquadHQ über „Teilen → Zum Home-Bildschirm“
        hinzufügen und dort öffnen.
      </p>
    );
  if (state === "blockiert")
    return <p className="text-sm text-stone-500">Benachrichtigungen sind in den Browser-Einstellungen blockiert.</p>;

  if (compact)
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-white">
        <BellIcon className="h-7 w-7 shrink-0 text-accent" />
        <p className="flex-1 text-sm">Erinnerungen und neue Termine direkt aufs Handy bekommen?</p>
        <button
          onClick={enable}
          disabled={busy}
          className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-ink"
        >
          Aktivieren
        </button>
      </div>
    );

  return state === "an" ? (
    <button onClick={disable} disabled={busy} className={btn.secondary}>
      Benachrichtigungen ausschalten
    </button>
  ) : (
    <button onClick={enable} disabled={busy} className={btn.primary}>
      Benachrichtigungen aktivieren
    </button>
  );
}
