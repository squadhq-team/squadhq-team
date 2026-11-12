"use client";
/** Zeigt Erfolgs- oder Fehlermeldungen aus der Adresse (?info=… / ?fehler=…) oben auf jeder Seite. */
import { useSearchParams } from "next/navigation";
import { ErrorNotice, InfoNotice } from "./ui";

export function UrlInfo() {
  const params = useSearchParams();
  const info = params.get("info");
  const fehler = params.get("fehler");
  return (
    <>
      {fehler && <ErrorNotice message={fehler} />}
      {info && <InfoNotice message={info} />}
    </>
  );
}
