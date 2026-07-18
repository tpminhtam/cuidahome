"use client";

import { CATEGORIES, Entry, BPData, GlucoseData, WeightData, MealData, SleepData, MoodData, ActivityData, SymptomData, BowelData, User } from "@/lib/types";
import { fmtTime, timeAgo } from "./useApp";

const MOOD_EMOJI = ["", "😞", "🙁", "😐", "🙂", "😄"];

export function summarize(e: Entry): string {
  switch (e.category) {
    case "blood_pressure": {
      const d = e.data as BPData;
      return `${d.systolic}/${d.diastolic}${d.pulse ? ` · pulse ${d.pulse}` : ""}`;
    }
    case "glucose": {
      const d = e.data as GlucoseData;
      return `${d.value} mg/dL${d.context ? ` · ${d.context.replace("_", " ")}` : ""}`;
    }
    case "weight":
      return `${(e.data as WeightData).value} lb`;
    case "symptoms": {
      const d = e.data as SymptomData;
      return `${(d.tags || []).join(", ")}${d.severity != null ? ` · ${d.severity}/10` : ""}${d.prn_med ? ` · ${d.prn_med} ×${d.prn_times ?? 1}` : ""}`;
    }
    case "meals": {
      const d = e.data as MealData;
      return `${d.meal_type}${d.completion_pct != null ? ` · ate ${d.completion_pct}%` : ""}${d.issues?.length ? ` · ⚠ ${d.issues.join(", ")}` : ""}`;
    }
    case "bowel": {
      const d = e.data as BowelData;
      return `${d.count ?? "—"}× · ${d.consistency ?? ""}`;
    }
    case "sleep": {
      const d = e.data as SleepData;
      return `${d.duration_h ?? "?"}h · ${d.quality ?? ""}${d.issues?.length ? ` · ${d.issues.join(", ")}` : ""}`;
    }
    case "mood": {
      const d = e.data as MoodData;
      return `${MOOD_EMOJI[d.score]} ${["", "very poor", "poor", "neutral", "good", "very good"][d.score]}${d.behaviors?.length ? ` · ${d.behaviors.join(", ")}` : ""}`;
    }
    case "activity": {
      const d = e.data as ActivityData;
      if (d.fall?.occurred) return `🚨 fall${d.fall.injured ? " WITH INJURY" : " (no injury)"} — ${d.fall.description ?? ""}`;
      return `walked ${d.ambulation_minutes ?? 0} min`;
    }
  }
}

export default function EntryCard({ e, users, compact }: { e: Entry; users: User[]; compact?: boolean }) {
  const cat = CATEGORIES.find((c) => c.key === e.category)!;
  const who = users.find((u) => u.id === e.caregiverId);
  return (
    <div className="card entry-card p-3">
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none mt-0.5">{cat.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{cat.label}</p>
            <p className="text-[10px] text-muted shrink-0">
              {compact ? timeAgo(e.ts) : fmtTime(e.ts)}
            </p>
          </div>
          <p className="text-sm font-semibold leading-snug">{summarize(e)}</p>
          {e.note && <p className="text-xs text-muted mt-1 italic leading-snug">“{e.note}”</p>}
          {e.noteEn && e.note !== e.noteEn && (
            <p className="text-[11px] text-muted mt-0.5 leading-snug">🌐 {e.noteEn}</p>
          )}
          {e.flags.map((f, i) => (
            <p key={i} className={`chip mt-1.5 ${f.severity === "urgent" ? "flag-urgent" : "flag-watch"}`}>
              {f.severity === "urgent" ? "⚠" : "👁"} {f.reason}
            </p>
          ))}
          {who && (
            <p className="text-[10px] text-muted mt-1.5">
              {who.avatar} {who.name} · {e.source === "voice" ? "🎙 voice" : e.source}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
