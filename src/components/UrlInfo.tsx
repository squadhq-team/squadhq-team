"use client";
/** Zeigt eine Erfolgs- oder Hinweismeldung aus der Adresse (?info=…) auf jeder Seite, z. B. nach dem Bestätigungslink. */
import { useSearchParams } from "next/navigation";
import { InfoNotice } from "./ui";

export function UrlInfo() {
  const info = useSearchParams().get("info");
  return info ? <InfoNotice message={info} /> : null;
}
