import { NextRequest } from "next/server";
import { getDB, persist } from "@/lib/db";

export async function GET() {
  const db = getDB();
  return Response.json({ lessons: [...db.lessons].sort((a, b) => b.ts.localeCompare(a.ts)) });
}

// Human-in-the-loop: the family curates the agent's memory.
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const db = getDB();
  db.lessons = db.lessons.filter((l) => l.id !== id);
  persist();
  return Response.json({ ok: true });
}
