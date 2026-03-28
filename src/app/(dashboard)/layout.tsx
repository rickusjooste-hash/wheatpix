import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const auth = await getUserRole(supabase);

  if (!auth) redirect("/login");

  const isSuper = auth.role === "super";
  const isAgent = auth.role === "agent" || isSuper;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        color: "#1a1a1a",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
      }}
    >
      <Sidebar
        userEmail={auth.user.email}
        isAgent={isAgent}
        isSuper={isSuper}
      />
      <main
        style={{
          marginLeft: "240px",
          minHeight: "100vh",
          padding: "40px 48px",
        }}
      >
        <div style={{ maxWidth: "1100px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
