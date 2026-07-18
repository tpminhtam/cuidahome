import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getClient, MODEL, noKeyResponse } from "@/lib/anthropic";
import { getDB, persist, uid } from "@/lib/db";
import { evaluateFlags } from "@/lib/thresholds";
import { Category, Entry, Flag } from "@/lib/types";

export const maxDuration = 120;

const LOG_TOOL: Anthropic.Tool = {
  name: "log_entries",
  description:
    "Save one or more structured health log entries extracted from the caregiver's words. Extract EVERY loggable fact in the same call (multiple entries allowed). Use the correct category and its data shape.",
  input_schema: {
    type: "object",
    properties: {
      entries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["symptoms", "blood_pressure", "glucose", "weight", "meals", "bowel", "sleep", "mood", "activity"],
            },
            data: {
              type: "object",
              description:
                "Category-shaped payload. symptoms:{tags[],severity0-10,location,prn_med,prn_times} · blood_pressure:{systolic,diastolic,pulse} · glucose:{value(mg/dL),context:fasting|before_meal|after_meal|bedtime} · weight:{value(lb)} · meals:{meal_type,description,completion_pct:0|25|50|75|100,dietary_flags[],issues[]} · bowel:{count,consistency:formed|loose|constipated} · sleep:{duration_h,quality:restful|restless|very_poor,issues[],nap_minutes} · mood:{score1-5,behaviors[]} · activity:{ambulation_minutes,fall:{occurred,injured,description}}",
            },
            note: { type: "string", description: "Caregiver's own words for this entry, in their original language" },
            note_en: { type: "string", description: "English clinical translation of the note (REQUIRED when note is not English)" },
            observed_at_hours_ago: { type: "number", description: "How many hours ago this was observed (0 = now, 12 = last night). Default 0." },
          },
          required: ["category", "data"],
        },
      },
    },
    required: ["entries"],
  },
};

const FLAG_TOOL: Anthropic.Tool = {
  name: "raise_flag",
  description:
    "Two-tier alerting. severity='urgent' → SHOWN TO THE CAREGIVER: use ONLY for events that truly need medical attention now (fall, chest pain, choking with breathing trouble, unresponsiveness, dangerous medication error, absolutely abnormal vitals). Word it calmly — 'worth telling the care team' — never alarmist. severity='watch' → NEVER shown to the caregiver; a silent note for the doctor's pre-visit report (trends, patterns, possible side effects, mild new symptoms).",
  input_schema: {
    type: "object",
    properties: {
      severity: { type: "string", enum: ["urgent", "watch"] },
      reason: { type: "string" },
      advice: { type: "string", description: "One short, safe, non-prescriptive tip for the caregiver (positioning, hydration, when to call 911). Never medication changes." },
    },
    required: ["severity", "reason"],
  },
};

const LANG_NAME: Record<string, string> = { en: "English", es: "Spanish", zh: "Chinese (Simplified)" };

function systemPrompt(caregiverName: string, lang: string): string {
  const db = getDB();
  const p = db.patient;
  const recent = db.entries.slice(-12).map((e) => `${e.ts.slice(5, 10)} ${e.category}: ${JSON.stringify(e.data)}`).join("\n");
  return `You are CuidaHome's check-in assistant. You help family caregivers log health observations for ${p.name} (${p.age}, ${p.conditions.join("; ")}) by voice in under a minute.

Speaking with: ${caregiverName} (speaking ${LANG_NAME[lang] ?? "English"}). Today: ${new Date().toDateString()}.

MEDICATIONS: ${p.medications.map((m) => m.name + (m.startedRecently ? " (NEW)" : "")).join(", ")}.
CONTEXT FROM LAST DOCTOR VISIT: ${p.lastVisitNote}
ALERT THRESHOLDS: BP high ${p.thresholds.bp.sysHigh}/${p.thresholds.bp.diaHigh}, BP low ${p.thresholds.bp.sysLow}/${p.thresholds.bp.diaLow}, glucose <${p.thresholds.glucose.low} or >${p.thresholds.glucose.high}.
LEARNED CONTEXT (distilled from previous check-ins — apply automatically):
${db.lessons.slice(-12).map((l) => `- [${l.scope}] ${l.text}`).join("\n") || "- (nothing yet)"}
LAST ENTRIES:\n${recent}

RULES
1. Extract EVERY loggable fact into log_entries (one call, many entries). Numbers must be exact; never invent values. Omit any field you don't know — never fill unknowns with 0 or placeholders.
2. If something clinically important is ambiguous (e.g. "his pressure was low" with no number, or a fall where you don't know if he hit his head), ask ONE short clarifying question. Otherwise don't interrogate.
3. raise_flag policy (the physician's own design — follow it exactly): 'urgent' ONLY for events needing medical attention now (fall, chest pain, choking with breathing trouble, unresponsive, dangerous med error, vitals beyond the alert thresholds) — calm wording, "worth telling the care team", never frightening. Everything else noteworthy (dizziness patterns, mild confusion, appetite decline, likely side effects of the NEW meds) → 'watch', which the caregiver never sees; it goes silently into the doctor's pre-visit report. Do NOT deliver watch-level concerns in your spoken reply either — just log and confirm warmly.
4. NEVER diagnose, never tell the caregiver to change/stop/give prescription medication. For emergencies (chest pain >5 min, fall with head strike on aspirin, stroke signs, unresponsive): tell them to call 911 first.
5. Reply in ${LANG_NAME[lang] ?? "English"}, warm and brief: confirm what you logged in one sentence, then at most one question or one safety tip. Max ~45 words. No markdown, no lists — this reply is spoken aloud.
6. If the caregiver's words are not in English, keep note in their language and ALWAYS provide note_en (English clinical translation).`;
}

