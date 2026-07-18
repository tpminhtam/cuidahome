import { DB, Entry, Category, EntryData, Flag, Lang } from "./types";

// Demo story: Isreal Howell, 87 — the patient from Abridge's synthetic FHIR set
// (id 74919836…). At his last PCP visit, hydrochlorothiazide + metformin were
// started and the note said "monitor for orthostatic symptoms / dizziness".
// The 10 days of home logs below show exactly that risk emerging — BP drifting
// down, dizziness clustering, a near-fall — which the pre-visit report surfaces.

function d(daysAgo: number, hh = 9, mm = 0): string {
  const t = new Date();
  t.setDate(t.getDate() - daysAgo);
  t.setHours(hh, mm, 0, 0);
  return t.toISOString();
}
function plus(days: number, hh = 10): string {
  const t = new Date();
  t.setDate(t.getDate() + days);
  t.setHours(hh, 0, 0, 0);
  return t.toISOString();
}

let n = 0;
function entry(
  daysAgo: number, hh: number, category: Category, data: EntryData,
  caregiverId: string, lang: Lang, opts: { note?: string; noteEn?: string; flags?: Flag[] } = {}
): Entry {
  n += 1;
  return {
    id: `e${n}`, ts: d(daysAgo, hh), createdAt: d(daysAgo, hh),
    category, data, caregiverId, lang, source: "seed",
    note: opts.note, noteEn: opts.noteEn, flags: opts.flags ?? [],
  };
}

