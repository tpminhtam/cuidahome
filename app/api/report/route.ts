import { getClient, MODEL, noKeyResponse } from "@/lib/anthropic";
import { getDB, persist, uid } from "@/lib/db";
import { BPData, Entry, GlucoseData, PreVisitReport, WeightData } from "@/lib/types";

export const maxDuration = 120;

// ULTRA-SHORT report per the physician: 1/3 of a printed page MAX —
// one-liner clinical summary, one symptoms line, vital trends, ONE question.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["one_liner", "key_flag", "symptoms_line", "vitals", "question_for_doctor"],
  properties: {
    one_liner: { type: "string", description: "≤22 words. The single most important clinical change this period, quantified." },
    key_flag: { type: "string", description: "≤16 words. The ONE most important red flag, or empty string if none." },
    symptoms_line: { type: "string", description: "≤18 words. One line summarizing symptom events with counts/dates." },
    vitals: {
      type: "object", additionalProperties: false, required: ["blood_pressure", "weight", "glucose"],
      properties: { blood_pressure: vitalsShape(), weight: vitalsShape(), glucose: vitalsShape() },
    },
    question_for_doctor: { type: "string", description: "≤15 words. EXACTLY ONE practical question for the physician." },
  },
} as const;

function vitalsShape() {
  return {
    type: "object", additionalProperties: false, required: ["summary", "trend"],
    properties: {
      summary: { type: "string", description: "≤10 words, with the actual numbers" },
      trend: { type: "string", enum: ["rising", "falling", "stable"] },
    },
  };
}

function digestEntries(entries: Entry[]): string {
  return entries
    .map((e) => {
      const day = e.ts.slice(0, 10);
      const flags = e.flags.length ? ` FLAGS[${e.flags.map((f) => `${f.severity}:${f.reason}`).join(" | ")}]` : "";
      const note = e.noteEn ?? e.note ?? "";
      return `${day} ${e.category} ${JSON.stringify(e.data)}${note ? ` note:"${note}"` : ""}${flags}`;
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

The physician wants a THIRD OF A PAGE, scannable in 15 seconds, ENTIRELY in English:
- one_liner: the single most important clinical change, quantified, connected to last visit's medication changes where the data supports it (≤22 words).
- key_flag: the ONE most important red flag (≤16 words); "" if truly none.
- symptoms_line: one line covering the symptom events with counts (≤18 words).
- vitals summaries: ≤10 words each, real numbers.
- question_for_doctor: EXACTLY ONE practical question (≤15 words).
No filler. Facts only from the log.`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You generate ultra-concise pre-visit clinical summaries from caregiver home observations for CuidaHome. English only. Facts only from the provided log — never invent values.",
    messages: [{ role: "user", content: prompt }],
    output_config: { format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
  });

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return Response.json({ error: "no_output" }, { status: 500 });
  const json = JSON.parse(block.text) as PreVisitReport;

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