export async function POST(req: NextRequest) {
  let client;
  try {
    client = getClient();
  } catch {
    return noKeyResponse();
  }

  const { messages, caregiverId, lang } = (await req.json()) as {
    messages: Anthropic.MessageParam[];
    caregiverId: string;
    lang: "en" | "es" | "zh";
  };

  const db = getDB();
  const caregiver = db.users.find((u) => u.id === caregiverId) ?? db.users[0];
  const created: Entry[] = [];
  const flags: Flag[] = [];

  const convo: Anthropic.MessageParam[] = [...messages];
  let replyText = "";

  for (let round = 0; round < 5; round++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      thinking: { type: "adaptive" },
      system: systemPrompt(caregiver.name, lang),
      tools: [LOG_TOOL, FLAG_TOOL],
      messages: convo,
    });

    convo.push({ role: "assistant", content: res.content });

    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    for (const b of res.content) if (b.type === "text") replyText = b.text;

    if (res.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      if (tu.name === "log_entries") {
        const input = tu.input as { entries: { category: Category; data: Record<string, unknown>; note?: string; note_en?: string; observed_at_hours_ago?: number }[] };
        const saved: string[] = [];
        for (const it of input.entries ?? []) {
          const ts = new Date(Date.now() - (it.observed_at_hours_ago ?? 0) * 3600e3).toISOString();
          const autoFlags = evaluateFlags(it.category, it.data as never, db.patient, db.entries);
          const e: Entry = {
            id: uid("e"), ts, createdAt: new Date().toISOString(),
            category: it.category, data: it.data as never,
            note: it.note, noteEn: it.note_en, lang,
            caregiverId: caregiver.id, source: "voice", flags: autoFlags,
          };
          db.entries.push(e);
          created.push(e);
          flags.push(...autoFlags);
          saved.push(`${it.category} saved${autoFlags.length ? ` — AUTO-ALERT: ${autoFlags.map((f) => f.reason).join("; ")}` : ""}`);
        }
        persist();
        results.push({
          type: "tool_result", tool_use_id: tu.id,
          content: saved.length ? saved.join("\n") : "No entries provided.",
        });
      } else if (tu.name === "raise_flag") {
        const f = tu.input as Flag;
        flags.push(f);
        if (created.length) {
          created[created.length - 1].flags.push(f);
          const stored = db.entries.find((e) => e.id === created[created.length - 1].id);
          if (stored) stored.flags = created[created.length - 1].flags;
          persist();
        }
        results.push({ type: "tool_result", tool_use_id: tu.id, content: "Flag recorded and visible to the care circle." });
      } else {
        results.push({ type: "tool_result", tool_use_id: tu.id, content: "Unknown tool", is_error: true });
      }
    }
    convo.push({ role: "user", content: results });
  }

  // continual learning: fire-and-forget reflection distills reusable lessons
  // from this exchange into per-family memory (visible + curatable in /learning)
  reflect(convo, caregiver.id).catch(() => {});

  return Response.json({ reply: replyText, entries: created, flags, messages: convo });
}

async function reflect(convo: Anthropic.MessageParam[], caregiverId: string) {
  const client = getClient();
  const db = getDB();
  const transcript = convo
    .map((m) => {
      const content = typeof m.content === "string"
        ? m.content
        : m.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlockParam).text).join(" ");
      return content ? `${m.role}: ${content}` : "";
    })
    .filter(Boolean)
    .join("\n");

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: `You are CuidaHome's reflection step — the continual-learning pass that runs after each caregiver check-in. Distill AT MOST 2 genuinely reusable lessons that would make FUTURE check-ins better. Good lessons: personal phrases and what they mean (keep the original-language phrase), the patient's evolving baselines, household routines, caregiver preferences. Bad lessons: one-off facts already captured in the log, restatements of existing lessons, medical advice. Most exchanges yield ZERO new lessons — return an empty list unless something is truly reusable.

EXISTING LESSONS (never repeat or rephrase these):
${db.lessons.map((l) => `- ${l.text}`).join("\n") || "- none"}`,
    messages: [{ role: "user", content: `Check-in transcript:\n${transcript}` }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object", additionalProperties: false, required: ["lessons"],
          properties: {
            lessons: {
              type: "array",
              items: {
                type: "object", additionalProperties: false, required: ["scope", "text"],
                properties: {
                  scope: { type: "string", enum: ["language", "baseline", "routine", "preference"] },
                  text: { type: "string", description: "≤30 words, self-contained, useful in future check-ins" },
                },
              },
            },
          },
        },
      },
    },
  });

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return;
  const out = JSON.parse(block.text) as { lessons: { scope: "language" | "baseline" | "routine" | "preference"; text: string }[] };
  for (const l of (out.lessons ?? []).slice(0, 2)) {
    db.lessons.push({ id: uid("l"), ts: new Date().toISOString(), scope: l.scope, text: l.text, source: "reflection", caregiverId });
  }
  if (db.lessons.length > 30) db.lessons = db.lessons.slice(-30);
  if (out.lessons?.length) persist();
}
