"use client";

import type { Herbicide, HerbicideRecommendation } from "@/lib/inspection-utils";

const UNITS = ["L/ha", "ml/ha", "g/ha", "kg/ha"] as const;

function RateInput({
  rate,
  unit,
  onRateChange,
  onUnitChange,
}: {
  rate: number | null;
  unit: string | null;
  onRateChange: (v: number | null) => void;
  onUnitChange: (v: string | null) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px 8px 36px",
        background: "#151f0c",
        border: "1px solid #3a6a2a",
        borderTop: "none",
        borderRadius: "0 0 8px 8px",
      }}
    >
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        placeholder="—"
        value={rate ?? ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = e.target.value;
          onRateChange(v === "" ? null : parseFloat(v));
        }}
        style={{
          width: "70px",
          padding: "6px 8px",
          background: "#0a0a0a",
          border: "1px solid #333333",
          borderRadius: "6px",
          color: "#cccccc",
          fontSize: "14px",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          textAlign: "right",
          boxSizing: "border-box",
        }}
      />
      <select
        value={unit || ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUnitChange(e.target.value || null)}
        style={{
          padding: "6px 8px",
          background: "#0a0a0a",
          border: "1px solid #333333",
          borderRadius: "6px",
          color: "#cccccc",
          fontSize: "12px",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          boxSizing: "border-box",
        }}
      >
        <option value="">—</option>
        {UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </div>
  );
}

interface HerbicideRecommendationsProps {
  recommendations: HerbicideRecommendation[];
  allHerbicides: Herbicide[];
  selectedIds: Set<string>;
  rates: Record<string, number | null>;
  units: Record<string, string | null>;
  onToggle: (herbicideId: string) => void;
  onRateChange: (herbicideId: string, rate: number | null) => void;
  onUnitChange: (herbicideId: string, unit: string | null) => void;
}

export default function HerbicideRecommendations({
  recommendations,
  allHerbicides,
  selectedIds,
  rates,
  units,
  onToggle,
  onRateChange,
  onUnitChange,
}: HerbicideRecommendationsProps) {
  const recMap = new Map(recommendations.map((r) => [r.herbicide.id, r]));
  const sorted = [...allHerbicides].sort((a, b) => a.name.localeCompare(b.name));

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
        ▌ Middels
      </div>

      {sorted.map((h) => {
        const selected = selectedIds.has(h.id);
        const rec = recMap.get(h.id);
        return (
          <div key={h.id} style={{ marginBottom: "6px" }}>
            <button
              onClick={() => onToggle(h.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                width: "100%",
                padding: "10px 12px",
                background: selected ? "#1a2a10" : "#111111",
                border: `1px solid ${selected ? "#3a6a2a" : "#222222"}`,
                borderRadius: selected ? "8px 8px 0 0" : "8px",
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
                  {h.name}
                </div>
                {rec && (
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
                )}
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
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {rec && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#4a9a4a",
                      fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                    }}
                  >
                    aanbeveel
                  </span>
                )}
                {h.group_code && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#555555",
                      fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                      padding: "2px 5px",
                      border: "1px solid #333333",
                      borderRadius: "4px",
                    }}
                  >
                    {h.group_code}
                  </span>
                )}
              </div>
            </button>
            {selected && (
              <RateInput
                rate={rates[h.id] ?? null}
                unit={units[h.id] ?? null}
                onRateChange={(v) => onRateChange(h.id, v)}
                onUnitChange={(v) => onUnitChange(h.id, v)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
