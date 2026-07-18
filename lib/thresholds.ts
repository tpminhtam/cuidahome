import { BPData, Category, Entry, EntryData, Flag, GlucoseData, Patient, SymptomData, ActivityData, WeightData, MealData } from "./types";

// Server-side safety net: evaluate every entry against the patient's configured
// alert thresholds (spec §2.1.2–2.1.4) + dementia/geriatric red flags.
export function evaluateFlags(
  category: Category,
  data: EntryData,
  patient: Patient,
  recentEntries: Entry[]
): Flag[] {
  const flags: Flag[] = [];
  const t = patient.thresholds;

  if (category === "blood_pressure") {
    const d = data as BPData;
    if (d.systolic >= t.bp.sysHigh || d.diastolic >= t.bp.diaHigh)
      flags.push({ severity: "urgent", reason: `BP ${d.systolic}/${d.diastolic} above alert threshold (${t.bp.sysHigh}/${t.bp.diaHigh})` });
    if (d.systolic <= t.bp.sysLow || d.diastolic <= t.bp.diaLow)
      flags.push({ severity: "urgent", reason: `BP ${d.systolic}/${d.diastolic} below alert threshold (${t.bp.sysLow}/${t.bp.diaLow}) — hypotension risk on new BP medication` });
    else if (d.systolic <= t.bp.sysLow + 10)
      flags.push({ severity: "watch", reason: `BP ${d.systolic}/${d.diastolic} trending low since hydrochlorothiazide was started` });
  }

  if (category === "glucose") {
    const d = data as GlucoseData;
    if (d.value <= t.glucose.low)
      flags.push({ severity: "urgent", reason: `Glucose ${d.value} mg/dL at or below ${t.glucose.low} — hypoglycemia risk (new metformin)` });
    if (d.value >= t.glucose.high)
      flags.push({ severity: "watch", reason: `Glucose ${d.value} mg/dL above ${t.glucose.high}` });
  }

  if (category === "weight") {
    const d = data as WeightData;
    const cutoff = Date.now() - t.weightGain.days * 864e5;
    const prior = recentEntries
      .filter((e) => e.category === "weight" && new Date(e.ts).getTime() >= cutoff)
      .map((e) => (e.data as WeightData).value);
    if (prior.length && d.value - Math.min(...prior) >= t.weightGain.lbs)
      flags.push({ severity: "watch", reason: `Weight up ${(d.value - Math.min(...prior)).toFixed(1)} lb in ${t.weightGain.days} days` });
  }

  if (category === "symptoms") {
    const d = data as SymptomData;
    const tags = (d.tags || []).map((x) => x.toLowerCase());
    if (tags.some((x) => x.includes("chest")))
      flags.push({ severity: "urgent", reason: "Chest pain reported — history of heart attack; follow nitroglycerin plan / call 911 if not relieved", advice: "If pain lasts >5 min or occurs at rest, call 911." });
    if (tags.includes("dizziness"))
      flags.push({ severity: "watch", reason: "Dizziness — monitor orthostatic symptoms flagged at last visit (new HCTZ, baseline BP 107/58)" });
    if (tags.includes("confusion"))
      flags.push({ severity: "watch", reason: "New/worsening confusion — track frequency; review meds and infection signs" });
    if ((d.severity ?? 0) >= 8)
      flags.push({ severity: "urgent", reason: `Severe symptom (${d.severity}/10)` });
  }

  if (category === "activity") {
    const d = data as ActivityData;
    if (d.fall?.occurred)
      flags.push({
        severity: "urgent",
        reason: d.fall.injured ? "FALL WITH INJURY reported" : "Fall / near-fall reported",
        advice: "On aspirin — watch for head injury signs. Tell the care team.",
      });
  }

  if (category === "meals") {
    const d = data as MealData;
    if ((d.issues || []).some((x) => /chok|cough|atragant/i.test(x)))
      flags.push({ severity: "watch", reason: "Coughing/choking with food — aspiration risk, consider swallow evaluation" });
  }

  return flags;
}
