"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import Link from "next/link";

const FarmMap = dynamic(() => import("@/components/dashboard/FarmMap"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(245,237,218,0.4)" }}>
      Laai kaart...
    </div>
  ),
});

interface Block {
  id: string;
  name: string;
  geometry: { lat: number; lng: number }[] | null;
  area_hectares: number | null;
  is_active: boolean;
  sort_order: number;
}

interface BlockSeason {
  block_id: string;
  crop: string | null;
  cultivar: string | null;
}

export default function FarmMapPage() {
  const params = useParams();
  const farmId = params.id as string;
  const supabase = createClient();

  const [farmName, setFarmName] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [seasons, setSeasons] = useState<Record<string, BlockSeason>>({});
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: farm } = await supabase
        .from("farms" as never)
        .select("name")
        .eq("id" as never, farmId as never)
        .single();
      if (farm) setFarmName((farm as { name: string }).name);

      const { data: blockData } = await supabase
        .from("blocks" as never)
        .select("id, name, geometry, area_hectares, is_active, sort_order")
        .eq("farm_id" as never, farmId as never)
        .order("sort_order" as never);
      if (blockData) setBlocks(blockData as unknown as Block[]);

      const currentYear = new Date().getFullYear();
      const { data: seasonData } = await supabase
        .from("block_seasons" as never)
        .select("block_id, crop, cultivar")
        .eq("season" as never, currentYear as never);
      if (seasonData) {
        const sm: Record<string, BlockSeason> = {};
        for (const s of seasonData as unknown as BlockSeason[]) {
          sm[s.block_id] = s;
        }
        setSeasons(sm);
      }

      setLoading(false);
    }
    load();
  }, [supabase, farmId]);

  const handleBlockCreated = useCallback(
    async (name: string, geometry: { lat: number; lng: number }[], areaHa: number) => {
      const { data, error } = await supabase
        .from("blocks" as never)
        .insert({
          farm_id: farmId,
          name,
          geometry,
          area_hectares: areaHa,
          sort_order: blocks.length,
          is_active: true,
        } as never)
        .select("id, name, geometry, area_hectares, is_active, sort_order")
        .single();

      if (data && !error) {
        setBlocks((prev) => [...prev, data as unknown as Block]);
      }
    },
    [supabase, farmId, blocks.length]
  );

  const handleBlockUpdated = useCallback(
    async (blockId: string, geometry: { lat: number; lng: number }[], areaHa: number) => {
      const { error } = await supabase
        .from("blocks" as never)
        .update({ geometry, area_hectares: areaHa } as never)
        .eq("id" as never, blockId as never);

      if (!error) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId ? { ...b, geometry, area_hectares: areaHa } : b
          )
        );
      }
    },
    [supabase]
  );

  const handleBlockSelected = useCallback((block: Block | null) => {
    setSelectedBlock(block);
  }, []);

  if (loading) {
    return <div style={{ color: "#999", fontSize: "14px" }}>Laai kaart...</div>;
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", margin: "-40px -48px" }}>
      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <FarmMap
          farmId={farmId}
          farmName={farmName}
          blocks={blocks}
          onBlockCreated={handleBlockCreated}
          onBlockUpdated={handleBlockUpdated}
          onBlockSelected={handleBlockSelected}
          selectedBlockId={selectedBlock?.id || null}
        />
      </div>

      {/* Side panel */}
      <div
        style={{
          width: "300px",
          background: "#fff",
          borderLeft: "1px solid #e8e8e4",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        <div style={{ padding: "20px", borderBottom: "1px solid #f0f0ec" }}>
          <Link
            href={`/dashboard/farms/${farmId}`}
            style={{ fontSize: "13px", color: "#999", textDecoration: "none" }}
          >
            ← {farmName}
          </Link>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: "8px 0 0" }}>
            Kaart
          </h2>
        </div>

        {selectedBlock ? (
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a" }}>
                  {selectedBlock.name}
                </div>
                {selectedBlock.area_hectares && (
                  <div style={{ fontSize: "14px", color: "#D4890A", marginTop: "4px", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}>
                    {selectedBlock.area_hectares.toFixed(1)} ha
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedBlock(null)} style={{ background: "none", border: "none", color: "#bbb", fontSize: "16px", cursor: "pointer" }}>
                ✕
              </button>
            </div>
            {seasons[selectedBlock.id] && (
              <div style={{ marginTop: "14px", padding: "12px", background: "#f7f7f5", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                  Seisoen {new Date().getFullYear()}
                </div>
                <div style={{ fontSize: "14px", color: "#1a1a1a" }}>
                  {seasons[selectedBlock.id].crop || "—"} · {seasons[selectedBlock.id].cultivar || "—"}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
              Kampe ({blocks.length})
            </div>
            {blocks.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setSelectedBlock(b)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "12px",
                  marginBottom: "4px",
                  background: "transparent",
                  border: "none",
                  borderBottom: i < blocks.length - 1 ? "1px solid #f0f0ec" : "none",
                  borderRadius: 0,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>{b.name}</span>
                {b.area_hectares && (
                  <span style={{ fontSize: "12px", color: "#999", fontFamily: "var(--font-jetbrains), monospace" }}>
                    {b.area_hectares.toFixed(1)} ha
                  </span>
                )}
              </button>
            ))}
            {blocks.length === 0 && (
              <div style={{ fontSize: "13px", color: "#bbb", textAlign: "center", padding: "24px 0" }}>
                Gebruik die teken-instrument op die kaart om kampe by te voeg.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
