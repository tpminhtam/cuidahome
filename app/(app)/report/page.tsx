"use client";

import { useEffect, useRef, useState } from "react";
import Sparkline from "@/components/Sparkline";
import { fmtDay, useApp } from "@/components/useApp";
import { AgentStep, BPData, GlucoseData, Report, WeightData } from "@/lib/types";

export default function ReportPage() {
  const { state, user } = useApp();
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState<{ state: string; steps: AgentStep[]; error?: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/report").then((r) => r.json()).then((d) => setReport(d.report));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;
  const es = user.lang === "es";
  const p = state.patient;
  const next = state.appointments.find((a) => !a.completed && new Date(a.ts) > new Date() && a.type === "primary_care");

  const asc = [...state.entries].sort((a, b) => a.ts.localeCompare(b.ts));
  const bpPts = asc.filter((e) => e.category === "blood_pressure").map((e) => {
    const d = e.data as BPData;
    return { ts: e.ts, v: d.systolic, flagged: e.flags.length > 0, label: `${d.systolic}/${d.diastolic}` };
  });
  const wtPts = asc.filter((e) => e.category === "weight").map((e) => ({ ts: e.ts, v: (e.data as WeightData).value, flagged: e.flags.length > 0 }));
  const glPts = asc.filter((e) => e.category === "glucose").map((e) => ({ ts: e.ts, v: (e.data as GlucoseData).value, flagged: e.flags.length > 0 }));

  async function generate() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/report", { method: "POST" });
    const d = await res.json();
    if (!res.ok) setErr(d.message ?? "Generation failed");
    else setReport(d.report);
    setBusy(false);
  }

  async function sendToPortal() {
    setRun({ state: "running", steps: [] });
    const res = await fetch("/api/portal-agent", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setRun({ state: "error", steps: [], error: d.message ?? "Could not start the agent" });
      return;
    }
    pollRef.current = setInterval(async () => {
      const s = await fetch("/api/portal-agent").then((r) => r.json());
      setRun(s.run);
      if (s.run?.state !== "running" && pollRef.current) clearInterval(pollRef.current);
    }, 1200);
  }

  const j = report?.json;

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-bold text-lg leading-tight">{es ? "Informe pre-visita" : "Pre-visit report"}</h1>
          <p className="text-[11px] text-muted">
            {p.name} · DOB {p.dob}
            {next && <> · {es ? "cita" : "visit"}: {fmtDay(next.ts)} — {next.provider}</>}
          </p>
        </div>
        <span className="text-2xl">🩺</span>
      </div>

      {/* actions */}
      <div className="no-print flex gap-2">
        <button onClick={generate} disabled={busy} className="btn-primary flex-1 text-sm">
          {busy ? (es ? "Generando…" : "Generating…") : report ? "↻ " + (es ? "Regenerar" : "Regenerate") : es ? "Generar informe" : "Generate report"}
        </button>
        {report && (
          <button onClick={() => window.print()} className="card px-3 text-sm font-semibold">
            🖨 {es ? "Imprimir" : "Print"}
          </button>
        )}
      </div>
      {err && <p className="card flag-urgent p-3 text-sm">{err}</p>}

      {/* one-liner + red flags */}
      {j && (
        <>
          <section className="card p-4" style={{ background: "var(--teal-soft)" }}>
            <p className="text-xs font-bold uppercase tracking-wide text-teal mb-1">{es ? "Lo esencial" : "The headline"}</p>
            <p className="text-sm font-semibold leading-snug">{j.one_liner}</p>
          </section>
          {j.red_flags.length > 0 && (
            <section className="card p-4 flag-urgent">
              <p className="text-xs font-bold uppercase tracking-wide mb-2">🚩 {es ? "Señales de alerta" : "Red flags"}</p>
              <ul className="space-y-1.5">
                {j.red_flags.map((f, i) => (
                  <li key={i} className="text-sm leading-snug flex gap-1.5">
                    <span>{f.severity === "urgent" ? "⚠" : "👁"}</span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* vitals trends — computed locally, never hallucinated */}
      <section className="card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
          {es ? "Tendencias desde la última visita" : "Trends since last visit"}
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold">Systolic BP <span className="text-muted font-normal">(mmHg)</span></p>
              {j && <p className="text-[11px] text-muted">{j.vitals.blood_pressure.summary}</p>}
            </div>
            <Sparkline points={bpPts} band={{ lo: p.thresholds.bp.sysLow, hi: 150, label: "target range" }} unit=" mmHg" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold">Weight <span className="text-muted font-normal">(lb)</span></p>
              {j && <p className="text-[11px] text-muted">{j.vitals.weight.summary}</p>}
            </div>
            <Sparkline points={wtPts} unit=" lb" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold">Glucose <span className="text-muted font-normal">(mg/dL)</span></p>
              {j && <p className="text-[11px] text-muted">{j.vitals.glucose.summary}</p>}
            </div>
            <Sparkline points={glPts} band={{ lo: p.thresholds.glucose.low, hi: 180, label: "target range" }} unit=" mg/dL" />
          </div>
        </div>
      </section>

      {j && (
        <>
          <Section title={es ? "Eventos de síntomas" : "Symptom events"}>
            <ul className="space-y-1">
              {j.symptom_events.map((s, i) => (
                <li key={i} className="text-sm leading-snug">
                  <span className="font-semibold">{s.date}</span> — {s.text}
                </li>
              ))}
            </ul>
          </Section>
          <Section title={es ? "Ánimo y sueño" : "Mood & sleep"}>{j.mood_and_sleep}</Section>
          <Section title={es ? "Alimentación" : "Nutrition"}>{j.nutrition}</Section>
          <Section title={es ? "Medicamentos" : "Medications"}>{j.medications}</Section>
          <Section title={es ? "Observaciones de la familia" : "In the family's words"}>
            <ul className="space-y-1.5">
              {j.caregiver_observations.map((o, i) => (
                <li key={i} className="text-sm italic leading-snug">“{o}”</li>
              ))}
            </ul>
          </Section>
          <Section title={es ? "Preguntas para la visita" : "Questions for this visit"}>
            <ul className="space-y-1 list-disc pl-4">
              {j.suggested_questions.map((q, i) => (
                <li key={i} className="text-sm leading-snug">{q}</li>
              ))}
            </ul>
          </Section>

          {/* computer-use send */}
          <section className="no-print card p-4" style={{ borderColor: "var(--terra)", borderWidth: 2 }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--terra)" }}>
              {es ? "Enviar al portal del médico" : "Send to the doctor's portal"}
            </p>
            <p className="text-xs text-muted mb-2">
              {es
                ? "El agente abre el portal del paciente y envía este informe como mensaje — como lo haría un humano."
                : "The agent opens the patient portal and sends this report as a message — the way a human would."}
            </p>
            <button
              onClick={sendToPortal}
              disabled={run?.state === "running"}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-white"
              style={{ background: "var(--terra)" }}
            >
              {run?.state === "running" ? (es ? "El agente está trabajando…" : "Agent is working…") : "🤖 " + (es ? "Enviar con el agente" : "Send with the agent")}
            </button>
            {run && (
              <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                {run.steps.map((s) => (
                  <p key={s.i} className="text-[11px] text-muted leading-snug">
                    <span className="font-mono">{String(s.i).padStart(2, "0")}</span> {s.action}
                    {s.detail ? ` — ${s.detail}` : ""}
                  </p>
                ))}
                {run.state === "done" && (
                  <p className="text-xs font-bold" style={{ color: "var(--chart)" }}>
                    ✓ {es ? "Enviado. Revisa la bandeja del portal." : "Sent. Check the portal outbox."}{" "}
                    <a href="/portal/messages" target="_blank" className="underline">portal ↗</a>
                  </p>
                )}
                {run.state === "error" && <p className="text-xs flag-urgent card p-2">{run.error}</p>}
              </div>
            )}
          </section>
        </>
      )}

      <p className="text-[10px] text-muted leading-snug pt-1">
        {report && (
          <>
            Generated {new Date(report.generatedAt).toLocaleString()} · {es ? "Periodo" : "Period"}: {report.periodStart.slice(0, 10)} → {report.periodEnd.slice(0, 10)} ·{" "}
          </>
        )}
        {es
          ? "Observaciones del hogar reportadas por la familia vía CuidaHome. No es un registro médico ni consejo médico."
          : "Home observations reported by family caregivers via CuidaHome. Not a medical record and not medical advice."}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5">{title}</p>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
