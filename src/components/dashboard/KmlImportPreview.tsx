"use client";

import { useState } from "react";

export interface KmlPreviewBlock {
  name: string;
  geometry: { lat: number; lng: number }[];
  areaHa: number;
  cultivar: string | null;
  isChecked: boolean;
  isDuplicate: boolean;
}

interface KmlImportPreviewProps {
  fileName: string;
  previewBlocks: KmlPreviewBlock[];
  activeIndex: number | null;
  onToggleCheck: (index: number) => void;
  onToggleAll: (checked: boolean) => void;
  onSelectBlock: (index: number | null) => void;
  onUpdateBlock: (index: number, updates: { name?: string; cultivar?: string | null }) => void;
  onConfirm: () => void;
  onCancel: () => void;
  importing: boolean;
}

export default function KmlImportPreview({
  fileName,
  previewBlocks,
  activeIndex,
  onToggleCheck,
  onToggleAll,
  onSelectBlock,
  onUpdateBlock,
  onConfirm,
  onCancel,
  importing,
}: KmlImportPreviewProps) {
  const checkedCount = previewBlocks.filter((b) => b.isChecked).length;
  const allChecked = checkedCount === previewBlocks.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "20px", borderBottom: "1px solid #f0f0ec" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
          KML Voorskou
        </h2>
        <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
          {previewBlocks.length} kampe gevind · {fileName}
        </div>
      </div>

      {/* Select all header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 20px",
          borderBottom: "2px solid #e8e8e4",
          fontSize: "11px",
          color: "#999",
        }}
      >
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => onToggleAll(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        <span style={{ flex: 1 }}>Naam</span>
        <span style={{ width: "60px", textAlign: "right" }}>Ha</span>
        <span style={{ width: "65px", textAlign: "center" }}>Status</span>
      </div>

      {/* Block list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {previewBlocks.map((block, i) => {
          const isActive = i === activeIndex;

          if (isActive) {
            return (
              <div
                key={i}
                style={{
                  background: "#FFFBEB",
                  borderLeft: "3px solid #F5C842",
                  padding: "12px 17px",
                  borderBottom: "1px solid #f0f0ec",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <input
                    type="checkbox"
                    checked={block.isChecked}
                    onChange={() => onToggleCheck(i)}
                    style={{ cursor: "pointer" }}
                  />
                  <div
                    style={{
                      flex: 1,
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#D4890A",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Wysig kamp
                  </div>
                  {block.isDuplicate && (
                    <span
                      style={{
                        fontSize: "9px",
                        background: "#FFF3E0",
                        color: "#E65100",
                        padding: "2px 6px",
                        borderRadius: "3px",
                      }}
                    >
                      Duplikaat
                    </span>
                  )}
                  {!block.isDuplicate && (
                    <span
                      style={{
                        fontSize: "9px",
                        background: "#E8F5E9",
                        color: "#2D5A1B",
                        padding: "2px 6px",
                        borderRadius: "3px",
                      }}
                    >
                      Nuut
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "10px", color: "#999", marginBottom: "3px" }}>Naam</div>
                  <input
                    type="text"
                    value={block.name}
                    onChange={(e) => onUpdateBlock(i, { name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      border: "1px solid #e8e8e4",
                      borderRadius: "4px",
                      fontSize: "13px",
                      color: "#1a1a1a",
                      background: "white",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", color: "#999", marginBottom: "3px" }}>Kultivar</div>
                    <input
                      type="text"
                      value={block.cultivar || ""}
                      onChange={(e) => onUpdateBlock(i, { cultivar: e.target.value || null })}
                      placeholder="Opsioneel"
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "1px solid #e8e8e4",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#1a1a1a",
                        background: "white",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ width: "80px" }}>
                    <div style={{ fontSize: "10px", color: "#999", marginBottom: "3px" }}>Hektaar</div>
                    <div
                      style={{
                        padding: "6px 8px",
                        fontSize: "12px",
                        color: "#666",
                        fontFamily: "var(--font-jetbrains), monospace",
                        background: "#f7f7f5",
                        borderRadius: "4px",
                        border: "1px solid #e8e8e4",
                      }}
                    >
                      {block.areaHa.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              onClick={() => onSelectBlock(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderBottom: "1px solid #f0f0ec",
                cursor: "pointer",
                background: block.isDuplicate ? "#FFF8E1" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={block.isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleCheck(i);
                }}
                style={{ cursor: "pointer" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#1a1a1a",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {block.name}
                </div>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#999",
                  fontFamily: "var(--font-jetbrains), monospace",
                  flexShrink: 0,
                }}
              >
                {block.areaHa.toFixed(1)}
              </span>
              {block.isDuplicate ? (
                <span
                  style={{
                    fontSize: "9px",
                    background: "#FFF3E0",
                    color: "#E65100",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    flexShrink: 0,
                  }}
                >
                  Duplikaat
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "9px",
                    background: "#E8F5E9",
                    color: "#2D5A1B",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    flexShrink: 0,
                  }}
                >
                  Nuut
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #e8e8e4",
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          onClick={onCancel}
          disabled={importing}
          style={{
            flex: 1,
            padding: "10px",
            background: "transparent",
            border: "1px solid #e8e8e4",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#666",
            cursor: importing ? "not-allowed" : "pointer",
          }}
        >
          Kanselleer
        </button>
        <button
          onClick={onConfirm}
          disabled={importing || checkedCount === 0}
          style={{
            flex: 1,
            padding: "10px",
            background: checkedCount === 0 ? "#ccc" : "#2D5A1B",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#F5EDDA",
            fontWeight: 600,
            cursor: importing || checkedCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          {importing ? "Importeer..." : `Importeer ${checkedCount}`}
        </button>
      </div>
    </div>
  );
}
