"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  email: string;
  fullName: string;
  clientNames: string[];
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "#fff",
  border: "1px solid #d4d4d0",
  borderRadius: "8px",
  color: "#1a1a1a",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export default function CreateAgent({
  existingAgents,
}: {
  existingAgents: Map<string, string[]>;
}) {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState("");

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

    const agentsRes = await fetch("/api/admin/agents");
    if (agentsRes.ok) {
      const agentsData = await agentsRes.json();
      setAgents(agentsData.agents);
    }
  };

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "10px 20px",
            background: "#1a1a1a",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Nuwe Agent
        </button>
      ) : (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", marginBottom: "16px", marginTop: 0 }}>
            Skep nuwe agent
          </h3>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="text" placeholder="Volle naam" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
            <input type="email" placeholder="E-pos" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Wagwoord" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={inputStyle} />

            {error && <div style={{ color: "#e8413c", fontSize: "13px" }}>{error}</div>}
            {success && <div style={{ color: "#4a9a4a", fontSize: "13px" }}>{success}</div>}

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: "10px 20px",
                  background: "#1a1a1a",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: creating ? "default" : "pointer",
                }}
              >
                {creating ? "Skep..." : "Skep Agent"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "10px 16px",
                  background: "#fff",
                  border: "1px solid #d4d4d0",
                  borderRadius: "8px",
                  color: "#6b6b6b",
                  fontSize: "13px",
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
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", marginBottom: "16px" }}>
          Agente
        </h2>
        {loading ? (
          <div style={{ color: "#999", fontSize: "14px" }}>Laai...</div>
        ) : agents.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "40px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              textAlign: "center",
              color: "#bbb",
            }}
          >
            Geen agente nog nie
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            {agents.map((agent, i) => (
              <div
                key={agent.id}
                style={{
                  padding: "16px 20px",
                  borderBottom: i < agents.length - 1 ? "1px solid #f0f0ec" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                    {agent.fullName || agent.email}
                  </div>
                  <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>
                    {agent.email}
                  </div>
                  {agent.clientNames.length > 0 && (
                    <div style={{ fontSize: "12px", color: "#bbb", marginTop: "4px" }}>
                      {agent.clientNames.join(", ")}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#D4890A",
                    background: "rgba(212,137,10,0.08)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontWeight: 600,
                    fontFamily: "var(--font-jetbrains), monospace",
                  }}
                >
                  {agent.clientNames.length} {agent.clientNames.length === 1 ? "kliënt" : "kliënte"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
