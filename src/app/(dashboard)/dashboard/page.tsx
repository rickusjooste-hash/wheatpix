import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const auth = await getUserRole(supabase);
  if (!auth) return null;

  const isAgent = auth.role === "agent" || auth.role === "super";

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
    { label: "Aktiewe Kampe", value: blocksRes.count || 0, href: "/dashboard/farms" },
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

  const severityColors = ["#ccc", "#4a9a4a", "#d4a017", "#e87b35", "#e8413c"];

  return (
    <div>
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          Oorsig
        </h1>
        <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>
          {new Date().toLocaleDateString("af-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "32px" }}>
        <Link
          href="/inspections/new"
          style={{
            padding: "10px 20px",
            background: "#1a1a1a",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Nuwe Inspeksie
        </Link>
        <Link
          href="/dashboard/farms"
          style={{
            padding: "10px 20px",
            background: "#fff",
            border: "1px solid #d4d4d0",
            borderRadius: "8px",
            color: "#1a1a1a",
            fontSize: "13px",
            fontWeight: 500,
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
              background: "#fff",
              border: "1px solid #d4d4d0",
              borderRadius: "8px",
              color: "#1a1a1a",
              fontSize: "13px",
              fontWeight: 500,
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
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            style={{
              padding: "24px",
              background: "#ffffff",
              borderRadius: "12px",
              textDecoration: "none",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
              transition: "box-shadow 0.15s",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#1a1a1a",
                fontFamily: "var(--font-jetbrains), monospace",
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#999",
                marginTop: "8px",
              }}
            >
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent inspections */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
            Onlangse Inspeksies
          </h2>
          <Link
            href="/dashboard/history"
            style={{ fontSize: "13px", color: "#D4890A", textDecoration: "none", fontWeight: 500 }}
          >
            Sien alles →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "#bbb",
              fontSize: "14px",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            Geen inspeksies nog nie.
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            {recent.map((insp, i) => {
              const maxSev = Math.max(0, ...insp.camp_inspection_weeds.map((w) => w.severity));
              const weedCount = insp.camp_inspection_weeds.filter((w) => w.severity > 0).length;
              return (
                <div
                  key={insp.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: i < recent.length - 1 ? "1px solid #f0f0ec" : "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>
                      {(insp.blocks as { name: string } | null)?.name || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#999",
                        marginTop: "2px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>{insp.inspection_date}</span>
                      {insp.inspection_stages && (
                        <span
                          style={{
                            padding: "1px 6px",
                            background: "#f0f0ec",
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: "#6b6b6b",
                          }}
                        >
                          {(insp.inspection_stages as { name: string }).name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {weedCount > 0 && (
                      <span style={{ fontSize: "12px", color: "#6b6b6b" }}>
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
