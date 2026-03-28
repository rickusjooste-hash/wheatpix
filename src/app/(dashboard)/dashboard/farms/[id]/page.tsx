"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Farm {
  id: string;
  name: string;
  client_id: string | null;
}

interface Block {
  id: string;
  name: string;
  area_hectares: number | null;
  is_active: boolean;
  sort_order: number;
}

interface BlockSeason {
  block_id: string;
  crop: string | null;
  cultivar: string | null;
  status: string;
}

interface Client {
  id: string;
  name: string;
}

export default function FarmDetailPage() {
  const params = useParams();
  const farmId = params.id as string;
  const supabase = createClient();

  const [farm, setFarm] = useState<Farm | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [seasons, setSeasons] = useState<Record<string, BlockSeason>>({});
  const [client, setClient] = useState<Client | null>(null);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Load farm
      const { data: farmData } = await supabase
        .from("farms" as never)
        .select("id, name, client_id")
        .eq("id" as never, farmId as never)
        .single();
      if (farmData) {
        const f = farmData as unknown as Farm;
        setFarm(f);

        // Load client if assigned
        if (f.client_id) {
          const { data: clientData } = await supabase
            .from("clients" as never)
            .select("id, name")
            .eq("id" as never, f.client_id as never)
            .single();
          if (clientData) setClient(clientData as unknown as Client);
        }
      }

      // Load blocks
      const { data: blockData } = await supabase
        .from("blocks" as never)
        .select("id, name, area_hectares, is_active, sort_order")
        .eq("farm_id" as never, farmId as never)
        .order("sort_order" as never);
      if (blockData) setBlocks(blockData as unknown as Block[]);

      // Load current season
      const currentYear = new Date().getFullYear();
      const { data: seasonData } = await supabase
        .from("block_seasons" as never)
        .select("block_id, crop, cultivar, status")
        .eq("season" as never, currentYear as never);
      if (seasonData) {
        const sm: Record<string, BlockSeason> = {};
        for (const s of seasonData as unknown as BlockSeason[]) {
          sm[s.block_id] = s;
        }
        setSeasons(sm);
      }

      // Inspection count
      const { count } = await supabase
        .from("camp_inspections" as never)
        .select("id", { count: "exact", head: true })
        .eq("farm_id" as never, farmId as never);
      setInspectionCount(count || 0);

      setLoading(false);
    }
    load();
  }, [supabase, farmId]);

  if (loading) {
    return <div style={{ color: "rgba(245,237,218,0.4)", fontSize: "13px" }}>Laai plaas...</div>;
  }

  if (!farm) {
    return <div style={{ color: "rgba(245,237,218,0.4)", fontSize: "13px" }}>Plaas nie gevind nie.</div>;
  }

  const totalHa = blocks.reduce((sum, b) => sum + (b.area_hectares || 0), 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "8px" }}>
        <Link
          href="/dashboard/farms"
          style={{ fontSize: "12px", color: "rgba(245,237,218,0.4)", textDecoration: "none" }}
        >
          ← Plase
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#F5EDDA", margin: 0 }}>{farm.name}</h1>
          {client && (
            <p style={{ fontSize: "13px", color: "rgba(245,237,218,0.4)", margin: "4px 0 0" }}>
              {client.name}
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/farms/${farmId}/map`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            background: "#2D5A1B",
            border: "none",
            borderRadius: "8px",
            color: "#F5EDDA",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ⊞ Kaart
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {[
          { label: "Kampe", value: blocks.length.toString() },
          { label: "Hektaar", value: totalHa > 0 ? totalHa.toFixed(1) : "—" },
          { label: "Inspeksies", value: inspectionCount.toString() },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "16px",
              background: "#111a08",
              border: "1px solid #1a2e0d",
              borderRadius: "10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#F5C842" }}>{stat.value}</div>
            <div
              style={{
                fontSize: "10px",
                color: "rgba(245,237,218,0.4)",
                marginTop: "4px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontFamily: "var(--font-jetbrains), monospace",
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Blocks list */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#F5EDDA", margin: 0 }}>Kampe</h2>
          <Link
            href={`/dashboard/farms/${farmId}/map`}
            style={{
              fontSize: "12px",
              color: "#F5C842",
              textDecoration: "none",
            }}
          >
            Teken nuwe kamp →
          </Link>
        </div>

        {blocks.length === 0 ? (
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
            Geen kampe nie. Gebruik die kaart om kampe te teken.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {blocks.map((b) => {
              const season = seasons[b.id];
              return (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "#111a08",
                    border: `1px solid ${b.is_active ? "#1a2e0d" : "#1a1a0d"}`,
                    borderRadius: "8px",
                    opacity: b.is_active ? 1 : 0.5,
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#F5EDDA" }}>
                      {b.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(245,237,218,0.4)",
                        marginTop: "2px",
                        fontFamily: "var(--font-jetbrains), monospace",
                      }}
                    >
                      {season?.crop || "—"} · {season?.cultivar || "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {b.area_hectares && (
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#F5C842",
                          fontFamily: "var(--font-jetbrains), monospace",
                        }}
                      >
                        {b.area_hectares.toFixed(1)} ha
                      </div>
                    )}
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
