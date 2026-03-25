"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateAgent() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Create user via Supabase auth (this requires admin/service role,
    // but signUp works for now — the super user will need to confirm)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: "agent" },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(`Agent ${email} geskep. Hulle kan nou aanmeld.`);
    setEmail("");
    setPassword("");
    setFullName("");
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "12px 24px",
          background: "#F5C842",
          border: "none",
          borderRadius: "10px",
          color: "#0E1A07",
          fontSize: "15px",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
        }}
      >
        + Nuwe Agent
      </button>
    );
  }

  return (
    <div
      style={{
        background: "#1A2E0D",
        borderRadius: "12px",
        padding: "24px",
        border: "1px solid #2D5A1B",
      }}
    >
      <h3
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "#F5EDDA",
          marginBottom: "16px",
        }}
      >
        Skep nuwe agent
      </h3>

      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="text"
          placeholder="Volle naam"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{
            padding: "12px 14px",
            background: "#0E1A07",
            border: "1px solid #3A2006",
            borderRadius: "8px",
            color: "#F5EDDA",
            fontSize: "14px",
          }}
        />
        <input
          type="email"
          placeholder="E-pos"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "12px 14px",
            background: "#0E1A07",
            border: "1px solid #3A2006",
            borderRadius: "8px",
            color: "#F5EDDA",
            fontSize: "14px",
          }}
        />
        <input
          type="password"
          placeholder="Wagwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{
            padding: "12px 14px",
            background: "#0E1A07",
            border: "1px solid #3A2006",
            borderRadius: "8px",
            color: "#F5EDDA",
            fontSize: "14px",
          }}
        />

        {error && (
          <div style={{ color: "#C0392B", fontSize: "13px" }}>{error}</div>
        )}
        {success && (
          <div style={{ color: "#2D5A1B", fontSize: "13px" }}>{success}</div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 24px",
              background: "#F5C842",
              border: "none",
              borderRadius: "8px",
              color: "#0E1A07",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Skep..." : "Skep Agent"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "1px solid #2D5A1B",
              borderRadius: "8px",
              color: "rgba(245,237,218,0.6)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Kanselleer
          </button>
        </div>
      </form>
    </div>
  );
}
