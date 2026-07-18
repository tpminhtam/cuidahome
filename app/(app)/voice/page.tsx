"use client";

import { useEffect, useRef, useState } from "react";
import EntryCard from "@/components/EntryCard";
import { useApp } from "@/components/useApp";
import { Entry, Flag, Lang } from "@/lib/types";

// Minimal Web Speech API typings
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}
declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type Turn =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "entries"; entries: Entry[] }
  | { kind: "flags"; flags: Flag[] };

export default function VoicePage() {
  const { state, user, refresh } = useApp();
  const [lang, setLang] = useState<Lang | null>(null);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const convoRef = useRef<unknown[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // English-first; the caregiver picks their spoken language explicitly
  const effLang: Lang = lang ?? "en";
  const es = effLang === "es";
  const SPEECH_LANG: Record<Lang, string> = { en: "en-US", es: "es-US", zh: "zh-CN" };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [turns, interim]);

  function speak(text: string) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH_LANG[effLang];
      u.rate = 1.02;
      window.speechSynthesis.speak(u);
    } catch {
      /* no TTS available */
    }
  }

  async function send(text: string) {
    if (!text.trim() || !user) return;
    setErr(null);
    setBusy(true);
    setTurns((t) => [...t, { kind: "user", text }]);
    convoRef.current = [...convoRef.current, { role: "user", content: text }];
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: convoRef.current, caregiverId: user.id, lang: effLang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message ?? "Something went wrong.");
        return;
      }
      convoRef.current = data.messages;
      const adds: Turn[] = [];
      if (data.entries?.length) adds.push({ kind: "entries", entries: data.entries });
      const urgent = (data.flags as Flag[] | undefined)?.filter((f) => f.severity === "urgent") ?? [];
      if (urgent.length) adds.push({ kind: "flags", flags: urgent });
      if (data.reply) adds.push({ kind: "assistant", text: data.reply });
      setTurns((t) => [...t, ...adds]);
      if (data.reply) speak(data.reply);
      refresh();
    } catch {
      setErr("Network error — is the dev server running?");
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setErr(es ? "Este navegador no soporta dictado — usa Chrome, o escribe abajo." : "This browser doesn't support speech — use Chrome, or type below.");
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[effLang];
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      setInterim(finalRef.current + interimText);
    };
    rec.onend = () => {
      setRecording(false);
      setInterim("");
      const text = finalRef.current.trim();
      if (text) send(text);
    };
    rec.onerror = () => {
      setRecording(false);
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
  }

  if (!state || !user) return <p className="text-muted text-sm p-6 text-center">Loading…</p>;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="font-bold text-lg">{es ? "Chequeo por voz" : "Voice check-in"}</h1>
          <p className="text-[11px] text-muted">
            {es ? "Habla natural — yo estructuro el registro" : "Speak naturally — I'll structure the log"}
          </p>
        </div>
        <div className="flex gap-1">
          {(["en", "es", "zh"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="chip"
              style={effLang === l ? { background: "var(--teal)", color: "#fff", borderColor: "var(--teal)" } : {}}
            >
              {l === "en" ? "EN" : l === "es" ? "ES" : "中文"}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 py-1" style={{ minHeight: 220 }}>
        {turns.length === 0 && !interim && (
          <div className="card p-4 text-sm text-muted leading-relaxed">
            {es ? (
              <>
                Prueba: <em>“Papá se mareó al levantarse del desayuno. Le tomé la presión: 98 con 56. Anoche lo encontré en la cocina a las 2, confundido. Comió la mitad del almuerzo.”</em>
              </>
            ) : (
              <>
                Try: <em>“Dad got dizzy standing up after breakfast. His blood pressure was 98 over 56. Last night I found him in the kitchen at 2 AM, confused. He ate half his lunch.”</em>
              </>
            )}
          </div>
        )}
        {turns.map((t, i) => {
          if (t.kind === "user")
            return (
              <p key={i} className="ml-8 rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white" style={{ background: "var(--teal)" }}>
                {t.text}
              </p>
            );
          if (t.kind === "assistant")
            return (
              <p key={i} className="mr-8 card rounded-bl-sm px-3 py-2 text-sm">
                {t.text}
              </p>
            );
          if (t.kind === "flags")
            return (
              <div key={i} className="card flag-urgent p-3">
                <p className="text-xs font-bold uppercase tracking-wide">⚠ {es ? "Alerta para el equipo" : "Alert for the care team"}</p>
                {t.flags.map((f, j) => (
                  <p key={j} className="text-sm mt-1 leading-snug">
                    {f.reason}
                    {f.advice && <span className="block text-xs mt-0.5 opacity-90">→ {f.advice}</span>}
                  </p>
                ))}
              </div>
            );
          return (
            <div key={i} className="space-y-2">
              {t.entries.map((e) => (
                <EntryCard key={e.id} e={e} users={state.users} compact />
              ))}
            </div>
          );
        })}
        {interim && <p className="ml-8 rounded-2xl px-3 py-2 text-sm text-white/95 opacity-80" style={{ background: "var(--teal)" }}>{interim}…</p>}
        {busy && <p className="mr-8 card px-3 py-2 text-sm text-muted">{es ? "Anotando…" : "Logging…"} ✍️</p>}
        {err && <p className="card flag-urgent p-3 text-sm">{err}</p>}
      </div>

      <div className="no-print pt-2 space-y-2">
        <button
          onClick={toggleMic}
          disabled={busy}
          className={`w-full rounded-2xl py-4 font-bold text-white text-base ${recording ? "recording" : ""}`}
          style={{ background: recording ? "var(--urgent)" : "var(--terra)" }}
        >
          {recording ? (es ? "⏹ Toca para terminar" : "⏹ Tap to finish") : es ? "🎙️ Toca y habla" : "🎙️ Tap & talk"}
        </button>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = typed;
            setTyped("");
            send(t);
          }}
        >
          <input
            className="card flex-1 px-3 py-2 text-sm"
            placeholder={es ? "…o escribe aquí" : "…or type here"}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button className="btn-primary text-sm" disabled={busy || !typed.trim()}>
            {es ? "Enviar" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
