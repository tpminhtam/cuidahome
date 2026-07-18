"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/types";
import { fmtDay, fmtTime, timeAgo, useApp } from "@/components/useApp";

export default function Home() {
  const { state, user, uiLang } = useApp();
  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;

  const es = uiLang === "es";
  const p = state.patient;
  const recentFlags = state.entries
    .filter((e) => e.flags.length && Date.now() - new Date(e.ts).getTime() < 48 * 3600e3)
    .flatMap((e) => e.flags.map((f) => ({ ...f, ts: e.ts })));
  const urgent = recentFlags.filter((f) => f.severity === "urgent");
  const upcoming = state.appointments.filter((a) => !a.completed && new Date(a.ts) > new Date());
  const nextAppt = upcoming.find((a) => a.type === "primary_care") ?? upcoming[0];
  const hoursToAppt = nextAppt ? (new Date(nextAppt.ts).getTime() - Date.now()) / 3600e3 : Infinity;
  const lastBP = state.entries.find((e) => e.category === "blood_pressure");
  const todayCount = state.entries.filter((e) => new Date(e.ts).toDateString() === new Date().toDateString()).length;

  return (
    <div className="space-y-3">
      {/* patient card — deliberately light on clinical detail (Dr.'s feedback #4) */}
      <section className="card p-4 flex items-center gap-3">
        <span className="text-4xl">{p.photo}</span>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-lg leading-tight">{p.name}</h1>
          <p className="text-xs text-muted">
            {p.age} {es ? "años" : "years"} · {todayCount} {es ? "registros hoy" : "entries today"}
            {lastBP
              ? ` · BP ${(lastBP.data as { systolic: number; diastolic: number }).systolic}/${(lastBP.data as { systolic: number; diastolic: number }).diastolic} ${timeAgo(lastBP.ts)}`
              : ""}
          </p>
        </div>
        <Link href="/meds" className="chip shrink-0" style={{ background: "var(--teal-soft)", color: "var(--teal)", borderColor: "#c8ded9" }}>
          💊 {es ? "Medicinas" : "Med list"}
        </Link>
      </section>

      {/* alerts */}
      {recentFlags.length > 0 && (
        <section className={`card p-3 ${urgent.length ? "flag-urgent" : "flag-watch"}`}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1">
            {urgent.length ? (es ? "⚠ Atención" : "⚠ Needs attention") : es ? "En observación" : "Watching"}
          </p>
          <p className="text-sm leading-snug">{(urgent[0] ?? recentFlags[0]).reason}</p>
          {recentFlags.length > 1 && (
            <Link href="/timeline" className="text-xs underline mt-1 inline-block">
              +{recentFlags.length - 1} {es ? "más en el registro" : "more in the log"}
            </Link>
          )}
        </section>
      )}

      {/* voice CTA */}
      <Link
        href="/voice"
        className="card p-4 flex items-center gap-3 border-2"
        style={{ borderColor: "var(--terra)", background: "var(--terra-soft)" }}
      >
        <span className="grid place-items-center w-12 h-12 rounded-full text-2xl" style={{ background: "var(--terra)" }}>
          🎙️
        </span>
        <div>
          <p className="font-bold leading-tight">{es ? "Cuéntame cómo está papá" : "Tell me how he's doing"}</p>
          <p className="text-xs text-muted">
            {es ? "Habla 30 segundos — yo lo anoto todo" : "Talk for 30 seconds — I'll log everything"}
          </p>
        </div>
      </Link>

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
