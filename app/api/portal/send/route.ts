import { NextRequest } from "next/server";
import { getDB, persist, uid } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { to, subject, body, from } = (await req.json()) as { to: string; subject: string; body: string; from?: string };
  const db = getDB();
  db.portalOutbox.push({
    id: uid("pm"),
    ts: new Date().toISOString(),
    to,
    subject,
    body,
    from: from ?? "Maria Alvarez (caregiver proxy)",
  });
  persist();
  return Response.json({ ok: true });
}
