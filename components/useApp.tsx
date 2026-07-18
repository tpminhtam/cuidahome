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
}

const AppCtx = createContext<Ctx>({ state: null, refresh: async () => {}, user: null, setUserId: () => {} });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [userId, setUserIdRaw] = useState<string>("u_maria");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    setState(await res.json());
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("ch_uid");
    if (saved) setUserIdRaw(saved);
    refresh();
  }, [refresh]);

  const setUserId = (id: string) => {
    localStorage.setItem("ch_uid", id);
    setUserIdRaw(id);
  };

  const user = state?.users.find((u) => u.id === userId) ?? state?.users[0] ?? null;

  return <AppCtx.Provider value={{ state, refresh, user, setUserId }}>{children}</AppCtx.Provider>;
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
