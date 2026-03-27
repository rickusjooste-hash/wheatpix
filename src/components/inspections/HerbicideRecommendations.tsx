"use client";

import { useState } from "react";
import type { Herbicide, HerbicideRecommendation } from "@/lib/inspection-utils";
import HerbicidePickerModal from "./HerbicidePickerModal";

interface HerbicideRecommendationsProps {
  recommendations: HerbicideRecommendation[];
  allHerbicides: Herbicide[];
  selectedIds: Set<string>;
  onToggle: (herbicideId: string) => void;
  onAdd: (herbicideId: string) => void;
}

export default function HerbicideRecommendations({
  recommendations,
  allHerbicides,
  selectedIds,
  onToggle,
  onAdd,
}: HerbicideRecommendationsProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Manual additions = selected but not in auto recommendations
  const autoIds = new Set(recommendations.map((r) => r.herbicide.id));
  const manualIds = [...selectedIds].filter((id) => !autoIds.has(id));
  const manualHerbicides = allHerbicides.filter((h) => manualIds.includes(h.id));

  if (recommendations.length === 0 && manualHerbicides.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: "16px 20px 0" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#5a6a3a",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "10px",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
        }}
      >
        ▌ Aanbevelings
      </div>

      {/* Auto-suggested herbicides */}
      {recommendations.map((rec) => {
        const selected = selectedIds.has(rec.herbicide.id);
        return (
          <button
            key={rec.herbicide.id}
            onClick={() => onToggle(rec.herbicide.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              width: "100%",
              padding: "10px 12px",
              marginBottom: "6px",
              background: selected ? "#1a2a10" : "#111111",
              border: `1px solid ${selected ? "#3a6a2a" : "#222222"}`,
              borderRadius: "8px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: "16px",
                lineHeight: 1,
                color: selected ? "#4a9a4a" : "#333333",
                marginTop: "1px",
                flexShrink: 0,
              }}
            >
              {selected ? "✓" : "○"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: selected ? "#cccccc" : "#888888",
                }}
              >
                {rec.herbicide.name}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#666666",
                  marginTop: "2px",
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                }}
              >
                {rec.coveredWeeds.map((w) => w.abbreviation).join(", ")}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "#444444",
                  marginTop: "2px",
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                }}
              >
                {rec.herbicide.active_ingredients.join(" + ")}
              </div>
            </div>
            {rec.herbicide.group_code && (
              <span
                style={{
                  fontSize: "9px",
                  color: "#555555",
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  padding: "2px 5px",
                  border: "1px solid #333333",
                  borderRadius: "4px",
                  flexShrink: 0,
                }}
              >
                {rec.herbicide.group_code}
              </span>
            )}
          </button>
        );
      })}

      {/* Manual additions */}
      {manualHerbicides.map((h) => (
        <button
          key={h.id}
          onClick={() => onToggle(h.id)}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            width: "100%",
            padding: "10px 12px",
            marginBottom: "6px",
            background: "#1a2a10",
            border: "1px solid #3a6a2a",
            borderRadius: "8px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1, color: "#4a9a4a", marginTop: "1px", flexShrink: 0 }}>
            ✓
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#cccccc" }}>
              {h.name}
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "#444444",
                marginTop: "2px",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
              }}
            >
              {h.active_ingredients.join(" + ")}
            </div>
          </div>
          <span
            style={{
              fontSize: "9px",
              color: "#5a6a3a",
              fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            }}
          >
            handmatig
          </span>
        </button>
      ))}

      {/* Add manual button */}
      <button
        onClick={() => setShowPicker(true)}
        style={{
          width: "100%",
          padding: "10px",
          background: "#111111",
          border: "1px dashed #333333",
          borderRadius: "8px",
          color: "#666666",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
        }}
      >
        + Voeg middel by
      </button>

      {showPicker && (
        <HerbicidePickerModal
          herbicides={allHerbicides}
          selectedIds={selectedIds}
          onSelect={(id) => {
            onAdd(id);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
