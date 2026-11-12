/**
 * Gleicht den Strafenkatalog des Demo-Teams mit der Vorlage (prisma/strafenkatalog.ts) ab,
 * ohne Spieler, Termine, Strafen oder das Audit-Log anzufassen. Echte Teams pflegen ihren Katalog
 * selbst in der App (Kasse → Strafenkatalog) und werden hier nicht verändert.
 *
 * Aufruf: npm run db:sync-katalog
 *
 * - Regeln mit Position werden über die Position gefunden, Regeln ohne Position über den Titel.
 * - Gefundene Regeln werden aktualisiert, fehlende angelegt.
 * - Alte Regeln, die nicht mehr im Katalog stehen, werden gelöscht. Hängen an ihnen schon Strafen,
 *   werden sie nur deaktiviert, damit die bestehenden Strafen ihren Grund behalten.
 */
import { PrismaClient } from "@prisma/client";
import { STRAFENKATALOG } from "./strafenkatalog";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.team.findFirst({ where: { isDemo: true } });
  if (!demo) throw new Error("Kein Demo-Team gefunden. Erst `npm run db:reset` ausführen.");
  const teamId = demo.id;
  const summary = await prisma.$transaction(async (tx) => {
    const existing = await tx.penaltyRule.findMany({
      where: { teamId },
      include: { _count: { select: { entries: true } } },
    });
    const kept = new Set<string>();
    let created = 0;
    let updated = 0;

    for (const rule of STRAFENKATALOG) {
      const match = existing.find((r) =>
        rule.position !== null ? r.position === rule.position : r.position === null && r.title === rule.title,
      );
      const data = {
        teamId,
        position: rule.position,
        title: rule.title,
        amountCents: rule.amountCents,
        trigger: rule.trigger,
        active: rule.active ?? true,
      };
      if (match) {
        await tx.penaltyRule.update({ where: { id: match.id }, data });
        kept.add(match.id);
        updated++;
      } else {
        await tx.penaltyRule.create({ data });
        created++;
      }
    }

    let deleted = 0;
    let deactivated = 0;
    for (const old of existing.filter((r) => !kept.has(r.id))) {
      if (old._count.entries > 0) {
        await tx.penaltyRule.update({ where: { id: old.id }, data: { active: false } });
        deactivated++;
      } else {
        await tx.penaltyRule.delete({ where: { id: old.id } });
        deleted++;
      }
    }
    return { created, updated, deleted, deactivated };
  });

  console.log(
    `Strafenkatalog abgeglichen: ${summary.updated} aktualisiert, ${summary.created} neu, ${summary.deleted} gelöscht, ${summary.deactivated} deaktiviert (alte Regel mit bestehenden Strafen).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
