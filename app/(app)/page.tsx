"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/types";
import { fmtDay, fmtTime, useApp } from "@/components/useApp";

export default function Home() {
  const { state, user, uiLang } = useApp();
  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;

  const es = uiLang === "es";
  const p = state.patient;
  const upcoming = state.appointments.filter((a) => !a.completed && new Date(a.ts) > new Date());
  const nextAppt = upcoming.find((a) => a.type === "primary_care") ?? upcoming[0];
  const hoursToAppt = nextAppt ? (new Date(nextAppt.ts).getTime() - Date.now()) / 3600e3 : Infinity;

  return (
    <div className="space-y-3">
      {/* patient card — minimal by the physician's design: name only, no clinical detail */}
      <section className="card p-4 flex items-center gap-3">
        <span className="text-4xl">{p.photo}</span>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-lg leading-tight">{p.name}</h1>
        </div>
        <Link href="/meds" className="chip shrink-0" style={{ background: "var(--teal-soft)", color: "var(--teal)", borderColor: "#c8ded9" }}>
          💊 {es ? "Medicinas" : "Med list"}
        </Link>
      </section>

      {/* next appointment */}
      {nextAppt && (
        <section className="card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal">
                {es ? "Próxima cita" : "Next appointment"}
              </p>
              <p className="font-semibold text-sm mt-1">
                {nextAppt.provider} · {nextAppt.specialty}
              </p>
              <p className="text-xs text-muted">
                {fmtDay(nextAppt.ts)}, {fmtTime(nextAppt.ts)} · {nextAppt.location}
              </p>
              {nextAppt.notes && <p className="text-xs text-muted mt-1">📝 {nextAppt.notes}</p>}
            </div>
            <span className="chip" style={{ background: "var(--teal-soft)", color: "var(--teal)", borderColor: "#c8ded9" }}>
              {hoursToAppt < 48 ? (es ? "en " : "in ") + Math.round(hoursToAppt) + "h" : fmtDay(nextAppt.ts)}
            </span>
          </div>
          {hoursToAppt < 48 && (
            <Link
              href="/report"
              className="mt-3 block text-center rounded-xl py-2.5 text-sm font-bold text-white"
              style={{ background: "var(--teal)" }}
            >
              {es ? "Ver informe pre-visita →" : "View pre-visit report →"}
            </Link>
          )}
        </section>
      )}

      {/* continual learning — the memory panel */}
      {(state.lessons?.length ?? 0) > 0 && (
        <Link href="/learning" className="card p-3 flex items-center gap-2.5">
          <span className="text-xl">🧠</span>
          <span className="text-sm font-semibold flex-1">
            {es ? "Aprendido de sus chequeos" : "Learned from your check-ins"}
          </span>
          <span className="chip">{state.lessons.length}</span>
        </Link>
      )}

      {/* quick log grid */}
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">
          {es ? "Registro rápido" : "Quick log"}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <Link key={c.key} href={`/log/${c.key}`} className="card p-3 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl">{c.icon}</div>
              <div className="text-[11px] font-semibold mt-1 leading-tight">{es ? c.labelEs : c.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-center text-[10px] text-muted pt-1">
        {es
          ? "CuidaHome no da consejos médicos. En una emergencia llame al 911."
          : "CuidaHome does not give medical advice. In an emergency call 911."}
      </p>
    </div>
  );
}
