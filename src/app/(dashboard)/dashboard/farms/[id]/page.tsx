"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Farm { id: string; name: string; client_id: string | null }
interface Block { id: string; name: string; area_hectares: number | null; is_active: boolean; sort_order: number }
interface BlockSeason { block_id: string; crop: string | null; cultivar: string | null; status: string }
interface Client { id: string; name: string }

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
      const { data: farmData } = await supabase.from("farms" as never).select("id, name, client_id").eq("id" as never, farmId as never).single();
      if (farmData) {
        const f = farmData as unknown as Farm;
        setFarm(f);
        if (f.client_id) {
          const { data: cd } = await supabase.from("clients" as never).select("id, name").eq("id" as never, f.client_id as never).single();
          if (cd) setClient(cd as unknown as Client);
        }
      }
      const { data: bd } = await supabase.from("blocks" as never).select("id, name, area_hectares, is_active, sort_order").eq("farm_id" as never, farmId as never).order("sort_order" as never);
      if (bd) setBlocks(bd as unknown as Block[]);

      const yr = new Date().getFullYear();
      const { data: sd } = await supabase.from("block_seasons" as never).select("block_id, crop, cultivar, status").eq("season" as never, yr as never);
      if (sd) {
        const m: Record<string, BlockSeason> = {};
        for (const s of sd as unknown as BlockSeason[]) m[s.block_id] = s;
        setSeasons(m);
      }
      const { count } = await supabase.from("camp_inspections" as never).select("id", { count: "exact", head: true }).eq("farm_id" as never, farmId as never);
      setInspectionCount(count || 0);
      setLoading(false);
    }
    load();
  }, [supabase, farmId]);

  if (loading) return <div style={{ color: "#999", fontSize: "14px" }}>Laai plaas...</div>;
  if (!farm) return <div style={{ color: "#999", fontSize: "14px" }}>Plaas nie gevind nie.</div>;

  const totalHa = blocks.reduce((sum, b) => sum + (b.area_hectares || 0), 0);

  return (
    <div>
      <Link href="/dashboard/farms" style={{ fontSize: "13px", color: "#999", textDecoration: "none", display: "inline-block", marginBottom: "20px" }}>
        ← Plase
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{farm.name}</h1>
          {client && <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>{client.name}</p>}
        </div>
        <Link
          href={`/dashboard/farms/${farmId}/map`}
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
          Kaart & Kampe
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "36px" }}>
        {[
          { label: "Kampe", value: blocks.length },
          { label: "Totale Hektaar", value: totalHa > 0 ? totalHa.toFixed(1) : "—" },
          { label: "Inspeksies", value: inspectionCount },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "22px",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1a1a1a", fontFamily: "var(--font-jetbrains), monospace" }}>{s.value}</div>
            <div style={{ fontSize: "13px", color: "#999", marginTop: "6px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Blocks */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>Kampe</h2>
        <Link href={`/dashboard/farms/${farmId}/map`} style={{ fontSize: "13px", color: "#D4890A", textDecoration: "none", fontWeight: 500 }}>
          Teken nuwe kamp →
        </Link>
      </div>

      {blocks.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", color: "#bbb", fontSize: "14px", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          Geen kampe nie. Gebruik die kaart om kampe te teken.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {blocks.map((b, i) => {
            const season = seasons[b.id];
            return (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: i < blocks.length - 1 ? "1px solid #f0f0ec" : "none",
                  opacity: b.is_active ? 1 : 0.4,
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>{b.name}</div>
                  <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>
                    {season?.crop || "—"} · {season?.cultivar || "—"}
                  </div>
                </div>
                {b.area_hectares && (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", fontFamily: "var(--font-jetbrains), monospace" }}>
                    {b.area_hectares.toFixed(1)} ha
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
