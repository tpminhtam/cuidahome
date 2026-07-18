export const metadata = { title: "Bayview Health — Patient Portal" };

// Deliberately fictional clinic portal ("Bayview Health") used to demo the
// computer-use agent. Plain, form-heavy, desktop-style — like the real thing.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#eef1f4", fontFamily: "Arial, Helvetica, sans-serif", color: "#1c2b39" }}>
      <header style={{ background: "#17558c", color: "#fff", padding: "14px 28px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🏥</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.2 }}>Bayview Health</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Patient Portal — fictional demo environment</div>
        </div>
      </header>
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>{children}</main>
    </div>
  );
}
