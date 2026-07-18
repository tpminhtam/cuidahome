"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppProvider, useApp } from "./useApp";

function Header() {
  const { state, user, setUserId, uiLang, setUiLang } = useApp();
  if (!state || !user) return <div className="h-14" />;
  return (
    <header className="no-print flex items-center justify-between px-4 pt-4 pb-2">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-xl">🏡</span>
        <span className="font-bold tracking-tight text-lg">
          Cuida<span className="text-teal">Home</span>
        </span>
      </Link>
      <div className="flex items-center gap-1.5">
        <select
          className="card px-1.5 py-1 text-xs font-semibold"
          value={uiLang}
          onChange={(e) => setUiLang(e.target.value as "en" | "es")}
          aria-label="App language"
        >
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
        <select
          className="card px-2 py-1 text-sm font-semibold"
          value={user.id}
          onChange={(e) => setUserId(e.target.value)}
          aria-label="Switch caregiver"
        >
          {state.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.avatar} {u.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}

const TABS = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/timeline", icon: "📖", label: "Log" },
  { href: "/voice", icon: "🎙️", label: "" },
  { href: "/circle", icon: "💬", label: "Circle" },
  { href: "/report", icon: "🩺", label: "Visit" },
];

function TabBar() {
  const path = usePathname();
  return (
    <nav className="no-print border-t border-line bg-white/90 backdrop-blur px-2 py-1.5 flex items-end justify-around">
      {TABS.map((t) =>
        t.href === "/voice" ? (
          <Link
            key={t.href}
            href={t.href}
            aria-label="Voice check-in"
            className="relative -top-4 grid place-items-center w-14 h-14 rounded-full text-2xl shadow-lg"
            style={{ background: "var(--terra)", color: "#fff" }}
          >
            🎙️
          </Link>
        ) : (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-semibold ${
              path === t.href ? "text-teal" : "text-muted"
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </Link>
        )
      )}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="phone-wrap">
        <div className="phone">
          <Header />
          <main className="phone-scroll px-4 pb-6">{children}</main>
          <TabBar />
        </div>
      </div>
    </AppProvider>
  );
}
