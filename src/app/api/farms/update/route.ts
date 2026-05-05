import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { farmId, name } = await req.json();
  if (!farmId || !name?.trim()) {
    return NextResponse.json({ error: "Plaas ID en naam is verpligtend" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nie aangemeld nie" }, { status: 401 });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify the user is a farm owner or super user
  const isSuperUser = user.user_metadata?.role === "super";
  if (!isSuperUser) {
    const { data: membership } = await admin
      .from("farm_members")
      .select("role")
      .eq("farm_id", farmId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Nie 'n eienaar van hierdie plaas nie" }, { status: 403 });
    }
  }

  const { data: farm, error } = await admin
    .from("farms")
    .update({ name: name.trim() })
    .eq("id", farmId)
    .select("id, name, client_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ farm });
}
