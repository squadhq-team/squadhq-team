"use client";
/** Einladung teilen: am Handy über das Teilen-Menü (WhatsApp usw.), sonst in die Zwischenablage kopieren. */
import { useState } from "react";
import { btn } from "./ui";

export function ShareButton({ text, url, label = "Einladung teilen" }: { text: string; url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "SquadHQ", text, url });
        return;
      } catch {
        /* abgebrochen: kopieren */
      }
    }
    await navigator.clipboard?.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={share} className={`w-full ${btn.primary}`}>
      {copied ? "✓ Kopiert" : label}
    </button>
  );
}
