/**
 * Tägliche Erinnerung vor der Rückmeldefrist (#26), aufgerufen von Vercel Cron (vercel.json).
 * Geschützt mit CRON_SECRET: Vercel schickt es als „Authorization: Bearer …“ mit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { sendDeadlineReminders } from "@/services/pushService";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ fehler: "Nicht erlaubt" }, { status: 401 });
  const sent = await sendDeadlineReminders();
  return NextResponse.json({ gesendet: sent });
}
