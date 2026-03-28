import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const auth = await getUserRole(supabase);

  if (!auth) redirect("/login");
  if (auth.role !== "super") redirect("/dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        color: "#1a1a1a",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
      }}
    >
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "#fff",
          borderBottom: "1px solid #e8e8e4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontSize: "20px",
                color: "#1a1a1a",
                fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
              }}
            >
              Wheat<span style={{ color: "#D4890A", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>Pıx</span>
            </span>
          </Link>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#D4890A",
              background: "rgba(212,137,10,0.1)",
              padding: "4px 8px",
              borderRadius: "4px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            ADMIN
          </span>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link href="/admin" style={{ fontSize: "14px", color: "#1a1a1a", textDecoration: "none", fontWeight: 500 }}>
            Agente
          </Link>
          <Link href="/dashboard" style={{ fontSize: "14px", color: "#999", textDecoration: "none" }}>
            Dashboard →
          </Link>
        </div>
      </nav>
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
        {children}
      </main>
    </div>
  );
}
