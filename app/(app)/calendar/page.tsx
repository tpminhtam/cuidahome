"use client";

import Link from "next/link";
import { fmtDay, fmtTime, useApp } from "@/components/useApp";

const TYPE_ICON: Record<string, string> = {
  primary_care: "🩺", specialist: "🫀", lab: "🧪", imaging: "🩻", therapy: "🧠", pharmacy: "💊", other: "📍",
};

export default function CalendarPage() {
  const { state, user } = useApp();
  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;
  const es = user.lang === "es";
  const upcoming = state.appointments.filter((a) => !a.completed && new Date(a.ts) >= new Date());
  const past = state.appointments.filter((a) => a.completed || new Date(a.ts) < new Date());

  return (
    <div className="space-y-3">
      <h1 className="font-bold text-lg">{es ? "Citas" : "Appointments"}</h1>
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{es ? "Próximas" : "Upcoming"}</p>
      {upcoming.map((a) => {
        const h = (new Date(a.ts).getTime() - Date.now()) / 3600e3;
        return (
          <div key={a.id} className="card p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{TYPE_ICON[a.type]}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{a.provider}</p>
                <p className="text-xs text-muted">{a.specialty} · {a.location}</p>
                <p className="text-xs font-semibold mt-1 text-teal">
                  {fmtDay(a.ts)} · {fmtTime(a.ts)}
                </p>
                {a.notes && <p className="text-xs text-muted mt-1">📝 {a.notes}</p>}
                {a.type === "primary_care" && h < 48 && (
                  <Link href="/report" className="mt-2 inline-block text-xs font-bold underline text-teal">
                    {es ? "Informe pre-visita listo →" : "Pre-visit report ready →"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-xs font-bold uppercase tracking-wide text-muted pt-2">{es ? "Anteriores" : "Past"}</p>
      {past.map((a) => (
        <div key={a.id} className="card p-3 opacity-70">
          <p className="text-sm font-semibold">
            {TYPE_ICON[a.type]} {a.provider} — {fmtDay(a.ts)}
          </p>
          {a.visitSummary && <p className="text-xs text-muted mt-1">{a.visitSummary}</p>}
        </div>
      ))}
      <p className="text-[11px] text-muted text-center pt-1">
        {es ? "Recordatorios: 1 semana, 1 día y 2 horas antes" : "Reminders: 1 week, 1 day & 2 hours before"} · 🔔
      </p>
    </div>
  );
}
