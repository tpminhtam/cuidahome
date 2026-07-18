"use client";

import { useState } from "react";
import EntryCard from "@/components/EntryCard";
import Sparkline from "@/components/Sparkline";
import { fmtDay, useApp } from "@/components/useApp";
import { BPData, CATEGORIES, Category, GlucoseData, WeightData } from "@/lib/types";

const NUMERIC: Category[] = ["blood_pressure", "weight", "glucose"];

export default function Timeline() {
  const { state, user, uiLang } = useApp();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;
  const es = uiLang === "es";

  // tap a numeric entry → its vital's trend, inline (Dr.'s request)
  const trendFor = (cat: Category) => {
    const asc = [...state.entries].filter((e) => e.category === cat).sort((a, b) => a.ts.localeCompare(b.ts));
    if (cat === "blood_pressure")
      return {
        pts: asc.map((e) => ({ ts: e.ts, v: (e.data as BPData).systolic, flagged: e.flags.length > 0, label: `${(e.data as BPData).systolic}/${(e.data as BPData).diastolic}` })),
        band: { lo: state.patient.thresholds.bp.sysLow, hi: 150, label: "target range" },
        title: es ? "Presión sistólica (mmHg)" : "Systolic BP (mmHg)",
      };
    if (cat === "glucose")
      return {
        pts: asc.map((e) => ({ ts: e.ts, v: (e.data as GlucoseData).value, flagged: e.flags.length > 0 })),
        band: { lo: state.patient.thresholds.glucose.low, hi: 180, label: "target range" },
        title: es ? "Glucosa (mg/dL)" : "Glucose (mg/dL)",
      };
    return {
      pts: asc.map((e) => ({ ts: e.ts, v: (e.data as WeightData).value, flagged: e.flags.length > 0 })),
      band: undefined,
      title: es ? "Peso (lb)" : "Weight (lb)",
    };
  };

  const entries = state.entries.filter((e) => (filter === "all" ? true : e.category === filter));

  const byDay = new Map<string, typeof entries>();
  for (const e of entries) {
    const day = new Date(e.ts).toDateString();
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(e);
  }

  return (
    <div className="space-y-3">
      <h1 className="font-bold text-lg">{es ? "Registro" : "Care log"}</h1>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        <button className="chip shrink-0" onClick={() => setFilter("all")}
          style={filter === "all" ? { background: "var(--teal)", color: "#fff", borderColor: "var(--teal)" } : {}}>
          {es ? "Todo" : "All"}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.key} className="chip shrink-0" onClick={() => setFilter(c.key)}
            style={filter === c.key ? { background: "var(--teal)", color: "#fff", borderColor: "var(--teal)" } : {}}>
            {c.icon} {es ? c.labelEs : c.label}
          </button>
        ))}
      </div>

      {[...byDay.entries()].map(([day, list]) => (
        <section key={day}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5 mt-2">{fmtDay(list[0].ts)}</p>
          <div className="space-y-2">
            {list.map((e) => {
              const numeric = NUMERIC.includes(e.category);
              const open = expanded === e.id;
              const t = open ? trendFor(e.category) : null;
              return (
                <div key={e.id}>
                  <div
                    className={numeric ? "cursor-pointer" : undefined}
                    onClick={() => numeric && setExpanded(open ? null : e.id)}
                  >
                    <EntryCard e={e} users={state.users} />
                  </div>
                  {t && (
                    <div className="card entry-card p-3 mt-1" style={{ background: "var(--teal-soft)" }}>
                      <p className="text-[11px] font-bold text-muted mb-1">📈 {t.title} — {t.pts.length} {es ? "lecturas" : "readings"}</p>
                      <Sparkline points={t.pts} band={t.band} width={330} height={64} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {entries.length === 0 && <p className="text-sm text-muted text-center py-8">{es ? "Sin registros" : "No entries"}</p>}
    </div>
  );
}
