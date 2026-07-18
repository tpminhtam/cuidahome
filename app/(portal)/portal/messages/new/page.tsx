"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const input: React.CSSProperties = {
  display: "block", width: "100%", fontSize: 15, padding: "11px 12px",
  border: "1px solid #8a8886", borderRadius: 4, marginTop: 6, background: "#fff", fontFamily: "inherit",
};

const RECIPIENTS = [
  { name: "Dr. Sarah Kim — Primary Care", initials: "SK", note: "Your primary care office" },
  { name: "Nurse line — Bayview Primary Care", initials: "RN", note: "Non-urgent nursing questions" },
  { name: "Pharmacy — Bayview", initials: "Rx", note: "Refills and medication questions" },
];

export default function NewPortalMessage() {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return; // double-submit guard
    if (!to || !subject.trim() || !body.trim()) {
      setErr("Please choose a recipient and fill in the subject and message.");
      return;
    }
    setSending(true);
    await fetch("/api/portal/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body, from: "Maria Alvarez (caregiver proxy)" }),
    });
    router.push("/portal/messages");
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", border: "1px solid #e1dfdd", borderRadius: 10, padding: 26 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>New message</h1>
      <p style={{ fontSize: 13, color: "#605e5c", marginBottom: 16 }}>Your care team typically replies within 2 business days.</p>
      <form onSubmit={submit}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 700 }}>To the office of</legend>
          {RECIPIENTS.map((r) => (
            <label key={r.name} style={{
              display: "flex", alignItems: "center", gap: 12, fontSize: 15, padding: "12px 14px",
              border: to === r.name ? "2px solid #a41c30" : "1px solid #c8c6c4",
              borderRadius: 8, marginTop: 8, background: to === r.name ? "#fdf5f6" : "#fff", cursor: "pointer",
            }}>
              <input type="radio" name="to" value={r.name} checked={to === r.name} onChange={() => setTo(r.name)} style={{ width: 18, height: 18, accentColor: "#a41c30" }} />
              <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#f3e8f8", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, color: "#5c2d91" }}>{r.initials}</span>
              <span>
                <b style={{ display: "block", fontSize: 14 }}>{r.name}</b>
                <span style={{ fontSize: 12, color: "#605e5c" }}>{r.note}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginTop: 16 }}>
          Subject
          <input id="subject" style={input} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginTop: 14 }}>
          Message
          <textarea id="body" rows={11} style={{ ...input, resize: "vertical" }} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        {err && <p style={{ color: "#a41c30", fontSize: 13, marginTop: 10 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            type="submit"
            disabled={sending}
            style={{ background: "#a41c30", opacity: sending ? 0.6 : 1, color: "#fff", fontSize: 15, fontWeight: 700, padding: "12px 30px", border: 0, borderRadius: 22, cursor: "pointer" }}
          >
            {sending ? "Sending…" : "Send"}
          </button>
          <button type="button" onClick={() => router.push("/portal/messages")}
            style={{ background: "#fff", color: "#252423", fontSize: 15, fontWeight: 600, padding: "12px 22px", border: "1px solid #8a8886", borderRadius: 22, cursor: "pointer" }}>
            Discard
          </button>
        </div>
      </form>
    </div>
  );
}
