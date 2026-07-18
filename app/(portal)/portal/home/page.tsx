import Link from "next/link";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #cfd8e0", borderRadius: 8, padding: 22, display: "block", textDecoration: "none", color: "#1c2b39" };

export default function PortalHome() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Welcome, Maria Alvarez</h1>
      <p style={{ fontSize: 13, color: "#5b6b7a", marginBottom: 20 }}>Caregiver proxy access for: <b>Isreal Howell</b> (DOB 03/20/1939)</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Link href="/portal/messages" style={card}>
          <div style={{ fontSize: 26 }}>✉️</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Messages</div>
          <div style={{ fontSize: 12, color: "#5b6b7a" }}>Message your care team</div>
        </Link>
        <div style={{ ...card, opacity: 0.55 }}>
          <div style={{ fontSize: 26 }}>📅</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Appointments</div>
          <div style={{ fontSize: 12, color: "#5b6b7a" }}>Thu 10:00 AM — Dr. Sarah Kim</div>
        </div>
        <div style={{ ...card, opacity: 0.55 }}>
          <div style={{ fontSize: 26 }}>🧪</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Test results</div>
          <div style={{ fontSize: 12, color: "#5b6b7a" }}>No new results</div>
        </div>
      </div>
    </div>
  );
}
