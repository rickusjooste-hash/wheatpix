"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "400px",
        background: "#1A2E0D",
        borderRadius: "16px",
        padding: "40px 32px",
        border: "1px solid #2D5A1B",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            color: "#F5EDDA",
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
            marginBottom: "8px",
          }}
        >
          Wheat<span style={{ color: "#D4890A", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>Pıx</span>
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(245,237,218,0.5)" }}>
          Skep jou rekening
        </p>
      </div>

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              color: "#F5EDDA",
              marginBottom: "6px",
              fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
            }}
          >
            Volle naam
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#0E1A07",
              border: "1px solid #3A2006",
              borderRadius: "8px",
              color: "#F5EDDA",
              fontSize: "15px",
              fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              color: "#F5EDDA",
              marginBottom: "6px",
              fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
            }}
          >
            E-pos
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#0E1A07",
              border: "1px solid #3A2006",
              borderRadius: "8px",
              color: "#F5EDDA",
              fontSize: "15px",
              fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              color: "#F5EDDA",
              marginBottom: "6px",
              fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
            }}
          >
            Wagwoord
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#0E1A07",
              border: "1px solid #3A2006",
              borderRadius: "8px",
              color: "#F5EDDA",
              fontSize: "15px",
              fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(192,57,43,0.15)",
              border: "1px solid rgba(192,57,43,0.3)",
              borderRadius: "8px",
              color: "#C0392B",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "#3A2006" : "#F5C842",
            border: "none",
            borderRadius: "10px",
            color: "#0E1A07",
            fontSize: "16px",
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
            marginTop: "8px",
          }}
        >
          {loading ? "Registreer..." : "Registreer"}
        </button>
      </form>

      <p
        style={{
          textAlign: "center",
          marginTop: "24px",
          fontSize: "13px",
          color: "rgba(245,237,218,0.5)",
        }}
      >
        Reeds geregistreer?{" "}
        <Link
          href="/login"
          style={{ color: "#F5C842", textDecoration: "none" }}
        >
          Meld aan
        </Link>
      </p>
    </div>
  );
}
