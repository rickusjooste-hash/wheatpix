"use client";

import { useState } from "react";
import type { InspectionStage } from "@/lib/inspection-utils";

interface StageSelectorProps {
  stages: InspectionStage[];
  selectedStageId: string | null;
  onSelect: (stageId: string) => void;
  onAddStage: (name: string) => void;
  onDeleteStage: (stageId: string) => void;
}

export default function StageSelector({
  stages,
  selectedStageId,
  onSelect,
  onAddStage,
  onDeleteStage,
}: StageSelectorProps) {
  const [editingStages, setEditingStages] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  const handleAdd = () => {
    if (newStageName.trim()) {
      onAddStage(newStageName.trim());
      setNewStageName("");
    }
  };

  return (
    <div style={{ padding: "0 24px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#cccccc",
          marginBottom: "16px",
        }}
      >
        Kies inspeksie stadium
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => onSelect(stage.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "16px 18px",
              background: selectedStageId === stage.id ? "#1a2a1a" : "#111111",
              border:
                selectedStageId === stage.id
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
                color: selectedStageId === stage.id ? "#6dbb6d" : "#cccccc",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              }}
            >
              {stage.name}
            </span>
            {selectedStageId === stage.id && (
              <span style={{ color: "#4a9a4a", fontSize: "18px" }}>✓</span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => setEditingStages(!editingStages)}
        style={{
          background: "none",
          border: "none",
          color: "#555555",
          fontSize: "12px",
          padding: "12px 0",
          cursor: "pointer",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
        }}
      >
        {editingStages ? "▲ Klaar met wysig" : "▼ Wysig stadiums"}
      </button>

      {editingStages && (
        <div
          style={{
            background: "#111111",
            border: "1px solid #222222",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 4px",
                borderBottom:
                  idx < stages.length - 1 ? "1px solid #1a1a1a" : "none",
              }}
            >
              <span style={{ color: "#cccccc", fontSize: "13px" }}>
                {stage.name}
              </span>
              {!stage.is_default && (
                <button
                  onClick={() => onDeleteStage(stage.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#663333",
                    fontSize: "16px",
                    cursor: "pointer",
                    padding: "2px 8px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="Nuwe stadium..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "#0a0a0a",
                border: "1px solid #333333",
                borderRadius: "6px",
                color: "#cccccc",
                fontSize: "13px",
                fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
              }}
            />
            <button
              onClick={handleAdd}
              style={{
                padding: "10px 16px",
                background: newStageName.trim() ? "#1a2a1a" : "#111111",
                border: "1px solid #333333",
                borderRadius: "6px",
                color: newStageName.trim() ? "#6dbb6d" : "#444444",
                fontSize: "13px",
                cursor: newStageName.trim() ? "pointer" : "default",
                fontWeight: 600,
              }}
            >
              + Voeg by
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
