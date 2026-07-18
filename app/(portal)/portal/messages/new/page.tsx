"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const input: React.CSSProperties = { display: "block", width: "100%", fontSize: 15, padding: "11px 12px", border: "1px solid #9db2c2", borderRadius: 6, marginTop: 6, background: "#fff", fontFamily: "inherit" };

export default function NewPortalMessage() {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to || !subject.trim() || !body.trim()) {
      setErr("Please choose a recipient and fill in the subject and message.");
      return;
    }
    await fetch("/api/portal/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body, from: "Maria Alvarez (caregiver proxy)" }),
    });
    router.push("/portal/messages");
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", border: "1px solid #cfd8e0", borderRadius: 8, padding: 26 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>New message to your care team</h1>
      <form onSubmit={submit}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 700 }}>To</legend>
          {["Dr. Sarah Kim — Primary Care", "Nurse line — Bayview Primary Care", "Pharmacy — Bayview"].map((r) => (
            <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "10px 12px", border: "1px solid #9db2c2", borderRadius: 6, marginTop: 6, background: to === r ? "#e8f0f8" : "#fff", cursor: "pointer" }}>
              <input type="radio" name="to" value={r} checked={to === r} onChange={() => setTo(r)} style={{ width: 18, height: 18 }} />
              {r}
            </label>
          ))}
        </fieldset>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginTop: 14 }}>
          Subject
          <input id="subject" style={input} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginTop: 14 }}>
          Message
          <textarea id="body" rows={12} style={{ ...input, resize: "vertical" }} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        {err && <p style={{ color: "#b3402a", fontSize: 13, marginTop: 10 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            type="submit"
            style={{ background: "#17558c", color: "#fff", fontSize: 15, fontWeight: 700, padding: "12px 26px", border: 0, borderRadius: 6, cursor: "pointer" }}
          >
            Send message
          </button>
          <button type="button" onClick={() => router.push("/portal/messages")}
            style={{ background: "#e6ebf0", color: "#1c2b39", fontSize: 15, fontWeight: 600, padding: "12px 20px", border: "1px solid #cfd8e0", borderRadius: 6, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
