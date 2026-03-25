import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Service role client for admin operations on auth.users
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET /api/admin/agents — list all agent users
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "super") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const service = getServiceClient();

  // List all users
  const {
    data: { users },
    error,
  } = await service.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter to agents only
  const agentUsers = users.filter((u) => u.user_metadata?.role === "agent");

  // Get clients to show per-agent
  const { data: clients } = await service.from("clients").select("id, name, agent_id");
  const clientsByAgent = new Map<string, string[]>();
  if (clients) {
    for (const c of clients) {
      const list = clientsByAgent.get(c.agent_id) || [];
      list.push(c.name);
      clientsByAgent.set(c.agent_id, list);
    }
  }

  const agents = agentUsers.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.user_metadata?.full_name || "",
    clientNames: clientsByAgent.get(u.id) || [],
  }));

  return NextResponse.json({ agents });
}

// POST /api/admin/agents — create a new agent user
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "super") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, password, fullName } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const service = getServiceClient();

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "agent", full_name: fullName || "" },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.user.id, email: data.user.email });
}
