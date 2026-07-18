"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/useApp";
import { CATEGORIES, Category, Flag } from "@/lib/types";

const SYMPTOM_TAGS = ["fever", "pain", "shortness of breath", "confusion", "nausea", "swelling", "fatigue", "dizziness", "rash", "cough"];

export default function LogClient({ category }: { category: Category }) {
  const router = useRouter();
  const { user, refresh, uiLang } = useApp();
  const cat = CATEGORIES.find((c) => c.key === category);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [note, setNote] = useState("");
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (!cat || !user) return <p className="text-muted text-sm p-6 text-center">…</p>;
  const es = uiLang === "es";
  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, data, note: note || undefined, caregiverId: user!.id, lang: user!.lang }),
    });
    const out = await res.json();
    setFlags(out.flags ?? []);
    await refresh();
    setBusy(false);
    if (!out.flags?.length) router.push("/timeline");
  }

  const num = (k: string, label: string, ph?: string) => (
    <label key={k} className="block">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input
        type="number" inputMode="decimal" placeholder={ph}
        className="card w-full px-3 py-2.5 mt-1 text-base"
        onChange={(e) => set(k, e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </label>
  );
  const pick = (k: string, label: string, opts: string[]) => (
    <div key={k}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {opts.map((o) => (
          <button key={o} type="button" className="chip"
            style={data[k] === o ? { background: "var(--teal)", color: "#fff", borderColor: "var(--teal)" } : {}}
            onClick={() => set(k, o)}>
            {o.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );

  let fields: React.ReactNode = null;
  switch (category) {
    case "blood_pressure":
      fields = <div className="grid grid-cols-3 gap-2">{num("systolic", "Systolic")}{num("diastolic", "Diastolic")}{num("pulse", "Pulse")}</div>;
      break;
    case "glucose":
      fields = <div className="space-y-3">{num("value", "mg/dL")}{pick("context", "Context", ["fasting", "before_meal", "after_meal", "bedtime"])}</div>;
      break;
    case "weight":
      fields = num("value", es ? "Peso (lb)" : "Weight (lb)");
      break;
    case "symptoms":
      fields = (
        <div className="space-y-3">
          <div>
            <span className="text-xs font-semibold text-muted">{es ? "Síntomas" : "Symptoms"}</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {SYMPTOM_TAGS.map((t) => {
                const tags = (data.tags as string[]) ?? [];
                const on = tags.includes(t);
                return (
                  <button key={t} type="button" className="chip"
                    style={on ? { background: "var(--terra)", color: "#fff", borderColor: "var(--terra)" } : {}}
                    onClick={() => set("tags", on ? tags.filter((x) => x !== t) : [...tags, t])}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-muted">{es ? "Severidad" : "Severity"}: {(data.severity as number) ?? 0}/10</span>
            <input type="range" min={0} max={10} className="w-full" onChange={(e) => set("severity", Number(e.target.value))} />
          </label>
        </div>
      );
      break;
    case "meals":
      fields = (
        <div className="space-y-3">
          {pick("meal_type", es ? "Comida" : "Meal", ["breakfast", "lunch", "dinner", "snack"])}
          {pick("completion_pct", es ? "¿Cuánto comió?" : "How much eaten?", ["0", "25", "50", "75", "100"])}
        </div>
      );
      break;
    case "bowel":
      fields = <div className="space-y-3">{num("count", es ? "Veces hoy" : "Times today")}{pick("consistency", es ? "Consistencia" : "Consistency", ["formed", "loose", "constipated"])}</div>;
      break;
    case "sleep":
      fields = <div className="space-y-3">{num("duration_h", es ? "Horas" : "Hours")}{pick("quality", es ? "Calidad" : "Quality", ["restful", "restless", "very_poor"])}</div>;
      break;
    case "mood":
      fields = (
        <div className="flex justify-between px-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" className="text-3xl p-1.5 rounded-xl"
              style={data.score === s ? { background: "var(--teal-soft)" } : {}}
              onClick={() => set("score", s)}>
              {["", "😞", "🙁", "😐", "🙂", "😄"][s]}
            </button>
          ))}
        </div>
      );
      break;
    case "activity":
      fields = (
        <div className="space-y-3">
          {num("ambulation_minutes", es ? "Minutos caminando" : "Minutes walked")}
          <button type="button" className="chip"
            style={(data.fall as { occurred?: boolean })?.occurred ? { background: "var(--urgent)", color: "#fff", borderColor: "var(--urgent)" } : {}}
            onClick={() => set("fall", (data.fall as { occurred?: boolean })?.occurred ? undefined : { occurred: true, injured: false })}>
            🚨 {es ? "Hubo una caída" : "A fall happened"}
          </button>
        </div>
      );
      break;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-lg">
        {cat.icon} {es ? cat.labelEs : cat.label}
      </h1>
      {fields}
      <label className="block">
        <span className="text-xs font-semibold text-muted">{es ? "Nota (opcional)" : "Note (optional)"}</span>
        <textarea className="card w-full px-3 py-2 mt-1 text-sm" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {flags && flags.length > 0 && (
        <div className="card flag-urgent p-3 text-sm">
          {flags.map((f, i) => (
            <p key={i}>⚠ {f.reason}</p>
          ))}
          <button className="underline text-xs mt-1" onClick={() => router.push("/timeline")}>
            {es ? "Entendido — ver registro" : "Got it — view log"}
          </button>
        </div>
      )}
      <button onClick={submit} disabled={busy} className="btn-primary w-full">
        {busy ? "…" : es ? "Guardar" : "Save"}
      </button>
      <p className="text-[11px] text-muted text-center">
        💡 {es ? "Más rápido: usa el chequeo por voz 🎙️" : "Faster: use the voice check-in 🎙️"}
      </p>
    </div>
  );
}
