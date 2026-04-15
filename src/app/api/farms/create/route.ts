import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { name, slug, clientId } = await req.json();
  if (!name || !slug) {
    return NextResponse.json({ error: "Naam is verpligtend" }, { status: 400 });
  }

  // Verify the user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nie aangemeld nie" }, { status: 401 });

  // Use service role to bypass RLS for the insert + farm_members setup
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: farm, error } = await admin
    .from("farms")
    .insert({ name, slug, client_id: clientId || null })
    .select("id, name, client_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add the creator as farm owner so RLS allows future access
  await admin.from("farm_members").insert({
    farm_id: farm.id,
    user_id: user.id,
    role: "owner",
  });

  return NextResponse.json({ farm });
}
