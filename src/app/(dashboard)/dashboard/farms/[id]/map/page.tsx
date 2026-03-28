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
    return <div style={{ color: "rgba(245,237,218,0.4)", fontSize: "13px" }}>Laai kaart...</div>;
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", margin: "-32px -40px" }}>
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
          background: "#0a0f05",
          borderLeft: "1px solid #1a2e0d",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #1a2e0d" }}>
          <Link
            href={`/dashboard/farms/${farmId}`}
            style={{ fontSize: "11px", color: "rgba(245,237,218,0.4)", textDecoration: "none" }}
          >
            ← {farmName}
          </Link>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#F5EDDA", margin: "8px 0 0" }}>
            Kaart
          </h2>
        </div>

        {/* Selected block info or block list */}
        {selectedBlock ? (
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#F5EDDA" }}>
                  {selectedBlock.name}
                </div>
                {selectedBlock.area_hectares && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#F5C842",
                      marginTop: "4px",
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    {selectedBlock.area_hectares.toFixed(1)} ha
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(245,237,218,0.4)",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {seasons[selectedBlock.id] && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  background: "#111a08",
                  borderRadius: "8px",
                  border: "1px solid #1a2e0d",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: "rgba(245,237,218,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "4px",
                    fontFamily: "var(--font-jetbrains), monospace",
                  }}
                >
                  Seisoen {new Date().getFullYear()}
                </div>
                <div style={{ fontSize: "13px", color: "#F5EDDA" }}>
                  {seasons[selectedBlock.id].crop || "—"} · {seasons[selectedBlock.id].cultivar || "—"}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "16px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "rgba(245,237,218,0.3)",
                letterSpacing: "2px",
                textTransform: "uppercase",
                marginBottom: "10px",
                fontFamily: "var(--font-jetbrains), monospace",
              }}
            >
              Kampe ({blocks.length})
            </div>
            {blocks.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBlock(b)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "10px 12px",
                  marginBottom: "4px",
                  background: "#111a08",
                  border: "1px solid #1a2e0d",
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "13px", color: "#F5EDDA" }}>{b.name}</span>
                {b.area_hectares && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "rgba(245,237,218,0.4)",
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    {b.area_hectares.toFixed(1)} ha
                  </span>
                )}
              </button>
            ))}
            {blocks.length === 0 && (
              <div style={{ fontSize: "12px", color: "rgba(245,237,218,0.3)", textAlign: "center", padding: "20px" }}>
                Gebruik die teken-instrument op die kaart om kampe by te voeg.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
