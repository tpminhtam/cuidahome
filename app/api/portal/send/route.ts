import { NextRequest } from "next/server";
import { getDB, persist, uid } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { to, subject, body, from } = (await req.json()) as { to: string; subject: string; body: string; from?: string };
  const db = getDB();

  // idempotency guard: identical subject+body within 90s = the same send
  // (protects against double-clicks and agent retries)
  const dup = db.portalOutbox.find(
    (m) => m.subject === subject && m.body === body && Date.now() - new Date(m.ts).getTime() < 90_000
  );
  if (dup) return Response.json({ ok: true, deduped: true });

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
