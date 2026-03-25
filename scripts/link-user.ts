/**
 * Link a user to all existing farms as owner.
 * Usage: npx tsx scripts/link-user.ts --email user@example.com
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
  const emailIdx = process.argv.indexOf("--email");
  const email = emailIdx !== -1 ? process.argv[emailIdx + 1] : null;

  if (!email) {
    console.error("Usage: npx tsx scripts/link-user.ts --email user@example.com");
    process.exit(1);
  }

  // Find user
  const { data: userData, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) { console.error(userErr.message); process.exit(1); }

  const user = userData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) { console.error(`No user found: ${email}`); process.exit(1); }
  console.log(`Found user: ${user.id} (${user.email})`);

  // Get all farms
  const { data: farms } = await supabase.from("farms").select("id, name");
  if (!farms || farms.length === 0) { console.error("No farms found"); process.exit(1); }

  console.log(`Found ${farms.length} farms`);

  // Set user role to super
  const { error: roleErr } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, role: "super" },
  });
  if (roleErr) {
    console.error(`Failed to set role: ${roleErr.message}`);
  } else {
    console.log(`Set role to super`);
  }

  // Link user as owner to each farm (backward compatibility)
  for (const farm of farms) {
    const { error } = await supabase
      .from("farm_members")
      .upsert({ farm_id: farm.id, user_id: user.id, role: "owner" }, { onConflict: "farm_id,user_id" });

    if (error) {
      console.error(`  Failed to link to ${farm.name}: ${error.message}`);
    } else {
      console.log(`  Linked to: ${farm.name}`);
    }
  }

  console.log("\nDone!");
}

main().catch((err) => { console.error(err); process.exit(1); });
