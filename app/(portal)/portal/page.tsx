"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const box: React.CSSProperties = { background: "#fff", border: "1px solid #cfd8e0", borderRadius: 8, padding: 28 };
const input: React.CSSProperties = { display: "block", width: "100%", fontSize: 16, padding: "12px 12px", border: "1px solid #9db2c2", borderRadius: 6, marginTop: 6 };

export default function PortalLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pw) {
      setErr("Please enter your email and password.");
      return;
    }
    router.push("/portal/home");
  }

  return (
    <div style={{ maxWidth: 460, margin: "40px auto" }}>
      <div style={box}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Sign in</h1>
        <p style={{ fontSize: 13, color: "#5b6b7a", marginBottom: 18 }}>Access your health record, messages, and appointments.</p>
        <form onSubmit={submit}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>
            Email address
            <input id="email" style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginTop: 14 }}>
            Password
            <input id="password" style={input} type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          {err && <p style={{ color: "#b3402a", fontSize: 13, marginTop: 10 }}>{err}</p>}
          <button
            type="submit"
            style={{ marginTop: 18, width: "100%", background: "#17558c", color: "#fff", fontSize: 16, fontWeight: 700, padding: "12px 0", border: 0, borderRadius: 6, cursor: "pointer" }}
          >
            Sign in
          </button>
        </form>
      </div>
      <p style={{ fontSize: 12, color: "#5b6b7a", marginTop: 12, textAlign: "center" }}>
        Demo credentials: maria.alvarez@example.com · cuida2026
      </p>
    </div>
  );
}