export function buildSeed(): DB {
  n = 0;
  const M = "u_maria"; // daughter, Spanish
  const T = "u_tam";   // grandson, English

  const entries: Entry[] = [
    // ---------- 10 days ago (day of last visit — new meds started) ----------
    entry(10, 8, "blood_pressure", { systolic: 132, diastolic: 78, pulse: 72 }, T, "en"),
    entry(10, 20, "weight", { value: 173.5 }, T, "en"),
    // ---------- day -9 ----------
    entry(9, 8, "blood_pressure", { systolic: 128, diastolic: 74, pulse: 74 }, M, "es"),
    entry(9, 13, "meals", { meal_type: "lunch", completion_pct: 100, description: "arroz con pollo" }, M, "es",
      { note: "Comió muy bien hoy", noteEn: "He ate very well today" }),
    entry(9, 21, "sleep", { duration_h: 7.5, quality: "restful" }, M, "es"),
    entry(9, 18, "activity", { ambulation_minutes: 30 }, T, "en", { note: "Full loop around the block, steady" }),
    // ---------- day -8 ----------
    entry(8, 7, "glucose", { value: 92, context: "fasting" }, T, "en"),
    entry(8, 8, "blood_pressure", { systolic: 124, diastolic: 72, pulse: 70 }, T, "en"),
    entry(8, 14, "bowel", { count: 1, consistency: "formed" }, M, "es"),
    entry(8, 20, "mood", { score: 4 }, M, "es"),
    // ---------- day -7 ----------
    entry(7, 8, "blood_pressure", { systolic: 118, diastolic: 70, pulse: 76 }, M, "es"),
    entry(7, 20, "weight", { value: 172.8 }, T, "en"),
    entry(7, 22, "sleep", { duration_h: 6, quality: "restless", issues: ["nighttime awakenings"] }, M, "es",
      { note: "Se despertó dos veces, un poco desorientado", noteEn: "He woke up twice, a little disoriented" }),
    // ---------- day -6 ----------
    entry(6, 8, "blood_pressure", { systolic: 114, diastolic: 68, pulse: 78 }, T, "en"),
    entry(6, 18, "activity", { ambulation_minutes: 20 }, T, "en"),
    entry(6, 19, "meals", { meal_type: "dinner", completion_pct: 75 }, M, "es"),
    entry(6, 20, "mood", { score: 4 }, T, "en"),
    // ---------- day -5 ----------
    entry(5, 7, "glucose", { value: 88, context: "fasting" }, T, "en"),
    entry(5, 8, "blood_pressure", { systolic: 112, diastolic: 66, pulse: 74 }, M, "es"),
    entry(5, 11, "symptoms", { tags: ["pain"], severity: 5, location: "right knee", prn_med: "acetaminophen 500 mg", prn_times: 2 }, T, "en",
      { note: "Knee sore after gardening, Tylenol twice today" }),
    entry(5, 21, "sleep", { duration_h: 7, quality: "restful", nap_minutes: 60 }, M, "es"),
    // ---------- day -4 ----------
    entry(4, 8, "blood_pressure", { systolic: 108, diastolic: 64, pulse: 80 }, T, "en"),
    entry(4, 13, "meals", { meal_type: "lunch", completion_pct: 50, issues: ["coughing with thin liquids"] }, M, "es",
      { note: "Tosió mucho al tomar la sopa", noteEn: "He coughed a lot drinking the soup" },
      ),
    entry(4, 20, "weight", { value: 172.4 }, T, "en"),
    entry(4, 20, "mood", { score: 3 }, M, "es"),
    // ---------- day -3 ----------
    entry(3, 8, "blood_pressure", { systolic: 106, diastolic: 62, pulse: 82 }, M, "es"),
    entry(3, 9, "symptoms", { tags: ["dizziness"], severity: 4 }, M, "es",
      {
        note: "Se mareó al levantarse del sillón después del desayuno",
        noteEn: "He got dizzy standing up from the armchair after breakfast",
        flags: [{ severity: "watch", reason: "Dizziness — monitor orthostatic symptoms flagged at last visit (new HCTZ)" }],
      }),
    entry(3, 15, "bowel", { count: 0, consistency: "constipated" }, M, "es"),
    entry(3, 18, "activity", { ambulation_minutes: 10 }, T, "en", { note: "Cut the walk short, said he felt woozy" }),
    // ---------- day -2 ----------
    entry(2, 7, "glucose", { value: 68, context: "fasting" }, T, "en",
      {
        note: "He skipped breakfast before his walk again",
        flags: [{ severity: "urgent", reason: "Blood sugar 68 is low", advice: "Give juice or food now and recheck in 15 minutes." }],
      }),
    entry(2, 8, "blood_pressure", { systolic: 104, diastolic: 60, pulse: 84 }, T, "en",
      { flags: [{ severity: "watch", reason: "BP trending low since hydrochlorothiazide was started (baseline 107/58 in office)" }] }),
    entry(2, 22, "sleep", { duration_h: 5, quality: "very_poor", issues: ["confusion", "wandering"] }, M, "es",
      {
        note: "Lo encontré en la cocina a las 2 de la mañana, confundido, buscando sus llaves",
        noteEn: "I found him in the kitchen at 2 AM, confused, looking for his keys",
        flags: [{ severity: "watch", reason: "Nighttime wandering with confusion — new this week" }],
      }),
    entry(2, 20, "mood", { score: 2, behaviors: ["withdrawal", "frustration"] }, M, "es",
      { note: "Más callado, se frustra cuando no encuentra las palabras", noteEn: "Quieter, gets frustrated when he can't find words" }),
    // ---------- day -1 (yesterday) ----------
    entry(1, 8, "blood_pressure", { systolic: 100, diastolic: 58, pulse: 86 }, M, "es",
      { flags: [{ severity: "watch", reason: "BP trending low since hydrochlorothiazide was started" }] }),
    entry(1, 19, "activity", { ambulation_minutes: 0, fall: { occurred: true, injured: false, description: "Nearly fell getting up from bed; caught himself on the dresser" } }, M, "es",
      {
        note: "Casi se cae al levantarse de la cama, se agarró de la cómoda. No se golpeó.",
        noteEn: "He nearly fell getting up from bed and caught himself on the dresser. No injury.",
        flags: [{ severity: "urgent", reason: "A near-fall was recorded (no injury)" }],
      }),
    entry(1, 20, "symptoms", { tags: ["dizziness", "fatigue"], severity: 6 }, T, "en",
      {
        note: "Dizzy again tonight when he stood up, held the wall",
        flags: [{ severity: "watch", reason: "Recurrent orthostatic dizziness — 3rd episode this week" }],
      }),
    entry(1, 13, "meals", { meal_type: "lunch", completion_pct: 50 }, M, "es",
      { note: "Poco apetito", noteEn: "Little appetite" }),
    entry(1, 20, "weight", { value: 171.9 }, T, "en"),
    // ---------- today ----------
    entry(0, 8, "blood_pressure", { systolic: 98, diastolic: 56, pulse: 88 }, M, "es",
      { flags: [{ severity: "watch", reason: "BP 98/56 — lowest reading since HCTZ started" }] }),
    entry(0, 9, "symptoms", { tags: ["dizziness"], severity: 5 }, M, "es",
      {
        note: "Otra vez mareado al levantarse del desayuno",
        noteEn: "Dizzy again standing up from breakfast",
        flags: [{ severity: "watch", reason: "Recurrent orthostatic dizziness" }],
      }),
    entry(0, 12, "glucose", { value: 84, context: "before_meal" }, T, "en"),
    entry(0, 13, "mood", { score: 3 }, M, "es"),
  ];

  return {
    patient: {
      id: "p_howell",
      name: "Isreal Howell",
      dob: "1939-03-20",
      age: 87,
      photo: "👴🏽",
      conditions: [
        "Early Alzheimer's dementia",
        "Ischemic heart disease (heart attack 2019)",
        "Hypertension",
        "Type 2 diabetes (new)",
        "High cholesterol",
        "Anemia",
      ],
      medications: [
        { name: "Hydrochlorothiazide 25 mg", sig: "every morning", startedRecently: true },
        { name: "Metformin XR 500 mg", sig: "with dinner", startedRecently: true },
        { name: "Losartan 50 mg", sig: "daily" },
        { name: "Metoprolol succinate ER 100 mg", sig: "daily" },
        { name: "Atorvastatin 20 mg", sig: "at bedtime" },
        { name: "Aspirin 81 mg", sig: "daily" },
        { name: "Donepezil 5 mg", sig: "at bedtime" },
        { name: "Nitroglycerin spray", sig: "as needed for chest pain" },
      ],
      allergies: ["No known drug allergies"],
      dietFlags: ["Diabetic diet"],
      thresholds: {
        // caregiver-facing alerts fire ONLY at absolutely abnormal values (Dr.'s two-tier design)
        bp: { sysHigh: 180, sysLow: 90, diaHigh: 110, diaLow: 50 },
        glucose: { low: 70, high: 300 },
        weightGain: { lbs: 3, days: 2 },
      },
      lastVisitNote:
        "Last PCP visit (10 days ago, Dr. Sarah Kim): started hydrochlorothiazide 25 mg for BP (office BP was 107/58 — told to monitor for orthostatic symptoms/dizziness) and metformin XR 500 mg for new type 2 diabetes (fasting glucose ran 66 — counseled not to skip breakfast before morning walks). Potassium 5.16 at upper margin on losartan; repeat labs due. Duplicate statin removed at medication reconciliation. Return sooner for chest pain, dizziness, or medication intolerance.",
    },
    users: [
      { id: "u_maria", name: "María", relation: "Daughter · primary caregiver", role: "admin", lang: "es", avatar: "👩🏽" },
      { id: "u_tam", name: "Tam", relation: "Grandson", role: "caregiver", lang: "en", avatar: "🧑🏻" },
      { id: "u_rosa", name: "Rosa", relation: "Home aide (Tue/Thu)", role: "viewer", lang: "es", avatar: "👩🏻‍⚕️" },
    ],
    entries,
    // Short, scannable bubbles (Dr.'s request): BP + fall kept, two simple handoffs.
    messages: [
      { id: "m1", ts: d(2, 8), fromId: "u_maria", lang: "es", text: "Papá amaneció mareado. Presión 104/60 — ya lo anoté en la app.", pinned: false },
      { id: "m2", ts: d(2, 13), fromId: "u_tam", lang: "en", text: "Heading to class — Rosa takes over at 2pm. She knows about the new BP pill. 🤝", pinned: false },
      { id: "m3", ts: d(1, 20), fromId: "u_maria", lang: "es", text: "Casi se cae al levantarse 😢 No se golpeó. Hay que decírselo a la Dra. Kim.", pinned: false },
      { id: "m4", ts: d(1, 21), fromId: "u_tam", lang: "en", text: "I've got him tomorrow morning — will check BP after breakfast and log it.", pinned: false },
      { id: "m5", ts: d(9, 10), fromId: "u_maria", lang: "es", text: "📌 Lista de medicamentos actualizada. Las pastillas nuevas están en el pastillero azul.", pinned: true },
    ],
    appointments: [
      {
        id: "a_last", ts: d(10, 10), provider: "Dr. Sarah Kim", specialty: "Primary Care",
        location: "Bayview Health Medical Group", type: "primary_care", completed: true,
        visitSummary: "Started HCTZ 25 mg + metformin XR 500 mg. Monitor dizziness. Labs due at next visit.",
      },
      {
        id: "a_next", ts: plus(2, 10), provider: "Dr. Sarah Kim", specialty: "Primary Care",
        location: "Bayview Health Medical Group", type: "primary_care",
        notes: "Bring BP log · ask about dizziness since new pill · flu shot?",
      },
      {
        id: "a_lab", ts: plus(1, 8), provider: "Bayview Lab", specialty: "Blood draw (BMP, potassium)",
        location: "Bayview Health — 2nd floor", type: "lab", notes: "Fasting OK to skip — not a lipid panel",
      },
    ],
    reports: [],
    portalOutbox: [],
    portalRuns: [],
    lessons: [
      {
        id: "l1", ts: d(6, 10), scope: "language", source: "seed", caregiverId: "u_maria",
        text: "When María says he is \"pesado\" she means drowsy/sluggish — log as fatigue, not weight.",
      },
      {
        id: "l2", ts: d(4, 9), scope: "routine", source: "seed", caregiverId: "u_tam",
        text: "Tam checks BP mornings after breakfast; María checks evenings — attribute times accordingly when they say \"this morning/tonight\".",
      },
      {
        id: "l3", ts: d(1, 22), scope: "baseline", source: "seed",
        text: "His BP has run 98–114 systolic since hydrochlorothiazide started — readings there are his current normal; still log, don't alarm.",
      },
    ],
  };
}
