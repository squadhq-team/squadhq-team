/**
 * TSVK-Strafenkatalog 2026/27 (TSV Kronshagen 1. Herren) als Demo-Daten für PenaltyRule (REQ-PEN-01).
 * Quelle und Erläuterung: docs/anforderungen/strafenkatalog-tsvk-2026-27.md
 *
 * - `position` ist im Schema eindeutig. Unterpositionen (5A/5B, 13A–C) haben deshalb `position: null`
 *   und tragen die Unterposition im Titel.
 * - Pos. 8 hat den Trigger UNEXCUSED_ABSENCE (Training), Pos. 9 den Trigger UNEXCUSED_GAME (Spiel, Turnier):
 *   Die PenaltyEngine schlägt bei unentschuldigtem Fehlen je nach Termin-Typ genau diese Regel vor (#47).
 * - Der Zahlungsverzug hat den Trigger LATE_FEE: Daraus bucht die App die Mahngebühr automatisch (#52).
 * - Jedes neue Team bekommt diesen Katalog als Vorlage und kann ihn danach selbst pflegen.
 * - Pos. 1 und 2 sind Sachstrafen (1 Kasten) ohne Geldbetrag, daher 0 € und deaktiviert (Phase 2).
 */
import type { RuleLike } from "../src/domain/penalties";

export interface CatalogRule {
  position: number | null;
  title: string;
  amountCents: number;
  trigger: RuleLike["trigger"];
  active?: boolean;
}

export const STRAFENKATALOG: CatalogRule[] = [
  { position: 1, title: "Rauchen und Alkohol im Trikot (1 Kasten)", amountCents: 0, trigger: "MANUAL", active: false },
  {
    position: 2,
    title: "Handyklingeln während der Besprechung (1 Kasten)",
    amountCents: 0,
    trigger: "MANUAL",
    active: false,
  },
  {
    position: 3,
    title: "Vergessen persönlicher Gegenstände zum Spiel (je Stück)",
    amountCents: 200,
    trigger: "MANUAL",
  },
  {
    position: 4,
    title: "Liegenlassen persönlicher Gegenstände nach Spiel/Training (je Stück)",
    amountCents: 200,
    trigger: "MANUAL",
  },
  {
    position: null,
    title: "5A Nicht-Tragen der Ausrüstung zum Spiel: Präsentationsanzug + rotes Polo-Shirt (je Stück)",
    amountCents: 200,
    trigger: "MANUAL",
  },
  {
    position: null,
    title: "5B Nicht-Tragen der Ausrüstung zum Spiel: Aufwärmshirt, Aufwärmpullover, Regenjacke (je Stück)",
    amountCents: 200,
    trigger: "MANUAL",
  },
  { position: 6, title: "Nicht-Tragen der Trainingsklamotten (je Stück)", amountCents: 200, trigger: "MANUAL" },
  { position: 7, title: "Nicht-Ausführen der Ämter/Aufgaben", amountCents: 500, trigger: "MANUAL" },
  { position: 8, title: "Unentschuldigtes Fehlen beim Training", amountCents: 2000, trigger: "UNEXCUSED_ABSENCE" },
  { position: 9, title: "Unentschuldigtes Fehlen beim Spiel", amountCents: 4000, trigger: "UNEXCUSED_GAME" },
  { position: 10, title: "Gelbe Karte wegen unsportlichen Verhaltens", amountCents: 700, trigger: "MANUAL" },
  { position: 11, title: "Gelb-Rote Karte wegen unsportlichen Verhaltens", amountCents: 2000, trigger: "MANUAL" },
  { position: 12, title: "Rote Karte wegen unsportlichen Verhaltens", amountCents: 4000, trigger: "MANUAL" },
  {
    position: null,
    title: "13A Verspätung (nicht rechtzeitig angesagt) unter 7 Minuten",
    amountCents: 200,
    trigger: "LATE",
  },
  {
    position: null,
    title: "13B Verspätung (nicht rechtzeitig angesagt) über 7 Minuten",
    amountCents: 500,
    trigger: "LATE",
  },
  {
    position: null,
    title: "13C Verspätung (nicht rechtzeitig angesagt) über 20 Minuten",
    amountCents: 1000,
    trigger: "LATE",
  },
  { position: null, title: "Zahlungsverzug: Erhöhung je verspätete Woche", amountCents: 500, trigger: "LATE_FEE" },
];
