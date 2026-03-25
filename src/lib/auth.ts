import { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "super" | "agent" | "client";

export async function getUserRole(supabase: SupabaseClient): Promise<{
  user: { id: string; email: string };
  role: UserRole;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = (user.user_metadata?.role as UserRole) || "client";

  return {
    user: { id: user.id, email: user.email || "" },
    role,
  };
}
