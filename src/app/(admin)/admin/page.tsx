import { createClient } from "@/lib/supabase/server";
import CreateAgent from "./create-agent";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: clientsData } = await supabase
    .from("clients" as never)
    .select("id, name, agent_id" as never);

  const clients = (clientsData || []) as unknown as {
    id: string;
    name: string;
    agent_id: string;
  }[];

  const agentClientMap = new Map<string, string[]>();
  for (const c of clients) {
    const existing = agentClientMap.get(c.agent_id) || [];
    existing.push(c.name);
    agentClientMap.set(c.agent_id, existing);
  }

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          Agent Bestuur
        </h1>
        <p style={{ fontSize: "14px", color: "#999", marginTop: "4px" }}>
          Skep en bestuur agente wat kliënte bedien
        </p>
      </div>
      <CreateAgent existingAgents={agentClientMap} />
    </div>
  );
}
