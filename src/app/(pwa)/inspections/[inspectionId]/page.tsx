"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import InspectionGrid from "@/components/inspections/InspectionGrid";
import SeverityLegend from "@/components/inspections/SeverityLegend";
import BlockSelector from "@/components/inspections/BlockSelector";
import InspectionSummary from "@/components/inspections/InspectionSummary";
import WeedNoteModal from "@/components/inspections/WeedNoteModal";
import PhotoCapture from "@/components/inspections/PhotoCapture";
import HerbicideRecommendations from "@/components/inspections/HerbicideRecommendations";
import { getRecommendations } from "@/lib/herbicide-engine";
import {
  nextSeverity,
  type Block,
  type BlockSeason,
  type WeedSpecies,
  type WeedData,
  type SeverityLevel,
  type InspectionStage,
  type PendingPhoto,
  type Herbicide,
  type HerbicideEfficacy,
  type SelectedHerbicide,
} from "@/lib/inspection-utils";

export default function ActiveInspectionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const stageId = params.inspectionId as string;
  const farmId = searchParams.get("farm") || "";

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [seasons, setSeasons] = useState<Record<string, BlockSeason>>({});
  const [weeds, setWeeds] = useState<WeedSpecies[]>([]);
  const [stage, setStage] = useState<InspectionStage | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("");
  const [inspections, setInspections] = useState<Record<string, WeedData>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, PendingPhoto[]>>({});
  const [allHerbicides, setAllHerbicides] = useState<Herbicide[]>([]);
  const [efficacyData, setEfficacyData] = useState<HerbicideEfficacy[]>([]);
  const [selectedHerbicides, setSelectedHerbicides] = useState<Record<string, Set<string>>>({});
  const [editingNoteWeed, setEditingNoteWeed] = useState<string | null>(null);
  const [savedBlocks, setSavedBlocks] = useState<Set<string>>(new Set());
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const gps = useGeoLocation(blocks);
  const { onlineStatus, pendingCount, saveInspection } = useOfflineSync();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      // Load stage
      const { data: stageData } = await supabase
        .from("inspection_stages" as never)
        .select("*")
        .eq("id" as never, stageId as never)
        .single();
      if (stageData) setStage(stageData as unknown as InspectionStage);

      // Load blocks
      const { data: blockData } = await supabase
        .from("blocks" as never)
        .select("*")
        .eq("farm_id" as never, farmId as never)
        .eq("is_active" as never, true as never)
        .order("sort_order" as never);
      if (blockData) {
        const bd = blockData as unknown as Block[];
        setBlocks(bd);
        if (bd.length > 0) setSelectedBlockId(bd[0].id);

        // Load current season data for blocks
        const currentYear = new Date().getFullYear();
        const blockIds = bd.map((b) => b.id);
        const { data: seasonData } = await supabase
          .from("block_seasons" as never)
          .select("*")
          .in("block_id" as never, blockIds as never)
          .eq("season" as never, currentYear as never);
        if (seasonData) {
          const seasonMap: Record<string, BlockSeason> = {};
          for (const s of seasonData as unknown as BlockSeason[]) {
            seasonMap[s.block_id] = s;
          }
          setSeasons(seasonMap);
        }
      }

      // Load weed species (global defaults + farm-specific)
      const { data: weedData } = await supabase
        .from("weed_species" as never)
        .select("*")
        .or(`farm_id.is.null,farm_id.eq.${farmId}`)
        .eq("is_active" as never, true as never)
        .order("category" as never)
        .order("sort_order" as never);
      if (weedData) setWeeds(weedData as unknown as WeedSpecies[]);

      // Load herbicides + efficacy data
      const { data: herbData } = await supabase
        .from("herbicides" as never)
        .select("*")
        .eq("is_active" as never, true as never);
      if (herbData) setAllHerbicides(herbData as unknown as Herbicide[]);

      const { data: effData } = await supabase
        .from("herbicide_weed_efficacy" as never)
        .select("herbicide_id, weed_species_id, efficacy");
      if (effData) setEfficacyData(effData as unknown as HerbicideEfficacy[]);

      setLoading(false);
    }

    load();
  }, [supabase, stageId, farmId]);

  // Auto-select block from GPS — switch when agent physically moves to a new camp
  useEffect(() => {
    if (gps.matchedBlock && gps.matchedBlock.id !== selectedBlockId) {
      setSelectedBlockId(gps.matchedBlock.id);
      setSaved(false);
    }
  }, [gps.matchedBlock, selectedBlockId]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
  const currentData = inspections[selectedBlockId] || {};
  const currentNotes = notes[selectedBlockId] || "";
  const currentPhotos = photos[selectedBlockId] || [];
  const currentSelectedHerbicides = selectedHerbicides[selectedBlockId] || new Set<string>();
  const hasData = Object.values(currentData).some((v) => v.severity > 0);
  const isBlockSaved = savedBlocks.has(selectedBlockId);

  // Compute herbicide recommendations based on detected weeds
  const detectedWeedIds = Object.entries(currentData)
    .filter(([, entry]) => entry.severity > 0)
    .map(([weedId]) => weedId);
  const recommendations = getRecommendations(detectedWeedIds, efficacyData, allHerbicides, weeds);
  const completedCount = savedBlocks.size;

  const grasses = weeds.filter((w) => w.category === "grass");
  const broadleaf = weeds.filter((w) => w.category === "broadleaf");

  const handleTap = useCallback(
    (weedId: string) => {
      setSaved(false);
      setInspections((prev) => {
        const blockData = prev[selectedBlockId] || {};
        const current = blockData[weedId] || { severity: 0 as SeverityLevel };
        const newSev = nextSeverity(current.severity);
        return {
          ...prev,
          [selectedBlockId]: {
            ...blockData,
            [weedId]: {
              severity: newSev,
              notes: newSev === 0 ? undefined : current.notes,
              zones: newSev === 0 ? undefined : current.zones,
            },
          },
        };
      });
    },
    [selectedBlockId]
  );

  const handleNoteEdit = useCallback((weedId: string) => {
    setEditingNoteWeed(weedId);
  }, []);

  const handleNoteSave = useCallback(
    (note: string, zones: number[]) => {
      if (!editingNoteWeed) return;
      setInspections((prev) => {
        const blockData = prev[selectedBlockId] || {};
        const current = blockData[editingNoteWeed] || { severity: 0 as SeverityLevel };
        return {
          ...prev,
          [selectedBlockId]: {
            ...blockData,
            [editingNoteWeed]: {
              ...current,
              notes: note || undefined,
              zones: zones.length > 0 ? zones : undefined,
            },
          },
        };
      });
      setEditingNoteWeed(null);
    },
    [editingNoteWeed, selectedBlockId]
  );

  const handleAddPhoto = useCallback(
    (photo: PendingPhoto) => {
      setPhotos((prev) => ({
        ...prev,
        [selectedBlockId]: [...(prev[selectedBlockId] || []), photo],
      }));
    },
    [selectedBlockId]
  );

  const handleRemovePhoto = useCallback(
    (photoId: string) => {
      setPhotos((prev) => ({
        ...prev,
        [selectedBlockId]: (prev[selectedBlockId] || []).filter((p) => p.id !== photoId),
      }));
    },
    [selectedBlockId]
  );

  const handleCaptionChange = useCallback(
    (photoId: string, caption: string) => {
      setPhotos((prev) => ({
        ...prev,
        [selectedBlockId]: (prev[selectedBlockId] || []).map((p) =>
          p.id === photoId ? { ...p, caption } : p
        ),
      }));
    },
    [selectedBlockId]
  );

  const handleHerbicideToggle = useCallback(
    (herbicideId: string) => {
      setSelectedHerbicides((prev) => {
        const current = new Set(prev[selectedBlockId] || []);
        if (current.has(herbicideId)) {
          current.delete(herbicideId);
        } else {
          current.add(herbicideId);
        }
        return { ...prev, [selectedBlockId]: current };
      });
    },
    [selectedBlockId]
  );

  const handleHerbicideAdd = useCallback(
    (herbicideId: string) => {
      setSelectedHerbicides((prev) => {
        const current = new Set(prev[selectedBlockId] || []);
        current.add(herbicideId);
        return { ...prev, [selectedBlockId]: current };
      });
    },
    [selectedBlockId]
  );

  const handleSave = useCallback(async () => {
    if (!hasData || !selectedBlockId || !stageId || !farmId || !userId || isBlockSaved) return;

    const weedEntries = Object.entries(currentData)
      .filter(([, entry]) => entry.severity > 0)
      .map(([weedId, entry]) => ({
        weed_species_id: weedId,
        severity: entry.severity,
        notes: entry.notes || null,
        zones: entry.zones && entry.zones.length > 0 ? entry.zones : null,
      }));

    const photoMetas = currentPhotos.map((p, i) => ({
      id: p.id,
      caption: p.caption,
      sort_order: i,
    }));

    const photoBlobs = currentPhotos.map((p) => ({
      id: p.id,
      blob: p.blob,
    }));

    // Build herbicide selections with auto-suggested flag
    const autoSuggestedIds = new Set(recommendations.map((r) => r.herbicide.id));
    const herbicideEntries: SelectedHerbicide[] = [...currentSelectedHerbicides].map((id) => ({
      herbicide_id: id,
      is_auto_suggested: autoSuggestedIds.has(id),
    }));

    await saveInspection(
      {
        id: crypto.randomUUID(),
        farm_id: farmId,
        block_id: selectedBlockId,
        stage_id: stageId,
        inspector_id: userId,
        inspection_date: new Date().toISOString().split("T")[0],
        gps_lat: gps.position?.lat ?? null,
        gps_lng: gps.position?.lng ?? null,
        crop: seasons[selectedBlockId]?.crop ?? null,
        cultivar: seasons[selectedBlockId]?.cultivar ?? null,
        notes: currentNotes || null,
        weeds: weedEntries,
        photos: photoMetas,
        herbicides: herbicideEntries,
      },
      photoBlobs.length > 0 ? photoBlobs : undefined
    );

    // Mark block as saved — stay on this camp, GPS will switch when agent moves
    setSavedBlocks((prev) => new Set([...prev, selectedBlockId]));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [
    hasData,
    isBlockSaved,
    selectedBlockId,
    stageId,
    farmId,
    userId,
    currentData,
    currentNotes,
    currentPhotos,
    currentSelectedHerbicides,
    recommendations,
    gps.position,
    seasons,
    blocks,
    savedBlocks,
    saveInspection,
  ]);

  const navigateBlock = (direction: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === selectedBlockId);
    const newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < blocks.length) {
      setSelectedBlockId(blocks[newIdx].id);
      setSaved(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          background: "#0a0a0a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555555",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          fontSize: "13px",
        }}
      >
        Laai inspeksie...
      </div>
    );
  }

  const blockIdx = blocks.findIndex((b) => b.id === selectedBlockId);
  const isFirst = blockIdx <= 0;
  const isLast = blockIdx >= blocks.length - 1;

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
        color: "#eeeeee",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px 12px",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#555555",
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              }}
            >
              Kamp Inspeksie
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#444444",
                marginTop: "4px",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              }}
            >
              {new Date().toLocaleDateString("af-ZA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            {stage && (
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#4a9a4a",
                  marginTop: "4px",
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                ● {stage.name}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {onlineStatus === "offline" && (
              <span
                style={{
                  fontSize: "9px",
                  color: "#8a7a2a",
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  padding: "3px 6px",
                  background: "#1a1a0a",
                  border: "1px solid #333300",
                  borderRadius: "4px",
                }}
              >
                AFLYN{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </span>
            )}
            <button
              onClick={() => setShowSummary(true)}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333333",
                borderRadius: "6px",
                color: "#888888",
                fontSize: "11px",
                padding: "6px 12px",
                cursor: "pointer",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              }}
            >
              ☰ Opsomming
            </button>
          </div>
        </div>

        {/* GPS Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "10px",
            fontSize: "10px",
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            color: gps.status === "locked" ? "#4a9a4a" : "#8a7a2a",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: gps.status === "locked" ? "#4a9a4a" : "#8a7a2a",
              animation:
                gps.status === "searching"
                  ? "pulse 1.5s ease-in-out infinite"
                  : "none",
            }}
          />
          {gps.status === "locked"
            ? `GPS · ${gps.matchedBlock?.name || selectedBlock?.name || "—"}`
            : gps.status === "searching"
            ? "GPS soek..."
            : gps.status === "error"
            ? "GPS fout"
            : "GPS nie beskikbaar"}
        </div>
      </div>

      {/* Block Header */}
      <button
        onClick={() => setShowBlockSelector(true)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "14px 20px",
          background: "#111111",
          border: "none",
          borderBottom: "1px solid #1a1a1a",
          cursor: "pointer",
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#eeeeee" }}>
            {selectedBlock?.name || "Kies kamp"}
          </div>
          {selectedBlock && (
            <div
              style={{
                fontSize: "12px",
                color: "#666666",
                marginTop: "3px",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              }}
            >
              {seasons[selectedBlockId]?.crop || "—"} · {seasons[selectedBlockId]?.cultivar || "—"}
            </div>
          )}
        </div>
        <div style={{ color: "#555555", fontSize: "18px" }}>▾</div>
      </button>

      {/* Progress Bar */}
      <div style={{ padding: "0 20px", marginTop: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#555555",
            marginBottom: "4px",
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          }}
        >
          <span>
            {completedCount} / {blocks.length} kampe
          </span>
          <span>
            {blocks.length > 0
              ? Math.round((completedCount / blocks.length) * 100)
              : 0}
            %
          </span>
        </div>
        <div
          style={{
            height: "3px",
            background: "#1a1a1a",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${
                blocks.length > 0
                  ? (completedCount / blocks.length) * 100
                  : 0
              }%`,
              background: "linear-gradient(90deg, #2a6a2a, #4a9a4a)",
              borderRadius: "2px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "8px 20px 0" }}>
        <SeverityLegend />
      </div>

      {/* Weed Grid */}
      <InspectionGrid
        grasses={grasses}
        broadleaf={broadleaf}
        weedData={currentData}
        onTap={handleTap}
        onNoteEdit={handleNoteEdit}
      />

      {/* Photos */}
      <PhotoCapture
        photos={currentPhotos}
        onAdd={handleAddPhoto}
        onRemove={handleRemovePhoto}
        onCaptionChange={handleCaptionChange}
      />

      {/* Notes */}
      <div style={{ padding: "20px 20px 0" }}>
        <textarea
          placeholder="Notas (opsioneel)..."
          value={currentNotes}
          onChange={(e) =>
            setNotes((prev) => ({
              ...prev,
              [selectedBlockId]: e.target.value,
            }))
          }
          style={{
            width: "100%",
            padding: "12px",
            background: "#111111",
            border: "1px solid #222222",
            borderRadius: "8px",
            color: "#cccccc",
            fontSize: "14px",
            resize: "vertical",
            minHeight: "60px",
            fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Herbicide Recommendations */}
      <div style={{ paddingBottom: "100px" }}>
        <HerbicideRecommendations
          recommendations={recommendations}
          allHerbicides={allHerbicides}
          selectedIds={currentSelectedHerbicides}
          onToggle={handleHerbicideToggle}
          onAdd={handleHerbicideAdd}
        />
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "480px",
          padding: "12px 20px",
          background: "linear-gradient(transparent, #0a0a0a 30%)",
          display: "flex",
          gap: "10px",
          boxSizing: "border-box",
          paddingTop: "30px",
        }}
      >
        <button
          onClick={() => navigateBlock(-1)}
          disabled={isFirst}
          style={{
            padding: "14px",
            background: "#1a1a1a",
            border: "1px solid #333333",
            borderRadius: "10px",
            color: isFirst ? "#333333" : "#888888",
            fontSize: "16px",
            cursor: isFirst ? "default" : "pointer",
          }}
        >
          ◀
        </button>
        <button
          onClick={handleSave}
          disabled={!hasData || isBlockSaved}
          style={{
            flex: 1,
            padding: "14px",
            background: saved || isBlockSaved
              ? "#1a3a1a"
              : hasData
              ? "linear-gradient(135deg, #2a6a2a, #3a8a3a)"
              : "#1a1a1a",
            border:
              saved || isBlockSaved || hasData
                ? "1px solid #4a9a4a"
                : "1px solid #222222",
            borderRadius: "10px",
            color: saved || isBlockSaved ? "#4a9a4a" : hasData ? "#ffffff" : "#444444",
            fontSize: "15px",
            fontWeight: 700,
            cursor: hasData && !isBlockSaved ? "pointer" : "default",
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            letterSpacing: "0.5px",
            transition: "all 0.2s ease",
          }}
        >
          {isBlockSaved ? "✓ Gestoor" : saved ? "✓ Gestoor" : "Stoor Kamp"}
        </button>
        <button
          onClick={() => navigateBlock(1)}
          disabled={isLast}
          style={{
            padding: "14px",
            background: "#1a1a1a",
            border: "1px solid #333333",
            borderRadius: "10px",
            color: isLast ? "#333333" : "#888888",
            fontSize: "16px",
            cursor: isLast ? "default" : "pointer",
          }}
        >
          ▶
        </button>
      </div>

      {/* Block Selector Modal */}
      {showBlockSelector && (
        <BlockSelector
          blocks={blocks}
          seasons={seasons}
          selectedId={selectedBlockId}
          inspectedBlockIds={new Set(Object.keys(inspections))}
          onSelect={setSelectedBlockId}
          onClose={() => setShowBlockSelector(false)}
        />
      )}

      {/* Summary Modal */}
      {showSummary && (
        <InspectionSummary
          inspections={inspections}
          blocks={blocks}
          weeds={weeds}
          stageName={stage?.name || ""}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Weed Note Modal */}
      {editingNoteWeed && (
        <WeedNoteModal
          weed={weeds.find((w) => w.id === editingNoteWeed)!}
          severity={currentData[editingNoteWeed]?.severity || 0}
          note={currentData[editingNoteWeed]?.notes || ""}
          zones={currentData[editingNoteWeed]?.zones || []}
          geometry={selectedBlock?.geometry || null}
          onSave={handleNoteSave}
          onClose={() => setEditingNoteWeed(null)}
        />
      )}
    </div>
  );
}
