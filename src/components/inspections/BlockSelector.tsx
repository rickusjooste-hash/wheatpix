"use client";

import type { Block, BlockSeason } from "@/lib/inspection-utils";

interface BlockSelectorProps {
  blocks: Block[];
  seasons: Record<string, BlockSeason>; // block_id → current season
  selectedId: string;
  inspectedBlockIds: Set<string>;
  onSelect: (blockId: string) => void;
  onClose: () => void;
}

export default function BlockSelector({
  blocks,
  seasons,
  selectedId,
  inspectedBlockIds,
  onSelect,
  onClose,
}: BlockSelectorProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
          Kies Kamp
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888888",
            fontSize: "24px",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 12px" }}>
        {blocks.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              onSelect(b.id);
              onClose();
            }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              padding: "14px 16px",
              background: selectedId === b.id ? "#1a2a1a" : "transparent",
              border: "none",
              borderBottom: "1px solid #1a1a1a",
              borderRadius: "6px",
              cursor: "pointer",
              marginBottom: "2px",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: selectedId === b.id ? "#6dbb6d" : "#dddddd",
                }}
              >
                {b.name}
              </div>
              <div style={{ fontSize: "12px", color: "#666666", marginTop: "2px" }}>
                {seasons[b.id]?.crop || "—"} — {seasons[b.id]?.cultivar || "—"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {inspectedBlockIds.has(b.id) && (
                <span style={{ color: "#4a9a4a", fontSize: "14px" }}>✓</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
