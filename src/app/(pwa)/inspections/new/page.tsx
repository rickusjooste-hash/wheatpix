"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StageSelector from "@/components/inspections/StageSelector";
import type { InspectionStage } from "@/lib/inspection-utils";

interface FarmRow {
  id: string;
  name: string;
  client_id: string | null;
}

export default function NewInspectionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [farms, setFarms] = useState<FarmRow[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [stages, setStages] = useState<InspectionStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user's farms
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Query farms directly — RLS filters based on role
      const { data: farmData } = await supabase
        .from("farms" as never)
        .select("id, name, client_id" as never)
        .order("name" as never);

      if (farmData && farmData.length > 0) {
        const fd = farmData as unknown as FarmRow[];
        setFarms(fd);
        if (fd.length === 1) {
          setSelectedFarmId(fd[0].id);
        }
      }
      setLoading(false);
    }

    load();
  }, [supabase]);

  // Load stages when farm changes
  useEffect(() => {
    if (!selectedFarmId) {
      setStages([]);
      setSelectedStageId(null);
      return;
    }

    async function loadStages() {
      const { data: stageData } = await supabase
        .from("inspection_stages" as never)
        .select("*")
        .eq("farm_id" as never, selectedFarmId as never)
        .order("sort_order" as never);

      if (stageData) setStages(stageData as unknown as InspectionStage[]);
    }

    loadStages();
  }, [supabase, selectedFarmId]);

  const handleAddStage = async (name: string) => {
    if (!selectedFarmId) return;

    const { data, error } = await supabase
      .from("inspection_stages" as never)
      .insert({
        farm_id: selectedFarmId,
        name,
        sort_order: stages.length,
        is_default: false,
      } as never)
      .select()
      .single();

    if (data && !error) {
      setStages((prev) => [...prev, data as unknown as InspectionStage]);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    const { error } = await supabase
      .from("inspection_stages" as never)
      .delete()
      .eq("id" as never, stageId as never);

    if (!error) {
      setStages((prev) => prev.filter((s) => s.id !== stageId));
      if (selectedStageId === stageId) setSelectedStageId(null);
    }
  };

  const handleStart = () => {
    if (!selectedStageId || !selectedFarmId) return;
    router.push(`/inspections/${selectedStageId}?farm=${selectedFarmId}`);
  };

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

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
        Laai...
      </div>
    );
  }

  if (farms.length === 0) {
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
          padding: "24px",
          textAlign: "center",
        }}
      >
        Geen plase gevind nie. Kontak jou administrateur.
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
        color: "#eeeeee",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "40px 24px 20px" }}>
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
      </div>

      {/* Farm selector — only show if multiple farms */}
      {farms.length > 1 && (
        <div style={{ padding: "0 24px", marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#cccccc",
              marginBottom: "12px",
            }}
          >
            Kies plaas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {farms.map((fm) => (
              <button
                key={fm.id}
                onClick={() => {
                  setSelectedFarmId(fm.id);
                  setSelectedStageId(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "14px 18px",
                  background:
                    selectedFarmId === fm.id ? "#1a2a1a" : "#111111",
                  border:
                    selectedFarmId === fm.id
                      ? "2px solid #4a9a4a"
                      : "2px solid #222222",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color:
                      selectedFarmId === fm.id ? "#6dbb6d" : "#cccccc",
                    fontFamily:
                      "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  }}
                >
                  {fm.name}
                </span>
                {selectedFarmId === fm.id && (
                  <span style={{ color: "#4a9a4a", fontSize: "18px" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show selected farm name when auto-selected */}
      {farms.length === 1 && selectedFarm && (
        <div
          style={{
            padding: "0 24px",
            marginBottom: "8px",
            fontSize: "16px",
            fontWeight: 700,
            color: "#eeeeee",
          }}
        >
          {selectedFarm.name}
        </div>
      )}

      {/* Stage selector — only show after farm is selected */}
      {selectedFarmId && (
        <StageSelector
          stages={stages}
          selectedStageId={selectedStageId}
          onSelect={setSelectedStageId}
          onAddStage={handleAddStage}
          onDeleteStage={handleDeleteStage}
        />
      )}

      <div style={{ padding: "24px", marginTop: "auto" }}>
        <button
          onClick={handleStart}
          disabled={!selectedStageId || !selectedFarmId}
          style={{
            width: "100%",
            padding: "16px",
            background:
              selectedStageId && selectedFarmId
                ? "linear-gradient(135deg, #2a6a2a, #3a8a3a)"
                : "#1a1a1a",
            border:
              selectedStageId && selectedFarmId
                ? "1px solid #4a9a4a"
                : "1px solid #222222",
            borderRadius: "12px",
            color: selectedStageId && selectedFarmId ? "#ffffff" : "#444444",
            fontSize: "16px",
            fontWeight: 700,
            cursor:
              selectedStageId && selectedFarmId ? "pointer" : "default",
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            letterSpacing: "1px",
          }}
        >
          Begin Inspeksie →
        </button>
      </div>
    </div>
  );
}
