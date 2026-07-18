import { DB } from "./types";

// Plain-text rendering of the latest pre-visit report, sized for a portal message.
export function composePortalMessage(db: DB): { subject: string; body: string } | null {
  const report = db.reports[db.reports.length - 1];
  if (!report) return null;
  const j = report.json;
  const p = db.patient;
  const next = db.appointments.find((a) => a.id === report.appointmentId) ?? db.appointments.find((a) => !a.completed);

  const subject = `Pre-visit summary — ${p.name} (DOB ${p.dob}) — visit ${next ? new Date(next.ts).toLocaleDateString() : "upcoming"}`;

  const lines: string[] = [
    `PRE-VISIT SUMMARY (caregiver-reported home observations via CuidaHome)`,
    `Patient: ${p.name}, DOB ${p.dob}. Period: ${report.periodStart.slice(0, 10)} to ${report.periodEnd.slice(0, 10)}.`,
    ``,
    `HEADLINE: ${j.one_liner}`,
    ``,
    `RED FLAGS:`,
    ...j.red_flags.map((f) => `- [${f.severity.toUpperCase()}] ${f.text}`),
    ``,
    `VITALS: BP — ${j.vitals.blood_pressure.summary} | Weight — ${j.vitals.weight.summary} | Glucose — ${j.vitals.glucose.summary}`,
    ``,
    `SYMPTOMS: ${j.symptom_events.map((s) => `${s.date}: ${s.text}`).join("; ")}`,
    `MOOD/SLEEP: ${j.mood_and_sleep}`,
    `NUTRITION: ${j.nutrition}`,
    `MEDICATIONS: ${j.medications}`,
    ``,
    `Sent by Maria Alvarez (daughter, caregiver proxy). Full log with trend charts available in CuidaHome.`,
  ];
  return { subject, body: lines.join("\n") };
}
