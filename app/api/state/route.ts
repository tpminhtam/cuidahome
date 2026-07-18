import { getDB } from "@/lib/db";

export async function GET() {
  const db = getDB();
  return Response.json({
    patient: db.patient,
    users: db.users,
    entries: [...db.entries].sort((a, b) => b.ts.localeCompare(a.ts)),
    appointments: [...db.appointments].sort((a, b) => a.ts.localeCompare(b.ts)),
    messages: db.messages,
    portalOutbox: db.portalOutbox,
    reports: db.reports,
    lessons: [...db.lessons].sort((a, b) => b.ts.localeCompare(a.ts)),
  });
}
