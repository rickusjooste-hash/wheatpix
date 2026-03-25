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
        background: "#0E1A07",
        color: "#F5EDDA",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
      }}
    >
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid #2D5A1B",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontSize: "20px",
                color: "#F5EDDA",
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
              color: "#F5C842",
              background: "rgba(245,200,66,0.15)",
              padding: "4px 8px",
              borderRadius: "4px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontFamily: "var(--font-jetbrains), 'Space Mono', monospace",
            }}
          >
            ADMIN
          </span>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link
            href="/admin"
            style={{ fontSize: "14px", color: "rgba(245,237,218,0.7)", textDecoration: "none" }}
          >
            Agente
          </Link>
          <Link
            href="/dashboard"
            style={{ fontSize: "14px", color: "rgba(245,237,218,0.5)", textDecoration: "none" }}
          >
            Dashboard →
          </Link>
        </div>
      </nav>
      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
    </div>
  );
}
