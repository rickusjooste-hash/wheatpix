import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const auth = await getUserRole(supabase);
  if (!auth) return null;

  const isAgent = auth.role === "agent" || auth.role === "super";

  // Stats
  const [clientsRes, farmsRes, blocksRes, inspectionsRes, recentRes] = await Promise.all([
    isAgent
      ? supabase.from("clients").select("id", { count: "exact", head: true })
      : { count: null },
    supabase.from("farms").select("id", { count: "exact", head: true }),
    supabase.from("blocks").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("camp_inspections")
      .select("id", { count: "exact", head: true })
      .gte("inspection_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]),
    supabase
      .from("camp_inspections")
      .select("id, inspection_date, notes, blocks(name), inspection_stages(name), camp_inspection_weeds(severity)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    ...(isAgent ? [{ label: "Kliënte", value: clientsRes.count || 0, href: "/dashboard/clients" }] : []),
    { label: "Plase", value: farmsRes.count || 0, href: "/dashboard/farms" },
    { label: "Kampe", value: blocksRes.count || 0, href: "/dashboard/farms" },
    { label: "Inspeksies (30d)", value: inspectionsRes.count || 0, href: "/dashboard/history" },
  ];

  const recent = (recentRes.data || []) as unknown as {
    id: string;
    inspection_date: string;
    notes: string | null;
    blocks: { name: string } | null;
    inspection_stages: { name: string } | null;
    camp_inspection_weeds: { severity: number }[];
  }[];

  const severityColors = ["#333", "#5a8a5a", "#d4a017", "#e87b35", "#e8413c"];

  return (
    <div>
      {/* Welcome header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#F5EDDA", margin: 0 }}>
          Oorsig
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(245,237,218,0.4)", margin: "6px 0 0" }}>
          {new Date().toLocaleDateString("af-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
        <Link
          href="/inspections/new"
          style={{
            padding: "10px 20px",
            background: "#F5C842",
            borderRadius: "8px",
            color: "#0E1A07",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + Nuwe Inspeksie
        </Link>
        <Link
          href="/dashboard/farms"
          style={{
            padding: "10px 20px",
            background: "#2D5A1B",
            borderRadius: "8px",
            color: "#F5EDDA",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Nuwe Plaas
        </Link>
        {isAgent && (
          <Link
            href="/dashboard/clients"
            style={{
              padding: "10px 20px",
              background: "#111a08",
              border: "1px solid #2D5A1B",
              borderRadius: "8px",
              color: "rgba(245,237,218,0.7)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            + Nuwe Kliënt
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
          gap: "14px",
          marginBottom: "36px",
        }}
      >
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            style={{
              padding: "20px",
              background: "#111a08",
              border: "1px solid #1a2e0d",
              borderRadius: "12px",
              textDecoration: "none",
              transition: "border-color 0.15s",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#F5C842",
                fontFamily: "var(--font-jetbrains), monospace",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "rgba(245,237,218,0.4)",
                marginTop: "6px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                fontFamily: "var(--font-jetbrains), monospace",
              }}
            >
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent inspections */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#F5EDDA", margin: 0 }}>
            Onlangse Inspeksies
          </h2>
          <Link
            href="/dashboard/history"
            style={{ fontSize: "12px", color: "#F5C842", textDecoration: "none" }}
          >
            Sien alles →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "rgba(245,237,218,0.3)",
              fontSize: "13px",
              background: "#111a08",
              border: "1px dashed #1a2e0d",
              borderRadius: "10px",
            }}
          >
            Geen inspeksies nog nie.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {recent.map((insp) => {
              const maxSev = Math.max(0, ...insp.camp_inspection_weeds.map((w) => w.severity));
              const weedCount = insp.camp_inspection_weeds.filter((w) => w.severity > 0).length;
              return (
                <div
                  key={insp.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "#111a08",
                    border: "1px solid #1a2e0d",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#F5EDDA" }}>
                      {(insp.blocks as { name: string } | null)?.name || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(245,237,218,0.4)",
                        marginTop: "2px",
                        fontFamily: "var(--font-jetbrains), monospace",
                      }}
                    >
                      {insp.inspection_date}
                      {insp.inspection_stages && (
                        <span style={{ color: "#4a9a4a", marginLeft: "8px" }}>
                          ● {(insp.inspection_stages as { name: string }).name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {weedCount > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: severityColors[maxSev],
                          fontWeight: 700,
                          fontFamily: "var(--font-jetbrains), monospace",
                        }}
                      >
                        {weedCount} onkruid
                      </span>
                    )}
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: severityColors[maxSev],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
