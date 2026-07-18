import { resetDB } from "@/lib/db";

export async function POST() {
  resetDB();
  return Response.json({ ok: true });
}
