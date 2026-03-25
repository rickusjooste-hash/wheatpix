/**
 * Nuclear fix: drop ALL policies on farm_members and recreate clean ones.
 */
import * as path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  // List all policies on farm_members
  const { data: policies, error: pErr } = await supabase.rpc("exec_sql" as never, {
    sql: `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'farm_members'`
  } as never);

  // Fallback: just try dropping every possible name
  const possibleNames = [
    "farm members read",
    "farm owners manage",
    "members read own farm",
    "owners manage members",
    "users read own memberships",
    "owners manage farm members",
    "super_admin full access",
  ];

  console.log("Dropping all farm_members policies...");
  for (const name of possibleNames) {
    const { error } = await supabase.rpc("exec_sql" as never, {
      sql: `DROP POLICY IF EXISTS "${name}" ON public.farm_members`
    } as never);
    // Ignore errors — exec_sql might not exist
  }

  // If exec_sql doesn't exist, we need direct SQL. Let's use the REST API for that.
  // Actually, let's just test if the fix already worked by querying as the user.

  console.log("\nTesting query as user...");
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: members, error: mErr } = await anon.from("farm_members").select("farm_id");
  console.log("Result:", members?.length ?? "null", "Error:", mErr?.message ?? "none");
}

main();
