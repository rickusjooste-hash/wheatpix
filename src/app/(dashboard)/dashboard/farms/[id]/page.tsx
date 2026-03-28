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

const cardBg = "rgba(14,26,7,0.6)";
const cardBorder = "rgba(45,90,27,0.15)";

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
      const { data: farmData } = await supabase
        .from("farms" as never)
        .select("id, name, client_id")
        .eq("id" as never, farmId as never)
        .single();
      if (farmData) {
        const f = farmData as unknown as Farm;
        setFarm(f);
        if (f.client_id) {
          const { data: clientData } = await supabase
            .from("clients" as never)
            .select("id, name")
            .eq("id" as never, f.client_id as never)
            .single();
          if (clientData) setClient(clientData as unknown as Client);
        }
      }

      const { data: blockData } = await supabase
        .from("blocks" as never)
        .select("id, name, area_hectares, is_active, sort_order")
        .eq("farm_id" as never, farmId as never)
        .order("sort_order" as never);
      if (blockData) setBlocks(blockData as unknown as Block[]);

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
    return <div style={{ color: "rgba(245,237,218,0.25)", fontSize: "13px" }}>Laai plaas...</div>;
  }

  if (!farm) {
    return <div style={{ color: "rgba(245,237,218,0.25)", fontSize: "13px" }}>Plaas nie gevind nie.</div>;
  }

  const totalHa = blocks.reduce((sum, b) => sum + (b.area_hectares || 0), 0);

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        href="/dashboard/farms"
        style={{
          fontSize: "12px",
          color: "rgba(245,237,218,0.3)",
          textDecoration: "none",
          fontFamily: "var(--font-jetbrains), monospace",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        ← Plase
      </Link>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#F5EDDA", margin: 0 }}>{farm.name}</h1>
          {client && (
            <p style={{ fontSize: "13px", color: "rgba(245,237,218,0.3)", margin: "6px 0 0" }}>
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
            padding: "12px 24px",
            background: "rgba(45,90,27,0.3)",
            border: "1px solid rgba(45,90,27,0.4)",
            borderRadius: "10px",
            color: "#F5EDDA",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            backdropFilter: "blur(8px)",
          }}
        >
          ⊞ Kaart & Kampe
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "36px" }}>
        {[
          { label: "Kampe", value: blocks.length.toString(), accent: "#4a9a4a" },
          { label: "Totale Hektaar", value: totalHa > 0 ? totalHa.toFixed(1) : "—", accent: "#F5C842" },
          { label: "Inspeksies", value: inspectionCount.toString(), accent: "#D4890A" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "22px",
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: "14px",
              textAlign: "center",
              backdropFilter: "blur(12px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: stat.accent,
                opacity: 0.06,
                filter: "blur(15px)",
              }}
            />
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: stat.accent,
                fontFamily: "var(--font-jetbrains), monospace",
                position: "relative",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "rgba(245,237,218,0.3)",
                marginTop: "6px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                fontFamily: "var(--font-jetbrains), monospace",
                position: "relative",
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Blocks list */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#F5EDDA", margin: 0 }}>Kampe</h2>
          <Link
            href={`/dashboard/farms/${farmId}/map`}
            style={{
              fontSize: "12px",
              color: "rgba(245,200,66,0.7)",
              textDecoration: "none",
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            Teken nuwe kamp →
          </Link>
        </div>

        {blocks.length === 0 ? (
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
            Geen kampe nie. Gebruik die kaart om kampe te teken.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {blocks.map((b) => {
              const season = seasons[b.id];
              return (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    background: cardBg,
                    border: `1px solid ${b.is_active ? cardBorder : "rgba(245,237,218,0.05)"}`,
                    borderRadius: "12px",
                    opacity: b.is_active ? 1 : 0.4,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#F5EDDA" }}>
                      {b.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(245,237,218,0.3)",
                        marginTop: "4px",
                        fontFamily: "var(--font-jetbrains), monospace",
                      }}
                    >
                      {season?.crop || "—"} · {season?.cultivar || "—"}
                    </div>
                  </div>
                  {b.area_hectares && (
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#F5C842",
                        fontFamily: "var(--font-jetbrains), monospace",
                      }}
                    >
                      {b.area_hectares.toFixed(1)} ha
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
