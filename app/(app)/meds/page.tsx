"use client";

import { useApp } from "@/components/useApp";

// Medication list (Dr.'s feedback #5): the sheet every appointment and ER visit
// asks for. Print-friendly; diagnoses live here quietly, off the dashboard.
export default function MedsPage() {
  const { state, uiLang } = useApp();
  if (!state) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;
  const es = uiLang === "es";
  const p = state.patient;

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-lg">💊 {es ? "Lista de medicamentos" : "Medication list"}</h1>
          <p className="text-[11px] text-muted">
            {p.name} · DOB {p.dob} · {es ? "muéstrala en citas y emergencias" : "show this at appointments & the ER"}
          </p>
        </div>
        <button onClick={() => window.print()} className="no-print card px-3 py-1.5 text-sm font-semibold">
          🖨 {es ? "Imprimir" : "Print"}
        </button>
      </div>

      <section className="card divide-y divide-line">
        {p.medications.map((m) => (
          <div key={m.name} className="p-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold leading-tight">{m.name}</p>
              <p className="text-xs text-muted">{m.sig}</p>
            </div>
            {m.startedRecently && (
              <span className="chip" style={{ background: "var(--terra-soft)", color: "var(--terra)", borderColor: "#ecc9b5" }}>
                {es ? "NUEVO" : "NEW"}
              </span>
            )}
          </div>
        ))}
      </section>

      <section className="card p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1">{es ? "Alergias" : "Allergies"}</p>
        <p className="text-sm">{p.allergies.join(", ")}</p>
      </section>

      <section className="card p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1">{es ? "Dieta" : "Diet"}</p>
        <p className="text-sm">{p.dietFlags.join(", ")}</p>
      </section>

      <details className="card p-3">
        <summary className="text-xs font-bold uppercase tracking-wide text-muted cursor-pointer">
          {es ? "Condiciones (para el equipo médico)" : "Conditions (for the care team)"}
        </summary>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">{p.conditions.join(" · ")}</p>
      </details>

      <p className="text-[10px] text-muted text-center">
        {es
          ? "Mantenida por la familia en CuidaHome — confirme siempre con el médico."
          : "Maintained by the family in CuidaHome — always confirm with the doctor."}
      </p>
    </div>
  );
}
