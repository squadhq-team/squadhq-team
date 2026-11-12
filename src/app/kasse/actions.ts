"use server";
/**
 * Server Actions der Teamkasse: Zahlungen (MVP-5), manuelle Strafen (#46), Storno, Mahngebühr erlassen (#52),
 * Kassenbuch (#53), Beiträge, PayPal-Link (#54), Strafenkatalog pflegen.
 */
import type { CashDirection } from "@prisma/client";
import { assertMember, can } from "@/lib/auth";
import { handle, text } from "@/lib/actionUtils";
import { formatEuro, parseBerlinDateTime, parseEuroToCents } from "@/lib/format";
import type { PaymentMethod } from "@/domain/penalties";
import { addRule, cancelPenalty, createManualPenalty, updateRule } from "@/services/penaltyEngine";
import { addTransaction, cancelTransaction, createFees, recordPayment, setPaypalMe } from "@/services/paymentService";
import { notifyUsers } from "@/services/pushService";

/** REQ-PEN-04 (MVP-5): 1 Klick = ganzer offener Rest, mit Betrag = Teilzahlung. */
export async function payAction(formData: FormData) {
  await handle(formData, "/kasse", async () => {
    const user = await assertMember("kasse.buchen");
    const method = text(formData, "method") as PaymentMethod;
    if (method !== "CASH" && method !== "PAYPAL") throw new Error("Unbekannte Zahlungsart.");
    const amount = text(formData, "amount").trim();
    await recordPayment({
      teamId: user.teamId,
      entryId: text(formData, "entryId"),
      actorId: user.id,
      method,
      amountCents: amount ? parseEuroToCents(amount) : undefined,
    });
  });
}

/** #46: Strafe aus dem Katalog vergeben. Trainer: sofort offen; Betreuer/Kassenwart: Vorschlag an den Trainer. */
export async function manualPenaltyAction(formData: FormData) {
  await handle(formData, "/kasse/strafe", async () => {
    const user = await assertMember("strafen.vergeben");
    const directlyOpen = can(user, "strafen.freigeben");
    const entry = await createManualPenalty({
      teamId: user.teamId,
      actorId: user.id,
      directlyOpen,
      playerId: text(formData, "playerId"),
      ruleId: text(formData, "ruleId"),
      quantity: Number(text(formData, "quantity") || "1"),
      sessionId: text(formData, "sessionId") || undefined,
      note: text(formData, "note"),
    });
    if (directlyOpen)
      await notifyUsers([entry.playerId], {
        title: "Neue Strafe",
        body: `${formatEuro(entry.amountCents)}, bitte innerhalb von 7 Tagen beim Kassenwart zahlen.`,
        url: "/kasse",
      });
    return {
      to: "/kasse",
      info: directlyOpen
        ? "Strafe vergeben, sie steht jetzt in der Kasse."
        : "Vorschlag angelegt. Der Trainer gibt ihn frei.",
    };
  });
}

/** Trainer storniert eine offene Strafe; Kassenwart erlässt eine Mahngebühr (Staffelung nach Absprache). */
export async function cancelPenaltyAction(formData: FormData) {
  await handle(formData, "/kasse", async () => {
    const user = await assertMember();
    if (!can(user, "strafen.freigeben") && !can(user, "kasse.buchen"))
      throw new Error("Keine Berechtigung für diese Aktion.");
    await cancelPenalty(user.teamId, text(formData, "entryId"), user.id, text(formData, "note"));
  });
}

/** #53: Einnahme oder Ausgabe buchen. */
export async function addTransactionAction(formData: FormData) {
  await handle(formData, "/kasse/buchung", async () => {
    const user = await assertMember("kasse.buchen");
    const date = text(formData, "bookedAt");
    await addTransaction({
      teamId: user.teamId,
      actorId: user.id,
      direction: text(formData, "direction") as CashDirection,
      amountCents: parseEuroToCents(text(formData, "amount")),
      description: text(formData, "description"),
      bookedAt: date ? parseBerlinDateTime(`${date}T12:00`) : undefined,
    });
    return { to: "/kasse?ansicht=kassenbuch", info: "Gebucht." };
  });
}

export async function cancelTransactionAction(formData: FormData) {
  await handle(formData, "/kasse?ansicht=kassenbuch", async () => {
    const user = await assertMember("kasse.buchen");
    await cancelTransaction({ teamId: user.teamId, actorId: user.id, transactionId: text(formData, "transactionId") });
  });
}

/** Beitrag für ausgewählte Mitglieder anlegen. */
export async function createFeesAction(formData: FormData) {
  await handle(formData, "/kasse/beitrag", async () => {
    const user = await assertMember("kasse.buchen");
    const due = text(formData, "dueDate");
    const count = await createFees({
      teamId: user.teamId,
      actorId: user.id,
      title: text(formData, "title"),
      amountCents: parseEuroToCents(text(formData, "amount")),
      playerIds: formData.getAll("playerId").map((v) => v.toString()),
      dueDate: due ? parseBerlinDateTime(`${due}T23:59`) : undefined,
    });
    return { to: "/kasse", info: `Beitrag für ${count} ${count === 1 ? "Mitglied" : "Mitglieder"} angelegt.` };
  });
}

/** #54: PayPal.me-Link des Kassenwarts speichern. */
export async function setPaypalAction(formData: FormData) {
  await handle(formData, "/kasse?ansicht=einstellungen", async () => {
    const user = await assertMember("kasse.buchen");
    const team = await setPaypalMe(user.teamId, text(formData, "paypalMe"));
    return {
      info: team.paypalMe
        ? "PayPal-Link gespeichert. Spieler sehen jetzt „Per PayPal zahlen“."
        : "PayPal-Link entfernt.",
    };
  });
}

/** Strafenkatalog pflegen: Regel ändern. */
export async function updateRuleAction(formData: FormData) {
  await handle(formData, "/kasse/katalog", async () => {
    const user = await assertMember("katalog.pflegen");
    await updateRule({
      teamId: user.teamId,
      ruleId: text(formData, "ruleId"),
      title: text(formData, "title"),
      amountCents: parseEuroToCents(text(formData, "amount")),
      active: text(formData, "active") === "on",
    });
    return { info: "Katalog gespeichert. Die Änderung gilt für neue Strafen." };
  });
}

/** Strafenkatalog pflegen: eigene Regel ergänzen. */
export async function addRuleAction(formData: FormData) {
  await handle(formData, "/kasse/katalog", async () => {
    const user = await assertMember("katalog.pflegen");
    await addRule({
      teamId: user.teamId,
      title: text(formData, "title"),
      amountCents: parseEuroToCents(text(formData, "amount")),
    });
    return { info: "Regel ergänzt." };
  });
}
