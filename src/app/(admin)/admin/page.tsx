import { createClient } from "@/lib/supabase/server";
import CreateAgent from "./create-agent";
import Link from "next/link";

export default async function AdminPage() {
  const supabase = await createClient();

  // Get all clients to show per-agent stats
  const { data: clientsData } = await supabase
    .from("clients" as never)
    .select("id, name, agent_id" as never);

  const clients = (clientsData || []) as unknown as {
    id: string;
    name: string;
    agent_id: string;
  }[];

  // Group clients by agent_id
  const agentClientMap = new Map<string, string[]>();
  for (const c of clients) {
    const existing = agentClientMap.get(c.agent_id) || [];
    existing.push(c.name);
    agentClientMap.set(c.agent_id, existing);
  }

  // Get agent users via service-role admin API (server action)
  // We need to use a different approach since server components can't call admin API directly
  // Instead, list all agents we know about from clients table + fetch their details
  const agentIds = Array.from(agentClientMap.keys());

  // For now, show agents based on what we know from the clients table
  // Plus show the agent email by querying auth.users via a workaround

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

      <CreateAgent existingAgents={agentClientMap} />
    </div>
  );
}
