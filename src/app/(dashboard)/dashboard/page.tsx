import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import Link from "next/link";
import FarmList from "./farm-list";

export default async function DashboardPage() {
  const supabase = await createClient();
  const auth = await getUserRole(supabase);
  if (!auth) return null;

  // Query farms directly — RLS handles filtering based on role
  const { data: farmsData } = await supabase
    .from("farms" as never)
    .select("id, name, slug, client_id" as never)
    .order("name" as never);

  const farms = (farmsData || []) as unknown as {
    id: string;
    name: string;
    slug: string;
    client_id: string | null;
  }[];

  // Query clients (agents/super see their clients, client users see their own)
  const { data: clientsData } = await supabase
    .from("clients" as never)
    .select("id, name" as never)
    .order("name" as never);

  const clients = (clientsData || []) as unknown as { id: string; name: string }[];

  // Count blocks and inspections (RLS filters automatically)
  const { count: totalBlocks } = await supabase
    .from("blocks" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("is_active" as never, true as never);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count: totalInspections } = await supabase
    .from("camp_inspections" as never)
    .select("id" as never, { count: "exact", head: true })
    .gte("inspection_date" as never, thirtyDaysAgo.toISOString().split("T")[0] as never);

  const cardStyle: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #E2DED6",
    boxShadow: "0 1px 3px rgba(26,22,18,0.06)",
  };

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#0E1A07",
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
          }}
        >
          Oorsig
        </h1>
        <p style={{ fontSize: "14px", color: "#5C554B", marginTop: "4px" }}>
          {auth.user.email}
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {(auth.role === "super" || auth.role === "agent") && (
          <div style={cardStyle}>
            <div style={{ fontSize: "12px", color: "#8C847A", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1px" }}>
              Kliënte
            </div>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#2D5A1B", marginTop: "8px", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>
              {clients.length}
            </div>
            <Link href="/dashboard/clients" style={{ fontSize: "13px", color: "#D4890A", textDecoration: "none", marginTop: "8px", display: "inline-block" }}>
              Bestuur kliënte →
            </Link>
          </div>
        )}
        <div style={cardStyle}>
          <div style={{ fontSize: "12px", color: "#8C847A", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1px" }}>
            Plase
          </div>
          <div style={{ fontSize: "36px", fontWeight: 700, color: "#2D5A1B", marginTop: "8px", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>
            {farms.length}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "12px", color: "#8C847A", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1px" }}>
            Kampe
          </div>
          <div style={{ fontSize: "36px", fontWeight: 700, color: "#2D5A1B", marginTop: "8px", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>
            {totalBlocks || 0}
          </div>
          <Link href="/dashboard/blocks" style={{ fontSize: "13px", color: "#D4890A", textDecoration: "none", marginTop: "8px", display: "inline-block" }}>
            Bekyk kampe →
          </Link>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "12px", color: "#8C847A", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1px" }}>
            Inspeksies (30 dae)
          </div>
          <div style={{ fontSize: "36px", fontWeight: 700, color: "#2D5A1B", marginTop: "8px", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>
            {totalInspections || 0}
          </div>
          <Link href="/dashboard/history" style={{ fontSize: "13px", color: "#D4890A", textDecoration: "none", marginTop: "8px", display: "inline-block" }}>
            Bekyk geskiedenis →
          </Link>
        </div>
      </div>

      {/* Farm list with rename */}
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#0E1A07",
          fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
          marginBottom: "16px",
        }}
      >
        Plase
      </h2>
      <FarmList
        farms={farms.map((f) => ({
          id: f.id,
          name: f.name,
          slug: f.slug,
          role: auth.role,
        }))}
      />
    </div>
  );
}
