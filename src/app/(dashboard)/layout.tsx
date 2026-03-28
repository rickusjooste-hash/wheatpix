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
        background: "#0a0f05",
        color: "#F5EDDA",
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
          marginLeft: "220px",
          minHeight: "100vh",
          padding: "32px 40px",
          transition: "margin-left 0.2s ease",
        }}
      >
        {children}
      </main>
    </div>
  );
}
