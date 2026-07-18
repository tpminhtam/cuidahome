"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const input: React.CSSProperties = {
  display: "block", width: "100%", fontSize: 16, padding: "12px 12px",
  border: "1px solid #8a8886", borderRadius: 4, marginTop: 6,
};

export default function PortalLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pw) {
      setErr("Please enter your username and password.");
      return;
    }
    router.push("/portal/home");
  }

  return (
    <div style={{ maxWidth: 420, margin: "36px auto" }}>
      <div style={{ background: "#fff", border: "1px solid #e1dfdd", borderRadius: 10, padding: 30 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 26, fontStyle: "italic", color: "#a41c30" }}>BayChart</div>
          <div style={{ fontSize: 12, color: "#605e5c" }}>Bayview Health patient portal</div>
        </div>
        <form onSubmit={submit}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>
            Username or email
            <input id="email" style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginTop: 14 }}>
            Password
            <input id="password" style={input} type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          {err && <p style={{ color: "#a41c30", fontSize: 13, marginTop: 10 }}>{err}</p>}
          <button
            type="submit"
            style={{ marginTop: 18, width: "100%", background: "#a41c30", color: "#fff", fontSize: 16, fontWeight: 700, padding: "12px 0", border: 0, borderRadius: 22, cursor: "pointer" }}
          >
            Sign in
          </button>
        </form>
        <p style={{ fontSize: 12, color: "#a41c30", marginTop: 14, textAlign: "center" }}>Forgot username? · Forgot password?</p>
      </div>
      <p style={{ fontSize: 12, color: "#605e5c", marginTop: 12, textAlign: "center" }}>
        Demo credentials: maria.alvarez@example.com · cuida2026
      </p>
    </div>
  );
}
