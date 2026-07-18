import { BPData, Category, Entry, EntryData, Flag, GlucoseData, Patient, SymptomData, ActivityData, WeightData, MealData } from "./types";

// TWO-TIER VISIBILITY (physician's design):
//  - "urgent"  → shown to caregivers, calm actionable wording ("worth telling the
//                care team"). Only absolutely abnormal vitals / events that
//                necessitate medical attention.
//  - "watch"   → NEVER shown in caregiver-facing UI. Collected silently and
//                surfaced only in the clinician-facing pre-visit report.
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
      flags.push({
        severity: "urgent",
        reason: `Blood pressure ${d.systolic}/${d.diastolic} is very high`,
        advice: "Worth calling the care team now. If chest pain, trouble breathing, or confusion — call 911.",
      });
    else if (d.systolic <= t.bp.sysLow || d.diastolic <= t.bp.diaLow)
      flags.push({
        severity: "urgent",
        reason: `Blood pressure ${d.systolic}/${d.diastolic} is very low`,
        advice: "Have him sit or lie down and take it slowly. Worth calling the care team today.",
      });
    else if (d.systolic <= t.bp.sysLow + 15)
      // silent tier — report-only trend signal
      flags.push({ severity: "watch", reason: `BP ${d.systolic}/${d.diastolic} running low since hydrochlorothiazide was started` });
  }

  if (category === "glucose") {
    const d = data as GlucoseData;
    if (d.value <= t.glucose.low)
      flags.push({
        severity: "urgent",
        reason: `Blood sugar ${d.value} is low`,
        advice: "Give juice or food now and recheck in 15 minutes. Tell the care team it happened.",
      });
    else if (d.value >= t.glucose.high)
      flags.push({
        severity: "urgent",
        reason: `Blood sugar ${d.value} is very high`,
        advice: "Worth calling the care team today.",
      });
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
      flags.push({
        severity: "urgent",
        reason: "Chest pain reported",
        advice: "Follow his nitroglycerin plan. If pain lasts more than 5 minutes or comes at rest — call 911.",
      });
    if (tags.includes("dizziness"))
      flags.push({ severity: "watch", reason: "Dizziness — orthostatic pattern to watch (new HCTZ; office BP was 107/58)" });
    if (tags.includes("confusion"))
      flags.push({ severity: "watch", reason: "New/worsening confusion episode" });
    if ((d.severity ?? 0) >= 8 && !tags.some((x) => x.includes("chest")))
      flags.push({
        severity: "urgent",
        reason: `Severe symptom reported (${d.severity}/10)`,
        advice: "Worth calling the care team today.",
      });
  }

  if (category === "activity") {
    const d = data as ActivityData;
    if (d.fall?.occurred)
      flags.push({
        severity: "urgent",
        reason: d.fall.injured ? "A fall with injury was recorded" : "A fall was recorded",
        advice: "Worth telling the care team. He takes aspirin — watch for headache, drowsiness, or new confusion after any head bump.",
      });
  }

  if (category === "meals") {
    const d = data as MealData;
    if ((d.issues || []).some((x) => /chok|cough|atragant/i.test(x)))
      flags.push({ severity: "watch", reason: "Coughing/choking with food or thin liquids — possible swallowing issue" });
  }

  return flags;
}

export const urgentOnly = (flags: Flag[]) => flags.filter((f) => f.severity === "urgent");
