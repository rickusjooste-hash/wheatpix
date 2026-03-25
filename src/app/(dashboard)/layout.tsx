import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "./dashboard/logout-button";

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
        background: "#F5EDDA",
        color: "#0E1A07",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
      }}
    >
      {/* Top nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "#0E1A07",
          borderBottom: "1px solid #2D5A1B",
        }}
      >
        <Link
          href="/dashboard"
          style={{ textDecoration: "none" }}
        >
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

        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: "14px",
              color: "rgba(245,237,218,0.7)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Oorsig
          </Link>
          {isAgent && (
            <Link
              href="/dashboard/clients"
              style={{
                fontSize: "14px",
                color: "rgba(245,237,218,0.7)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Kliënte
            </Link>
          )}
          <Link
            href="/dashboard/blocks"
            style={{
              fontSize: "14px",
              color: "rgba(245,237,218,0.7)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Kampe
          </Link>
          <Link
            href="/dashboard/history"
            style={{
              fontSize: "14px",
              color: "rgba(245,237,218,0.7)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Geskiedenis
          </Link>
          <Link
            href="/inspections/new"
            style={{
              fontSize: "13px",
              color: "#0E1A07",
              background: "#F5C842",
              padding: "8px 16px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            + Inspeksie
          </Link>
          {isSuper && (
            <Link
              href="/admin"
              style={{
                fontSize: "11px",
                color: "#F5C842",
                background: "rgba(245,200,66,0.15)",
                padding: "6px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: 700,
                letterSpacing: "0.5px",
                fontFamily: "var(--font-jetbrains), monospace",
              }}
            >
              ADMIN
            </Link>
          )}
          <LogoutButton />
        </div>
      </nav>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
    </div>
  );
}
