import { createClient } from "@/lib/supabase/server";
import CreateAgent from "./create-agent";

interface AgentRow {
  id: string;
  email: string;
  raw_user_meta_data: { full_name?: string; role?: string };
}

export default async function AdminPage() {
  const supabase = await createClient();

  // List all agent users (using service role via server client won't work for auth.users)
  // Instead query clients grouped by agent_id
  const { data: clients } = await supabase
    .from("clients" as never)
    .select("id, name, agent_id" as never);

  // Group clients by agent_id
  const agentMap = new Map<string, { clientCount: number; clientNames: string[] }>();
  if (clients) {
    for (const c of clients as unknown as { id: string; name: string; agent_id: string }[]) {
      const entry = agentMap.get(c.agent_id) || { clientCount: 0, clientNames: [] };
      entry.clientCount++;
      entry.clientNames.push(c.name);
      agentMap.set(c.agent_id, entry);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
            color: "#F5EDDA",
          }}
        >
          Agent Bestuur
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(245,237,218,0.5)", marginTop: "4px" }}>
          Skep en bestuur agente wat kliënte bedien
        </p>
      </div>

      <CreateAgent />

      {agentMap.size > 0 && (
        <div style={{ marginTop: "32px" }}>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "rgba(245,237,218,0.7)",
              marginBottom: "16px",
            }}
          >
            Agente met kliënte
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Array.from(agentMap.entries()).map(([agentId, info]) => (
              <div
                key={agentId}
                style={{
                  background: "#1A2E0D",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #2D5A1B",
                }}
              >
                <div style={{ fontSize: "12px", color: "rgba(245,237,218,0.4)", fontFamily: "var(--font-jetbrains), monospace" }}>
                  {agentId.slice(0, 8)}...
                </div>
                <div style={{ fontSize: "14px", color: "#F5EDDA", marginTop: "4px" }}>
                  {info.clientCount} {info.clientCount === 1 ? "kliënt" : "kliënte"}:
                  {" "}{info.clientNames.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
