"use client";

import { useState } from "react";
import EntryCard from "@/components/EntryCard";
import { fmtDay, useApp } from "@/components/useApp";
import { CATEGORIES, Category } from "@/lib/types";

export default function Timeline() {
  const { state, user, uiLang } = useApp();
  const [filter, setFilter] = useState<Category | "all" | "flagged">("all");
  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;
  const es = uiLang === "es";

  const entries = state.entries.filter((e) =>
    filter === "all"
      ? true
      : filter === "flagged"
        ? e.flags.some((f) => f.severity === "urgent")
        : e.category === filter
  );

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
        <button className="chip shrink-0" onClick={() => setFilter("flagged")}
          style={filter === "flagged" ? { background: "var(--terra)", color: "#fff", borderColor: "var(--terra)" } : {}}>
          📞 {es ? "Para avisar" : "Care team"}
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
            {list.map((e) => (
              <EntryCard key={e.id} e={e} users={state.users} />
            ))}
          </div>
        </section>
      ))}
      {entries.length === 0 && <p className="text-sm text-muted text-center py-8">{es ? "Sin registros" : "No entries"}</p>}
    </div>
  );
}
