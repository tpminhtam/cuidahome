import { NextRequest } from "next/server";
import { getDB, persist, uid } from "@/lib/db";
import { evaluateFlags } from "@/lib/thresholds";
import { Category, Entry } from "@/lib/types";

// Manual form logging (spec §2.1) — same threshold engine as the voice agent.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    category: Category;
    data: Record<string, unknown>;
    note?: string;
    caregiverId: string;
    lang?: "en" | "es";
  };
  const db = getDB();
  const flags = evaluateFlags(body.category, body.data as never, db.patient, db.entries);
  const e: Entry = {
    id: uid("e"),
    ts: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    category: body.category,
    data: body.data as never,
    note: body.note,
    lang: body.lang ?? "en",
    caregiverId: body.caregiverId,
    source: "form",
    flags,
  };
  db.entries.push(e);
  persist();
  return Response.json({ entry: e, flags });
}
