"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalMessage } from "@/lib/types";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #cfd8e0", borderRadius: 8, padding: 20 };

export default function PortalMessages() {
  const [outbox, setOutbox] = useState<PortalMessage[]>([]);
  useEffect(() => {
    const load = () => fetch("/api/state").then((r) => r.json()).then((d) => setOutbox(d.portalOutbox ?? []));
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Messages</h1>
        <Link
          href="/portal/messages/new"
          style={{ background: "#17558c", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 6, textDecoration: "none" }}
        >
          ✉️ New message
        </Link>
      </div>
      {outbox.length === 0 && (
        <div style={{ ...card, color: "#5b6b7a", fontSize: 14 }}>No messages yet.</div>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {[...outbox].reverse().map((m) => (
          <div key={m.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <b style={{ fontSize: 15 }}>{m.subject}</b>
              <span style={{ fontSize: 12, color: "#5b6b7a", whiteSpace: "nowrap" }}>{new Date(m.ts).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 12, color: "#5b6b7a", margin: "4px 0 10px" }}>
              To: {m.to} · From: {m.from} · Status: <b style={{ color: "#1c7a43" }}>Sent ✓</b>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{m.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
