// CuidaHome core types — mirrors Product Spec §2.1 (nine logging categories)

export type Lang = "en" | "es" | "zh";

export type Role = "admin" | "caregiver" | "viewer";

export interface User {
  id: string;
  name: string;
  relation: string; // "Daughter", "Grandson", "Home aide"…
  role: Role;
  lang: Lang;
  avatar: string; // emoji
}

export type Category =
  | "symptoms"
  | "blood_pressure"
  | "glucose"
  | "weight"
  | "meals"
  | "bowel"
  | "sleep"
  | "mood"
  | "activity";

export const CATEGORIES: { key: Category; label: string; labelEs: string; icon: string }[] = [
  { key: "symptoms", label: "Symptoms", labelEs: "Síntomas", icon: "🤒" },
  { key: "blood_pressure", label: "Blood Pressure", labelEs: "Presión", icon: "🫀" },
  { key: "glucose", label: "Blood Sugar", labelEs: "Glucosa", icon: "🩸" },
  { key: "weight", label: "Weight", labelEs: "Peso", icon: "⚖️" },
  { key: "meals", label: "Meals", labelEs: "Comidas", icon: "🍽️" },
  { key: "bowel", label: "Bowel", labelEs: "Intestinal", icon: "🚻" },
  { key: "sleep", label: "Sleep", labelEs: "Sueño", icon: "😴" },
  { key: "mood", label: "Mood", labelEs: "Ánimo", icon: "🙂" },
  { key: "activity", label: "Activity & Falls", labelEs: "Actividad", icon: "🚶" },
];

// ---- per-category data payloads (spec §2.1.1–2.1.9) ----
export interface SymptomData {
  tags: string[]; // fever, pain, shortness of breath, confusion, nausea, swelling, fatigue, dizziness, rash, cough…
  severity?: number; // 0-10
  location?: string;
  prn_med?: string; // as-needed med given
  prn_times?: number;
}
export interface BPData { systolic: number; diastolic: number; pulse?: number }
export interface GlucoseData { value: number; unit?: "mg/dL"; context?: "fasting" | "before_meal" | "after_meal" | "bedtime"; insulin_units?: number; insulin_type?: "rapid" | "long-acting" }
export interface WeightData { value: number; unit?: "lb" }
export interface MealData {
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  description?: string;
  completion_pct?: 0 | 25 | 50 | 75 | 100;
  dietary_flags?: string[]; // low sodium / diabetic / puree / thickened liquids / tube feeding
  issues?: string[]; // cough, choking
}
export interface BowelData { count?: number; consistency?: "formed" | "loose" | "constipated" }
export interface SleepData {
  duration_h?: number;
  bedtime?: string;
  wake_time?: string;
  quality?: "restful" | "restless" | "very_poor";
  issues?: string[]; // nighttime awakenings, confusion, wandering
  nap_minutes?: number;
}
export interface MoodData { score: 1 | 2 | 3 | 4 | 5; behaviors?: string[] } // 1 very poor → 5 very good
export interface ActivityData {
  ambulation_minutes?: number;
  fall?: { occurred: boolean; injured?: boolean; description?: string };
}

export type EntryData =
  | SymptomData | BPData | GlucoseData | WeightData | MealData
  | BowelData | SleepData | MoodData | ActivityData;

export interface Flag {
  severity: "urgent" | "watch";
  reason: string;
  advice?: string;
}

export interface Entry {
  id: string;
  ts: string; // ISO — when observed
  createdAt: string;
  category: Category;
  data: EntryData;
  note?: string; // caregiver's words, original language
  noteEn?: string; // English clinical translation when note is non-English
  lang: Lang;
  caregiverId: string;
  source: "voice" | "form" | "seed";
  flags: Flag[];
}

export interface Message {
  id: string;
  ts: string;
  fromId: string;
  text: string;
  lang: Lang;
  translations?: Partial<Record<Lang, string>>;
  pinned?: boolean;
}

export interface Appointment {
  id: string;
  ts: string;
  provider: string;
  specialty: string;
  location: string;
  type: "primary_care" | "specialist" | "lab" | "imaging" | "therapy" | "pharmacy" | "other";
  notes?: string;
  completed?: boolean;
  visitSummary?: string;
}

export interface PortalMessage {
  id: string;
  ts: string;
  to: string;
  subject: string;
  body: string;
  from: string;
}

export interface AgentStep {
  i: number;
  action: string;
  detail?: string;
  ts: string;
  screenshot?: string; // base64 png (small)
}

export interface PortalRun {
  id: string;
  state: "running" | "done" | "error";
  steps: AgentStep[];
  error?: string;
  startedAt: string;
}

export interface Report {
  id: string;
  appointmentId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  json: PreVisitReport;
}

// Structured output schema target for Claude.
// Per the physician's direction: 1/3 of a printed page MAX — a one-liner,
// one symptoms line, vital trends, one key flag, ONE question.
export interface PreVisitReport {
  one_liner: string;
  key_flag: string; // single most important red flag; "" if none
  symptoms_line: string;
  vitals: {
    blood_pressure: { summary: string; trend: "rising" | "falling" | "stable" };
    weight: { summary: string; trend: "rising" | "falling" | "stable" };
    glucose: { summary: string; trend: "rising" | "falling" | "stable" };
  };
  question_for_doctor: string;
}

export interface Thresholds {
  bp: { sysHigh: number; sysLow: number; diaHigh: number; diaLow: number };
  glucose: { low: number; high: number };
  weightGain: { lbs: number; days: number };
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  age: number;
  photo: string; // emoji
  conditions: string[];
  medications: { name: string; sig: string; startedRecently?: boolean }[];
  allergies: string[];
  dietFlags: string[];
  thresholds: Thresholds;
  lastVisitNote: string; // context from the most recent PCP visit (Abridge synthetic chart)
}

export interface DB {
  patient: Patient;
  users: User[];
  entries: Entry[];
  messages: Message[];
  appointments: Appointment[];
  reports: Report[];
  portalOutbox: PortalMessage[];
  portalRuns: PortalRun[];
}
