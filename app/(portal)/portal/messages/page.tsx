"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalMessage } from "@/lib/types";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e1dfdd", borderRadius: 10, padding: 18 };

export default function PortalMessages() {
  const [outbox, setOutbox] = useState<PortalMessage[]>([]);
  useEffect(() => {
    const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const load = () =>
      fetch(`${BASE}/api/state`)
        .then((r) => (r.ok ? r.json() : fetch(`${BASE}/demo-db.json`).then((x) => x.json())))
        .then((d) => setOutbox(d.portalOutbox ?? []))
        .catch(() => fetch(`${BASE}/demo-db.json`).then((x) => x.json()).then((d) => setOutbox(d.portalOutbox ?? [])).catch(() => {}));
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Message Center</h1>
        <Link
          href="/portal/messages/new"
          style={{ background: "#a41c30", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 22, textDecoration: "none" }}
        >
          ✉️ Send a message
        </Link>
      </div>

      <div style={{ display: "flex", gap: 18, borderBottom: "2px solid #e1dfdd", marginBottom: 14, fontSize: 14, fontWeight: 600 }}>
        <span style={{ padding: "8px 2px", color: "#605e5c" }}>Conversations</span>
        <span style={{ padding: "8px 2px", borderBottom: "3px solid #a41c30", color: "#a41c30" }}>Sent</span>
        <span style={{ padding: "8px 2px", color: "#605e5c" }}>Bookmarked</span>
      </div>

      {outbox.length === 0 && <div style={{ ...card, color: "#605e5c", fontSize: 14 }}>No sent messages.</div>}
      <div style={{ display: "grid", gap: 12 }}>
        {[...outbox].reverse().map((m) => (
          <div key={m.id} style={card}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#f3e8f8", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>🩺</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <b style={{ fontSize: 15 }}>{m.subject}</b>
                  <span style={{ fontSize: 12, color: "#605e5c", whiteSpace: "nowrap" }}>{new Date(m.ts).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: "#605e5c", margin: "3px 0 10px" }}>
                  To: {m.to} · From: {m.from} · <b style={{ color: "#107c10" }}>Sent ✓</b>
                </div>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.55, margin: 0, color: "#252423" }}>{m.body}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
