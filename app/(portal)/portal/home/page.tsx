import Link from "next/link";

const tile: React.CSSProperties = {
  background: "#fff", border: "1px solid #e1dfdd", borderRadius: 10, padding: "20px 14px",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
  textDecoration: "none", color: "#252423", textAlign: "center", fontSize: 14, fontWeight: 600,
};
const circle = (bg: string): React.CSSProperties => ({
  width: 52, height: 52, borderRadius: "50%", background: bg, display: "grid", placeItems: "center", fontSize: 24,
});

export default function PortalHome() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 18 }}>Welcome, Maria</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <div style={{ ...tile, opacity: 0.6 }}>
          <span style={circle("#e8f1f8")}>📅</span>Visits
        </div>
        <Link href="/portal/messages" style={tile}>
          <span style={circle("#fdeaea")}>✉️</span>Messages
        </Link>
        <div style={{ ...tile, opacity: 0.6 }}>
          <span style={circle("#eaf6ec")}>🧪</span>Test Results
        </div>
        <div style={{ ...tile, opacity: 0.6 }}>
          <span style={circle("#fdf3e7")}>💊</span>Medications
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e1dfdd", borderRadius: 10, padding: 20, marginTop: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Upcoming visit</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={circle("#f3e8f8")}>🩺</span>
          <div style={{ fontSize: 13, color: "#605e5c" }}>
            <b style={{ color: "#252423", fontSize: 14 }}>Dr. Tu Nguyen — Primary Care</b>
            <br />Monday 10:00 AM · Bayview Health Medical Group
          </div>
        </div>
      </div>
    </div>
  );
}
