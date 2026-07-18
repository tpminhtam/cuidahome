import { NextRequest } from "next/server";
import { getClient, MODEL } from "@/lib/anthropic";
import { getDB, persist, uid } from "@/lib/db";
import { Lang } from "@/lib/types";

// Care-circle chat (spec §2.2): messages stored in the sender's language and
// rendered translated to each viewer's preference. Translations cached in db.

async function translate(text: string, from: Lang, to: Lang): Promise<string> {
  const client = getClient();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system:
      "Translate the caregiver chat message. Keep tone, emoji, and medical details exact. Output ONLY the translation, no quotes or commentary.",
    messages: [{ role: "user", content: `Translate from ${from} to ${to === "es" ? "Spanish" : "English"}:\n${text}` }],
  });
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : text;
}

export async function GET(req: NextRequest) {
  const viewerLang = (req.nextUrl.searchParams.get("lang") ?? "en") as Lang;
  const db = getDB();
  let changed = false;

  for (const m of db.messages) {
    if (m.lang !== viewerLang && !m.translations?.[viewerLang]) {
      try {
        const t = await translate(m.text, m.lang, viewerLang);
        m.translations = { ...m.translations, [viewerLang]: t };
        changed = true;
      } catch {
        // no key yet — show original text untranslated
      }
    }
  }
  if (changed) persist();

  return Response.json({
    messages: db.messages.map((m) => ({
      ...m,
      display: m.lang === viewerLang ? m.text : m.translations?.[viewerLang] ?? m.text,
      translated: m.lang !== viewerLang && !!m.translations?.[viewerLang],
    })),
    users: db.users,
  });
}

export async function POST(req: NextRequest) {
  const { fromId, text, lang } = (await req.json()) as { fromId: string; text: string; lang: Lang };
  const db = getDB();
  db.messages.push({ id: uid("m"), ts: new Date().toISOString(), fromId, text, lang });
  persist();
  return Response.json({ ok: true });
}
