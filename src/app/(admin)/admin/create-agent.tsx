"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Agent {
  id: string;
  email: string;
  fullName: string;
  clientNames: string[];
}

export default function CreateAgent({
  existingAgents,
}: {
  existingAgents: Map<string, string[]>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState("");

  // Load agent details
  useEffect(() => {
    async function loadAgents() {
      const res = await fetch("/api/admin/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
      }
      setLoading(false);
    }
    loadAgents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kon nie agent skep nie");
      setCreating(false);
      return;
    }

    setSuccess(`Agent ${email} geskep.`);
    setEmail("");
    setPassword("");
    setFullName("");
    setCreating(false);
    setOpen(false);
    router.refresh();

    // Reload agents list
    const agentsRes = await fetch("/api/admin/agents");
    if (agentsRes.ok) {
      const agentsData = await agentsRes.json();
      setAgents(agentsData.agents);
    }
  };

  return (
    <div>
      {/* Create button / form */}
      {!open ? (
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
      ) : (
        <div
          style={{
            background: "#1A2E0D",
            borderRadius: "12px",
            padding: "24px",
            border: "1px solid #2D5A1B",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F5EDDA", marginBottom: "16px" }}>
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

            {error && <div style={{ color: "#C0392B", fontSize: "13px" }}>{error}</div>}
            {success && <div style={{ color: "#4a9a4a", fontSize: "13px" }}>{success}</div>}

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: "12px 24px",
                  background: "#F5C842",
                  border: "none",
                  borderRadius: "8px",
                  color: "#0E1A07",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: creating ? "default" : "pointer",
                }}
              >
                {creating ? "Skep..." : "Skep Agent"}
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
      )}

      {/* Agent list */}
      <div style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "rgba(245,237,218,0.7)", marginBottom: "16px" }}>
          Agente
        </h2>
        {loading ? (
          <div style={{ color: "rgba(245,237,218,0.4)", fontSize: "13px" }}>Laai...</div>
        ) : agents.length === 0 ? (
          <div
            style={{
              background: "#1A2E0D",
              borderRadius: "12px",
              padding: "32px",
              border: "1px solid #2D5A1B",
              textAlign: "center",
              color: "rgba(245,237,218,0.4)",
            }}
          >
            Geen agente nog nie
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {agents.map((agent) => (
              <div
                key={agent.id}
                style={{
                  background: "#1A2E0D",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #2D5A1B",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#F5EDDA" }}>
                      {agent.fullName || agent.email}
                    </div>
                    <div style={{ fontSize: "13px", color: "rgba(245,237,218,0.5)", marginTop: "2px" }}>
                      {agent.email}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#F5C842",
                      background: "rgba(245,200,66,0.1)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    {agent.clientNames.length} {agent.clientNames.length === 1 ? "kliënt" : "kliënte"}
                  </div>
                </div>
                {agent.clientNames.length > 0 && (
                  <div style={{ fontSize: "12px", color: "rgba(245,237,218,0.4)", marginTop: "8px" }}>
                    {agent.clientNames.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
