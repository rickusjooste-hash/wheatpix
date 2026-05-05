"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Farm {
  id: string;
  name: string;
}

interface Block {
  id: string;
  name: string;
  area_hectares: number | null;
  is_active: boolean;
  sort_order: number;
}

interface BlockSeason {
  id: string;
  block_id: string;
  season: number;
  crop: string | null;
  cultivar: string | null;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "planned", label: "Beplan" },
  { value: "planted", label: "Geplant" },
  { value: "harvested", label: "Geoes" },
  { value: "unused", label: "Nie in gebruik" },
];

export default function SeasonsPage() {
  const params = useParams();
  const farmId = params.id as string;
  const supabase = createClient();

  const currentYear = new Date().getFullYear();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [seasons, setSeasons] = useState<Record<string, BlockSeason>>({});
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [cropOptions, setCropOptions] = useState<string[]>([]);
  const [cultivarOptions, setCultivarOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [rollingOver, setRollingOver] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: farmData } = await supabase
        .from("farms" as never)
        .select("id, name")
        .eq("id" as never, farmId as never)
        .single();
      if (farmData) setFarm(farmData as unknown as Farm);

      const { data: bd } = await supabase
        .from("blocks" as never)
        .select("id, name, area_hectares, is_active, sort_order")
        .eq("farm_id" as never, farmId as never)
        .order("sort_order" as never);
      if (bd) setBlocks(bd as unknown as Block[]);

      // Get all distinct years for this farm's blocks
      const blockIds = (bd as unknown as Block[])?.map((b) => b.id) || [];
      if (blockIds.length > 0) {
        const { data: allSeasons } = await supabase
          .from("block_seasons" as never)
          .select("season")
          .in("block_id" as never, blockIds as never);
        if (allSeasons) {
          const years = [...new Set((allSeasons as unknown as { season: number }[]).map((s) => s.season))].sort(
            (a, b) => b - a
          );
          setAvailableYears(years.length > 0 ? years : [currentYear]);
          if (years.length > 0 && !years.includes(selectedYear)) {
            setSelectedYear(years[0]);
          }
        }
      }

      // Get distinct crop and cultivar values for suggestions
      const { data: cropData } = await supabase
        .from("block_seasons" as never)
        .select("crop, cultivar");
      if (cropData) {
        const cd = cropData as unknown as { crop: string | null; cultivar: string | null }[];
        setCropOptions(
          [...new Set(cd.map((c) => c.crop).filter(Boolean) as string[])].sort()
        );
        setCultivarOptions(
          [...new Set(cd.map((c) => c.cultivar).filter(Boolean) as string[])].sort()
        );
      }

      setLoading(false);
    }
    load();
  }, [supabase, farmId]);

  // Load seasons for selected year
  useEffect(() => {
    async function loadYear() {
      const blockIds = blocks.map((b) => b.id);
      if (blockIds.length === 0) return;

      const { data: sd } = await supabase
        .from("block_seasons" as never)
        .select("id, block_id, season, crop, cultivar, status")
        .in("block_id" as never, blockIds as never)
        .eq("season" as never, selectedYear as never);

      const m: Record<string, BlockSeason> = {};
      if (sd) {
        for (const s of sd as unknown as BlockSeason[]) m[s.block_id] = s;
      }
      setSeasons(m);
    }
    if (blocks.length > 0) loadYear();
  }, [supabase, blocks, selectedYear]);

  const hasSeasonData = Object.keys(seasons).length > 0;

  async function handleFieldChange(
    blockId: string,
    field: "crop" | "cultivar" | "status",
    value: string
  ) {
    const existing = seasons[blockId];
    if (!existing) return;

    setSaving((prev) => ({ ...prev, [blockId]: true }));
    const update = { [field]: value || null };
    await supabase
      .from("block_seasons" as never)
      .update(update as never)
      .eq("id" as never, existing.id as never);

    setSeasons((prev) => ({
      ...prev,
      [blockId]: { ...prev[blockId], ...update } as BlockSeason,
    }));
    setSaving((prev) => ({ ...prev, [blockId]: false }));
  }

  async function rollOverToYear(targetYear: number) {
    setRollingOver(true);

    // Find the most recent year that has data
    const sourceYear = availableYears.find((y) => y < targetYear) || availableYears[0];
    const blockIds = blocks.map((b) => b.id);

    // Load source season data
    const { data: sourceData } = await supabase
      .from("block_seasons" as never)
      .select("block_id, crop, cultivar")
      .in("block_id" as never, blockIds as never)
      .eq("season" as never, sourceYear as never);

    const sourceMap: Record<string, { crop: string | null; cultivar: string | null }> = {};
    if (sourceData) {
      for (const s of sourceData as unknown as {
        block_id: string;
        crop: string | null;
        cultivar: string | null;
      }[]) {
        sourceMap[s.block_id] = { crop: s.crop, cultivar: s.cultivar };
      }
    }

    // Create rows for all active blocks
    const rows = blocks
      .filter((b) => b.is_active)
      .map((b) => ({
        block_id: b.id,
        season: targetYear,
        crop: sourceMap[b.id]?.crop || null,
        cultivar: sourceMap[b.id]?.cultivar || null,
        status: "planned",
      }));

    if (rows.length > 0) {
      await supabase.from("block_seasons" as never).insert(rows as never);
    }

    // Update state
    if (!availableYears.includes(targetYear)) {
      setAvailableYears((prev) => [targetYear, ...prev].sort((a, b) => b - a));
    }
    setSelectedYear(targetYear);
    setRollingOver(false);
  }

  if (loading) return <div style={{ color: "#999", fontSize: "14px" }}>Laai...</div>;
  if (!farm) return <div style={{ color: "#999", fontSize: "14px" }}>Plaas nie gevind nie.</div>;

  const nextYear = Math.max(currentYear, ...availableYears) + 1;
  const canStartNewSeason = !availableYears.includes(nextYear);

  return (
    <div>
      <Link
        href={`/dashboard/farms/${farmId}`}
        style={{
          fontSize: "13px",
          color: "#999",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "20px",
        }}
      >
        ← {farm.name}
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
            Seisoen Bestuur
          </h1>
          <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>
            Bestuur gewasse en cultivars per kamp per jaar
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#1a1a1a",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {canStartNewSeason && (
            <button
              onClick={() => rollOverToYear(nextYear)}
              disabled={rollingOver}
              style={{
                padding: "10px 20px",
                background: "#1a1a1a",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: rollingOver ? "default" : "pointer",
                opacity: rollingOver ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {rollingOver ? "Skep..." : `+ Start ${nextYear} Seisoen`}
            </button>
          )}
        </div>
      </div>

      {!hasSeasonData ? (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ color: "#999", fontSize: "14px", marginBottom: "16px" }}>
            Geen seisoendata vir {selectedYear} nie.
          </div>
          <button
            onClick={() => rollOverToYear(selectedYear)}
            disabled={rollingOver}
            style={{
              padding: "10px 24px",
              background: "#1a1a1a",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            {rollingOver
              ? "Skep..."
              : availableYears.length > 0
              ? `Kopieer van ${availableYears[0]} na ${selectedYear}`
              : `Start ${selectedYear} Seisoen`}
          </button>
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
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1.2fr 1.2fr 1fr 0.6fr",
              gap: "12px",
              padding: "12px 20px",
              borderBottom: "2px solid #f0f0ec",
              fontSize: "11px",
              fontWeight: 600,
              color: "#999",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            <div>Kamp</div>
            <div>Gewas</div>
            <div>Kultivar</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Ha</div>
          </div>

          {/* Block rows */}
          {blocks.map((b, i) => {
            const season = seasons[b.id];
            const isUnused = season?.status === "unused";
            return (
              <div
                key={b.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1.2fr 1.2fr 1fr 0.6fr",
                  gap: "12px",
                  padding: "10px 20px",
                  borderBottom: i < blocks.length - 1 ? "1px solid #f0f0ec" : "none",
                  alignItems: "center",
                  opacity: isUnused ? 0.45 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>
                    {b.name}
                  </div>
                </div>
                <div>
                  {season ? (
                    <input
                      list="crop-options"
                      value={season.crop || ""}
                      onChange={(e) => handleFieldChange(b.id, "crop", e.target.value)}
                      placeholder="Kies gewas"
                      disabled={isUnused}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        border: "1px solid #e8e8e4",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "#1a1a1a",
                        background: isUnused ? "#f9f9f7" : "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <span style={{ color: "#ccc", fontSize: "13px" }}>—</span>
                  )}
                </div>
                <div>
                  {season ? (
                    <input
                      list="cultivar-options"
                      value={season.cultivar || ""}
                      onChange={(e) => handleFieldChange(b.id, "cultivar", e.target.value)}
                      placeholder="Kies kultivar"
                      disabled={isUnused}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        border: "1px solid #e8e8e4",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "#1a1a1a",
                        background: isUnused ? "#f9f9f7" : "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <span style={{ color: "#ccc", fontSize: "13px" }}>—</span>
                  )}
                </div>
                <div>
                  {season ? (
                    <select
                      value={season.status}
                      onChange={(e) => handleFieldChange(b.id, "status", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        border: "1px solid #e8e8e4",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: isUnused ? "#999" : "#1a1a1a",
                        background: "#fff",
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: "#ccc", fontSize: "13px" }}>—</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1a1a1a",
                    fontFamily: "var(--font-jetbrains), monospace",
                    textAlign: "right",
                  }}
                >
                  {b.area_hectares ? `${b.area_hectares.toFixed(1)}` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Datalists for suggestions */}
      <datalist id="crop-options">
        {cropOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="cultivar-options">
        {cultivarOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}
