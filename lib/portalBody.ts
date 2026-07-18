import { DB } from "./types";

// Plain-text rendering of the (1/3-page) pre-visit report for the portal message.
export function composePortalMessage(db: DB): { subject: string; body: string } | null {
  const report = db.reports[db.reports.length - 1];
  if (!report) return null;
  const j = report.json;
  const p = db.patient;
  const next = db.appointments.find((a) => a.id === report.appointmentId) ?? db.appointments.find((a) => !a.completed);

  const subject = `Pre-visit summary — ${p.name} (DOB ${p.dob}) — visit ${next ? new Date(next.ts).toLocaleDateString() : "upcoming"}`;

  const lines: string[] = [
    `PRE-VISIT SUMMARY (caregiver home observations via CuidaHome, ${report.periodStart.slice(0, 10)} to ${report.periodEnd.slice(0, 10)})`,
    ``,
    j.one_liner,
    ``,
    `VITALS — BP: ${j.vitals.blood_pressure.summary} (${j.vitals.blood_pressure.trend}) | Weight: ${j.vitals.weight.summary} (${j.vitals.weight.trend}) | Glucose: ${j.vitals.glucose.summary} (${j.vitals.glucose.trend})`,
    `SYMPTOMS — ${j.symptoms_line}`,
    ``,
    `QUESTION — ${j.question_for_doctor}`,
    ``,
    `Sent by Maria Alvarez (daughter, caregiver proxy) at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Full log with trend charts in CuidaHome.`,
  ];
  return { subject, body: lines.join("\n") };
}
