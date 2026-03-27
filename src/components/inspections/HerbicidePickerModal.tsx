"use client";

import { useState } from "react";
import type { Herbicide } from "@/lib/inspection-utils";

interface HerbicidePickerModalProps {
  herbicides: Herbicide[];
  selectedIds: Set<string>;
  onSelect: (herbicideId: string) => void;
  onClose: () => void;
}

export default function HerbicidePickerModal({
  herbicides,
  selectedIds,
  onSelect,
  onClose,
}: HerbicidePickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = herbicides.filter((h) => {
    if (selectedIds.has(h.id)) return false;
    const q = search.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.active_ingredients.some((a) => a.toLowerCase().includes(q))
    );
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid #222222",
        }}
      >
        <span
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#cccccc",
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          }}
        >
          Kies Middel
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888888",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 20px" }}>
        <input
          type="text"
          placeholder="Soek middel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#111111",
            border: "1px solid #333333",
            borderRadius: "8px",
            color: "#cccccc",
            fontSize: "14px",
            fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 20px" }}>
        {filtered.map((h) => (
          <button
            key={h.id}
            onClick={() => onSelect(h.id)}
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              marginBottom: "6px",
              background: "#111111",
              border: "1px solid #222222",
              borderRadius: "8px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#cccccc" }}>
              {h.name}
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                marginTop: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#666666",
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                }}
              >
                {h.active_ingredients.join(" + ")}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: h.category === "grass" ? "#4a7a4a" : "#7a6a3a",
                  fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  padding: "1px 5px",
                  border: `1px solid ${h.category === "grass" ? "#3a5a3a" : "#5a4a2a"}`,
                  borderRadius: "3px",
                }}
              >
                {h.category === "grass" ? "gras" : "breeblaar"}
              </span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#555555",
              padding: "40px",
              fontSize: "14px",
            }}
          >
            Geen resultate
          </div>
        )}
      </div>
    </div>
  );
}
