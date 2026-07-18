"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Sparkline from "@/components/Sparkline";
import { fmtDay, useApp } from "@/components/useApp";
import { AgentStep, BPData, GlucoseData, Report, WeightData } from "@/lib/types";

// Clinical document: ALWAYS English, and at most 1/3 of a printed page —
// one-liner, one flag, vital trends, one symptoms line, ONE question.
const DEMO_NOTE = "This shared preview shows the interface with sample data — the AI agents (report generation, portal delivery) run in the full app.";

export default function ReportPage() {
  const { state, user, demoMode } = useApp();
  const [fetched, setFetched] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState<{ state: string; steps: AgentStep[]; error?: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Dr.'s design: the report (summary, trends, symptoms, question) stays hidden
  // until "Generate" is pressed — the reveal happens live. The static preview
  // shows the bundled sample report instead (it can't generate).
  const report = demoMode ? state?.reports[state.reports.length - 1] ?? null : fetched;

  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;
  const p = state.patient;
  const next = state.appointments.find((a) => !a.completed && new Date(a.ts) > new Date() && a.type === "primary_care");

  // caregiver-facing urgent alerts live HERE, on the Visit tab (Dr.'s design):
  // the alert sits where the action is — talking to the care team
  const urgent = state.entries
    .filter((e) => Date.now() - new Date(e.ts).getTime() < 48 * 3600e3)
    .flatMap((e) => e.flags.filter((f) => f.severity === "urgent"));

  const asc = [...state.entries].sort((a, b) => a.ts.localeCompare(b.ts));
  const bpPts = asc.filter((e) => e.category === "blood_pressure").map((e) => {
    const d = e.data as BPData;
    return { ts: e.ts, v: d.systolic, flagged: e.flags.length > 0, label: `${d.systolic}/${d.diastolic}` };
  });
  const wtPts = asc.filter((e) => e.category === "weight").map((e) => ({ ts: e.ts, v: (e.data as WeightData).value, flagged: e.flags.length > 0 }));
  const glPts = asc.filter((e) => e.category === "glucose").map((e) => ({ ts: e.ts, v: (e.data as GlucoseData).value, flagged: e.flags.length > 0 }));

  async function generate() {
    if (demoMode) {
      setErr(DEMO_NOTE);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/report", { method: "POST" });
      const d = await res.json();
      if (!res.ok) setErr(d.message ?? "Generation failed");
      else setFetched(d.report);
    } catch {
      setErr(DEMO_NOTE);
    }
    setBusy(false);
  }

  async function sendToPortal() {
    if (demoMode) {
      setRun({ state: "error", steps: [], error: DEMO_NOTE });
      return;
    }
    setRun({ state: "running", steps: [] });
    const res = await fetch("/api/portal-agent", { method: "POST" }).catch(() => null);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => ({})) : {};
      setRun({ state: "error", steps: [], error: (d as { message?: string }).message ?? DEMO_NOTE });
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
          <h1 className="font-bold text-lg leading-tight">Pre-visit report</h1>
          <p className="text-[11px] text-muted">
            {p.name} · DOB {p.dob}
            {next && <> · visit: {fmtDay(next.ts)} — {next.provider}</>}
          </p>
        </div>
        <span className="text-2xl">🩺</span>
      </div>

      {urgent.length > 0 && (
        <section className="no-print card p-3" style={{ background: "var(--terra-soft)", borderColor: "#ecc9b5" }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--terra)" }}>
            📞 Worth telling the care team
          </p>
          <p className="text-sm leading-snug">{urgent[0].reason}</p>
          {urgent[0].advice && <p className="text-xs text-muted mt-1">{urgent[0].advice}</p>}
        </section>
      )}

      <div className="no-print flex gap-2">
        <button onClick={generate} disabled={busy} className="btn-primary flex-1 text-sm">
          {busy ? "Generating…" : report ? "↻ Regenerate" : "Generate report"}
        </button>
        {report && (
          <button onClick={() => window.print()} className="card px-3 text-sm font-semibold">
            🖨 Print
          </button>
        )}
      </div>
      {err && <p className="card flag-urgent p-3 text-sm">{err}</p>}

      {j && (
        <section className="card p-4" style={{ background: "var(--teal-soft)" }}>
          <p className="text-sm font-semibold leading-snug">{j.one_liner}</p>
        </section>
      )}

      {!j && (
        <p className="text-xs text-muted leading-snug px-1">
          The summary, vital trends, and the family&apos;s question appear when you generate — 48 hours
          before a visit, CuidaHome runs this automatically.
        </p>
      )}

      {j && (
      <section className="card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Trends since last visit</p>
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
      )}

      {j && (
        <>
          <section className="card p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1">Symptoms</p>
            <p className="text-sm leading-snug">{j.symptoms_line}</p>
          </section>

          <section className="card p-4" style={{ borderColor: "var(--teal)", borderWidth: 1.5 }}>
            <p className="text-xs font-bold uppercase tracking-wide text-teal mb-1">Ask the doctor</p>
            <p className="text-sm font-semibold leading-snug">{j.question_for_doctor}</p>
          </section>

          <p className="no-print text-xs text-muted">
            🧳 Bring: this report (printed) + the <Link className="underline" href="/meds">medication list</Link>.
          </p>

          <section className="no-print card p-4" style={{ borderColor: "var(--terra)", borderWidth: 2 }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--terra)" }}>
              Send to the doctor's portal
            </p>
            <p className="text-xs text-muted mb-2">
              The agent opens the patient portal and sends this report as a message — the way a human would.
            </p>
            <button
              onClick={sendToPortal}
              disabled={run?.state === "running"}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-white"
              style={{ background: "var(--terra)" }}
            >
              {run?.state === "running" ? "Agent is working…" : "🤖 Send with the agent"}
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
                    ✓ Sent. Check the portal outbox.{" "}
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
            Generated {new Date(report.generatedAt).toLocaleString()} · Period: {report.periodStart.slice(0, 10)} → {report.periodEnd.slice(0, 10)} ·{" "}
          </>
        )}
        Home observations reported by family caregivers via CuidaHome. Not a medical record and not medical advice.
      </p>
    </div>
  );
}
