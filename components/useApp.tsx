"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Appointment, Entry, Message, Patient, PortalMessage, Report, User } from "@/lib/types";

export interface AppState {
  patient: Patient;
  users: User[];
  entries: Entry[];
  appointments: Appointment[];
  messages: Message[];
  portalOutbox: PortalMessage[];
  reports: Report[];
}

interface Ctx {
  state: AppState | null;
  refresh: () => Promise<void>;
  user: User | null;
  setUserId: (id: string) => void;
  uiLang: "en" | "es";
  setUiLang: (l: "en" | "es") => void;
  demoMode: boolean; // static preview (GitHub Pages): sample data, AI features off
}

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const AppCtx = createContext<Ctx>({
  state: null, refresh: async () => {}, user: null, setUserId: () => {},
  uiLang: "en", setUiLang: () => {}, demoMode: false,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [userId, setUserIdRaw] = useState<string>("u_maria");
  // App is English-first; language is an explicit setting, never inferred (Dr.'s feedback #1)
  const [uiLang, setUiLangRaw] = useState<"en" | "es">("en");
  const [demoMode, setDemoMode] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/state`, { cache: "no-store" });
      if (!res.ok) throw new Error("no api");
      setState(await res.json());
    } catch {
      // static preview (GitHub Pages): load the bundled sample snapshot
      const res = await fetch(`${BASE}/demo-db.json`, { cache: "no-store" });
      const db = await res.json();
      setState({
        patient: db.patient,
        users: db.users,
        entries: [...db.entries].sort((a: { ts: string }, b: { ts: string }) => b.ts.localeCompare(a.ts)),
        appointments: [...db.appointments].sort((a: { ts: string }, b: { ts: string }) => a.ts.localeCompare(b.ts)),
        messages: db.messages,
        portalOutbox: db.portalOutbox,
        reports: db.reports,
      });
      setDemoMode(true);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("ch_uid");
    if (saved) setUserIdRaw(saved);
    const savedLang = localStorage.getItem("ch_lang");
    if (savedLang === "es" || savedLang === "en") setUiLangRaw(savedLang);
    refresh();
  }, [refresh]);

  const setUserId = (id: string) => {
    localStorage.setItem("ch_uid", id);
    setUserIdRaw(id);
  };
  const setUiLang = (l: "en" | "es") => {
    localStorage.setItem("ch_lang", l);
    setUiLangRaw(l);
  };

  const user = state?.users.find((u) => u.id === userId) ?? state?.users[0] ?? null;

  return <AppCtx.Provider value={{ state, refresh, user, setUserId, uiLang, setUiLang, demoMode }}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
