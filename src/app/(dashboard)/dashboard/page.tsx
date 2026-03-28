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
    ...(isAgent ? [{ label: "Kliënte", value: clientsRes.count || 0, href: "/dashboard/clients", accent: "#D4890A" }] : []),
    { label: "Plase", value: farmsRes.count || 0, href: "/dashboard/farms", accent: "#4a9a4a" },
    { label: "Aktiewe Kampe", value: blocksRes.count || 0, href: "/dashboard/farms", accent: "#6dbb6d" },
    { label: "Inspeksies (30d)", value: inspectionsRes.count || 0, href: "/dashboard/history", accent: "#F5C842" },
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

  const cardBg = "rgba(14,26,7,0.6)";
  const cardBorder = "rgba(45,90,27,0.15)";

  return (
    <div>
      {/* Welcome header */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "rgba(245,237,218,0.25)",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontFamily: "var(--font-jetbrains), monospace",
            marginBottom: "8px",
          }}
        >
          Dashboard
        </div>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#F5EDDA",
            margin: 0,
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
            letterSpacing: "-0.5px",
          }}
        >
          Welkom terug
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(245,237,218,0.3)", margin: "8px 0 0" }}>
          {new Date().toLocaleDateString("af-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "36px" }}>
        <Link
          href="/inspections/new"
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #D4890A 0%, #F5C842 100%)",
            borderRadius: "10px",
            color: "#0E1A07",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 2px 16px rgba(212,137,10,0.2)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
        >
          + Nuwe Inspeksie
        </Link>
        <Link
          href="/dashboard/farms"
          style={{
            padding: "12px 24px",
            background: "rgba(45,90,27,0.3)",
            border: "1px solid rgba(45,90,27,0.4)",
            borderRadius: "10px",
            color: "#F5EDDA",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            backdropFilter: "blur(8px)",
          }}
        >
          + Nuwe Plaas
        </Link>
        {isAgent && (
          <Link
            href="/dashboard/clients"
            style={{
              padding: "12px 24px",
              background: "rgba(245,237,218,0.03)",
              border: "1px solid rgba(245,237,218,0.08)",
              borderRadius: "10px",
              color: "rgba(245,237,218,0.6)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              backdropFilter: "blur(8px)",
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
          marginBottom: "44px",
        }}
      >
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            style={{
              padding: "24px",
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: "14px",
              textDecoration: "none",
              backdropFilter: "blur(12px)",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.2s, transform 0.15s",
            }}
          >
            {/* Accent glow */}
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: s.accent,
                opacity: 0.06,
                filter: "blur(20px)",
              }}
            />
            <div
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: s.accent,
                fontFamily: "var(--font-jetbrains), monospace",
                lineHeight: 1,
                position: "relative",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "rgba(245,237,218,0.35)",
                marginTop: "10px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                fontFamily: "var(--font-jetbrains), monospace",
                position: "relative",
              }}
            >
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent inspections */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#F5EDDA",
              margin: 0,
            }}
          >
            Onlangse Inspeksies
          </h2>
          <Link
            href="/dashboard/history"
            style={{
              fontSize: "12px",
              color: "rgba(245,200,66,0.7)",
              textDecoration: "none",
              fontFamily: "var(--font-jetbrains), monospace",
              letterSpacing: "0.5px",
            }}
          >
            Sien alles →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "rgba(245,237,218,0.2)",
              fontSize: "14px",
              background: cardBg,
              border: `1px dashed ${cardBorder}`,
              borderRadius: "14px",
              backdropFilter: "blur(12px)",
            }}
          >
            Geen inspeksies nog nie.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                    padding: "16px 20px",
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: "12px",
                    backdropFilter: "blur(12px)",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#F5EDDA" }}>
                      {(insp.blocks as { name: string } | null)?.name || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(245,237,218,0.3)",
                        marginTop: "4px",
                        fontFamily: "var(--font-jetbrains), monospace",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span>{insp.inspection_date}</span>
                      {insp.inspection_stages && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4a9a4a", display: "inline-block" }} />
                          {(insp.inspection_stages as { name: string }).name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {weedCount > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: severityColors[maxSev],
                          fontWeight: 600,
                          fontFamily: "var(--font-jetbrains), monospace",
                          padding: "3px 8px",
                          background: `${severityColors[maxSev]}10`,
                          borderRadius: "6px",
                          border: `1px solid ${severityColors[maxSev]}20`,
                        }}
                      >
                        {weedCount} onkruid
                      </span>
                    )}
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: severityColors[maxSev],
                        boxShadow: maxSev > 2 ? `0 0 8px ${severityColors[maxSev]}40` : "none",
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
