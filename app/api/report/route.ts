import { getClient, MODEL, noKeyResponse } from "@/lib/anthropic";
import { getDB, persist, uid } from "@/lib/db";
import { BPData, Entry, GlucoseData, PreVisitReport, WeightData } from "@/lib/types";

export const maxDuration = 120;

// Structured-output schema mirroring PreVisitReport (strict-compatible)
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["one_liner", "red_flags", "vitals", "symptom_events", "mood_and_sleep", "nutrition", "medications", "caregiver_observations", "suggested_questions"],
  properties: {
    one_liner: { type: "string", description: "One sentence a physician reads first: the single most important change this period." },
    red_flags: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["severity", "text"],
        properties: { severity: { type: "string", enum: ["urgent", "watch"] }, text: { type: "string" } },
      },
    },
    vitals: {
      type: "object", additionalProperties: false, required: ["blood_pressure", "weight", "glucose"],
      properties: {
        blood_pressure: vitalsShape(), weight: vitalsShape(), glucose: vitalsShape(),
      },
    },
    symptom_events: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["date", "text"],
        properties: { date: { type: "string" }, text: { type: "string" } },
      },
    },
    mood_and_sleep: { type: "string" },
    nutrition: { type: "string" },
    medications: { type: "string" },
    caregiver_observations: { type: "array", items: { type: "string" }, description: "Direct caregiver quotes (English), most clinically telling first" },
    suggested_questions: { type: "array", items: { type: "string" }, description: "3-5 questions the caregiver should ask at this visit" },
  },
} as const;

function vitalsShape() {
  return {
    type: "object", additionalProperties: false, required: ["readings", "summary", "trend"],
    properties: {
      readings: { type: "integer" },
      summary: { type: "string" },
      trend: { type: "string", enum: ["rising", "falling", "stable"] },
    },
  };
}

function digestEntries(entries: Entry[]): string {
  return entries
    .map((e) => {
      const day = e.ts.slice(0, 10);
      const who = e.caregiverId.replace("u_", "");
      const flags = e.flags.length ? ` FLAGS[${e.flags.map((f) => `${f.severity}:${f.reason}`).join(" | ")}]` : "";
      const note = e.noteEn ?? e.note ?? "";
      return `${day} ${e.category} ${JSON.stringify(e.data)}${note ? ` note:"${note}"` : ""} by:${who}${flags}`;
    })
    .join("\n");
}

export async function GET() {
  const db = getDB();
  const latest = db.reports[db.reports.length - 1];
  return Response.json({ report: latest ?? null });
}

export async function POST() {
  let client;
  try {
    client = getClient();
  } catch {
    return noKeyResponse();
  }

  const db = getDB();
  const next = db.appointments.find((a) => !a.completed && new Date(a.ts) > new Date() && a.type === "primary_care");
  const lastVisit = [...db.appointments].filter((a) => a.completed).sort((a, b) => b.ts.localeCompare(a.ts))[0];
  const periodStart = lastVisit?.ts ?? new Date(Date.now() - 14 * 864e5).toISOString();
  const entries = db.entries.filter((e) => e.ts >= periodStart).sort((a, b) => a.ts.localeCompare(b.ts));

  // deterministic stats so numbers never hallucinate
  const bps = entries.filter((e) => e.category === "blood_pressure").map((e) => e.data as BPData);
  const wts = entries.filter((e) => e.category === "weight").map((e) => (e.data as WeightData).value);
  const gls = entries.filter((e) => e.category === "glucose").map((e) => (e.data as GlucoseData).value);
  const stats = {
    bp: bps.length
      ? { n: bps.length, first: `${bps[0].systolic}/${bps[0].diastolic}`, last: `${bps[bps.length - 1].systolic}/${bps[bps.length - 1].diastolic}`, minSys: Math.min(...bps.map((b) => b.systolic)), maxSys: Math.max(...bps.map((b) => b.systolic)) }
      : null,
    weight: wts.length ? { n: wts.length, first: wts[0], last: wts[wts.length - 1], delta: +(wts[wts.length - 1] - wts[0]).toFixed(1) } : null,
    glucose: gls.length ? { n: gls.length, min: Math.min(...gls), max: Math.max(...gls) } : null,
  };

  const p = db.patient;
  const prompt = `Generate the pre-visit summary for this appointment.

PATIENT: ${p.name}, ${p.age} (DOB ${p.dob}). Conditions: ${p.conditions.join("; ")}.
MEDICATIONS: ${p.medications.map((m) => `${m.name} ${m.sig}${m.startedRecently ? " (STARTED AT LAST VISIT)" : ""}`).join("; ")}.
CONTEXT FROM LAST VISIT: ${p.lastVisitNote}
APPOINTMENT: ${next ? `${next.provider} (${next.specialty}) on ${next.ts.slice(0, 10)}` : "upcoming PCP visit"}.
PERIOD COVERED: ${periodStart.slice(0, 10)} → today (${new Date().toISOString().slice(0, 10)}).

PRECOMPUTED STATS (use these numbers exactly): ${JSON.stringify(stats)}

HOME OBSERVATIONS (structured log by family caregivers, chronological):
${digestEntries(entries)}

Write for a physician with 30 seconds: specific, quantified, no filler, connect findings to the medication changes from last visit where the data supports it.

LANGUAGE: This is a clinical document — write it ENTIRELY in English regardless of the languages in the log. Translate caregiver quotes to English.

HARD BUDGETS (the doctor asked for a scannable half-page):
- one_liner: ≤22 words.
- red_flags: the 3 MOST important only, each ≤20 words. Fold related findings together (e.g. BP downtrend + dizziness + near-fall = one flag).
- vitals summaries: ≤12 words each.
- symptom_events: top 3 only, each ≤12 words.
- mood_and_sleep ≤25 words; nutrition ≤15 words; medications ≤18 words.
- caregiver_observations: the 2 most telling quotes.
- suggested_questions: exactly 3, each ≤15 words.`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system:
      "You generate pre-visit clinical summaries from caregiver home observations for CuidaHome. Facts only from the provided log — never invent values. Concise clinical register, but readable by the family too.",
    messages: [{ role: "user", content: prompt }],
    output_config: { format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
  });

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return Response.json({ error: "no_output" }, { status: 500 });
  const json = JSON.parse(block.text) as PreVisitReport;
  // enforce the brevity caps server-side too
  json.red_flags = json.red_flags.slice(0, 3);
  json.symptom_events = json.symptom_events.slice(0, 3);
  json.caregiver_observations = json.caregiver_observations.slice(0, 2);
  json.suggested_questions = json.suggested_questions.slice(0, 3);

  const report = {
    id: uid("r"),
    appointmentId: next?.id ?? "",
    generatedAt: new Date().toISOString(),
    periodStart,
    periodEnd: new Date().toISOString(),
    json,
  };
  db.reports.push(report);
  persist();
  return Response.json({ report });
}
