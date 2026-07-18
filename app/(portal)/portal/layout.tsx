export const metadata = { title: "BayChart — Bayview Health" };

// Fictional patient portal styled in the familiar MyChart *genre* (maroon header,
// shortcut tiles, Message Center) — deliberately NOT Epic branding: "BayChart"
// for the fictional Bayview Health system. Recognition without impersonation.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f3f2ef", fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif", color: "#252423" }}>
      <header style={{ background: "#a41c30", color: "#fff", padding: "0 22px", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 20, cursor: "pointer" }}>☰</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5, fontStyle: "italic" }}>BayChart</span>
          <span style={{ fontSize: 12, opacity: 0.9, borderLeft: "1px solid rgba(255,255,255,.4)", paddingLeft: 10 }}>Bayview Health</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Maria Alvarez ▾</span>
          <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", color: "#a41c30", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>MA</span>
        </div>
      </header>
      <div style={{ background: "#fff", borderBottom: "1px solid #e1dfdd", padding: "8px 22px", fontSize: 12, color: "#605e5c" }}>
        Caring for: <b style={{ color: "#252423" }}>Isreal Howell</b> (proxy access) · fictional demo environment
      </div>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "26px 20px" }}>{children}</main>
    </div>
  );
}
