"use client";

import { timeAgo, useApp } from "@/components/useApp";
import { Lesson } from "@/lib/types";

const SCOPE: Record<Lesson["scope"], { icon: string; label: string; labelEs: string }> = {
  language: { icon: "🗣️", label: "How this family speaks", labelEs: "Cómo habla esta familia" },
  baseline: { icon: "📈", label: "His personal baselines", labelEs: "Sus valores habituales" },
  routine: { icon: "🔁", label: "Household routines", labelEs: "Rutinas del hogar" },
  preference: { icon: "⭐", label: "Preferences", labelEs: "Preferencias" },
};

// Continual learning, made visible and governable: every lesson the reflection
// pass distills is shown here and can be removed by the family (human-in-the-loop).
// Urgent alert rules never self-modify.
export default function LearningPage() {
  const { state, user, uiLang, demoMode, refresh } = useApp();
  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;
  const es = uiLang === "es";
  const lessons = state.lessons ?? [];

  async function remove(id: string) {
    if (demoMode) return;
    await fetch(`/api/lessons?id=${id}`, { method: "DELETE" });
    refresh();
  }

  const groups = (Object.keys(SCOPE) as Lesson["scope"][])
    .map((s) => ({ scope: s, items: lessons.filter((l) => l.scope === s) }))
    .filter((g) => g.items.length);

  return (
    <div className="space-y-3 pb-4">
      <div>
        <h1 className="font-bold text-lg">🧠 {es ? "Lo que CuidaHome ha aprendido" : "What CuidaHome has learned"}</h1>
        <p className="text-[11px] text-muted leading-snug mt-0.5">
          {es
            ? "Después de cada chequeo, un paso de reflexión destila lecciones — el asistente de la semana 4 entiende a esta familia mejor que el del día 1."
            : "After every check-in, a reflection step distills lessons — the week-4 companion understands this family better than the day-1 one."}
        </p>
      </div>

      {groups.map((g) => (
        <section key={g.scope}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
            {SCOPE[g.scope].icon} {es ? SCOPE[g.scope].labelEs : SCOPE[g.scope].label}
          </p>
          <div className="space-y-2">
            {g.items.map((l) => (
              <div key={l.id} className="card entry-card p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{l.text}</p>
                  <p className="text-[10px] text-muted mt-1">
                    {l.source === "reflection" ? (es ? "aprendido de un chequeo" : "learned from a check-in") : es ? "aprendido esta semana" : "learned this week"} · {timeAgo(l.ts)}
                  </p>
                </div>
                {!demoMode && (
                  <button onClick={() => remove(l.id)} className="text-muted text-xs px-1" title={es ? "Olvidar" : "Forget this"}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {lessons.length === 0 && (
        <p className="text-sm text-muted text-center py-8">{es ? "Aún nada — habla con el asistente." : "Nothing yet — talk to the companion."}</p>
      )}

      <p className="text-[10px] text-muted leading-snug">
        {es
          ? "Ustedes controlan esta memoria: borren lo que quieran. Las reglas de alerta clínica nunca se modifican solas."
          : "Your family controls this memory — remove anything. Clinical alert rules never modify themselves."}
      </p>
    </div>
  );
}
