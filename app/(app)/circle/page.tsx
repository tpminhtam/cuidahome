"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtTime, timeAgo, useApp } from "@/components/useApp";
import { Message, User } from "@/lib/types";

type DisplayMessage = Message & { display: string; translated: boolean };

export default function Circle() {
  const { state, user, uiLang, demoMode } = useApp();
  const [msgs, setMsgs] = useState<DisplayMessage[]>([]);
  const [text, setText] = useState("");
  const [showOrig, setShowOrig] = useState<string | null>(null);
  const [xlate, setXlate] = useState<"en" | "es" | "zh" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // the language this viewer READS in (translation target); writing language = same
  const lang = xlate ?? uiLang;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?lang=${lang}`, { cache: "no-store" });
      if (!res.ok) throw new Error("no api");
      const data = await res.json();
      setMsgs(data.messages);
    } catch {
      // static preview: show messages with any pre-cached translations
      setMsgs(
        (stateRef.current?.messages ?? []).map((m) => ({
          ...m,
          display: m.lang === lang ? m.text : m.translations?.[lang] ?? m.text,
          translated: m.lang !== lang && !!m.translations?.[lang],
        }))
      );
    }
  }, [lang]);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    load();
    if (demoMode) return;
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load, demoMode, state]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999 });
  }, [msgs.length]);

  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;
  const es = lang === "es";
  const who = (id: string): User | undefined => state.users.find((u) => u.id === id);
  const pinned = msgs.filter((m) => m.pinned);

  async function send() {
    if (!text.trim()) return;
    const t = text;
    setText("");
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: user!.id, text: t, lang }),
      });
      load();
    } catch {
      setMsgs((m) => [...m, { id: `local_${Date.now()}`, ts: new Date().toISOString(), fromId: user!.id, text: t, lang, display: t, translated: false }]);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-bold text-lg">{es ? "Círculo de cuidado" : "Care circle"}</h1>
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-muted">{es ? "Leo en" : "I read in"}</span>
            {(["en", "es", "zh"] as const).map((l) => (
              <button key={l} className="chip" onClick={() => setXlate(l)}
                style={lang === l ? { background: "var(--teal)", color: "#fff", borderColor: "var(--teal)" } : {}}>
                {l === "en" ? "EN" : l === "es" ? "ES" : "中文"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted">
          {state.users.map((u) => `${u.avatar} ${u.name}`).join(" · ")} —{" "}
          {es ? "cada quien lee en su idioma" : "everyone reads in their own language"}
        </p>
      </div>

      {pinned.length > 0 && (
        <div className="card p-2.5 mb-2 text-xs" style={{ background: "var(--watch-soft)" }}>
          📌 {pinned[0].display}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 py-1" style={{ minHeight: 200 }}>
        {msgs.filter((m) => !m.pinned).map((m) => {
          const mine = m.fromId === user.id;
          const sender = who(m.fromId);
          return (
            <div key={m.id} className={mine ? "ml-10" : "mr-10"}>
              <div
                className={`rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-sm text-white" : "card rounded-bl-sm"}`}
                style={mine ? { background: "var(--teal)" } : {}}
              >
                {!mine && (
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: "var(--terra)" }}>
                    {sender?.avatar} {sender?.name} · {sender?.relation}
                  </p>
                )}
                <p className="leading-snug">{showOrig === m.id ? m.text : m.display}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-muted"}`}>
                  {timeAgo(m.ts)} · {fmtTime(m.ts)}
                  {m.translated && (
                    <button
                      className="ml-1.5 underline"
                      onClick={() => setShowOrig(showOrig === m.id ? null : m.id)}
                    >
                      {showOrig === m.id
                        ? es ? "ver traducción" : "see translation"
                        : `🌐 ${es ? "traducido" : "translated"} — ${es ? "ver original" : "see original"}`}
                    </button>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="no-print flex gap-2 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="card flex-1 px-3 py-2.5 text-sm"
          placeholder={es ? "Escribe en tu idioma…" : "Write in your language…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary text-sm" disabled={!text.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
