"use client";

import { useState } from "react";
import { SEVERITY_LEVELS, type SeverityLevel, type WeedSpecies } from "@/lib/inspection-utils";
import ZoneGridModal from "./ZoneGridModal";

interface WeedNoteModalProps {
  weed: WeedSpecies;
  severity: SeverityLevel;
  note: string;
  zones: number[];
  geometry: { lat: number; lng: number }[] | null;
  onSave: (note: string, zones: number[]) => void;
  onClose: () => void;
}

export default function WeedNoteModal({
  weed,
  severity,
  note,
  zones: initialZones,
  geometry,
  onSave,
  onClose,
}: WeedNoteModalProps) {
  const [value, setValue] = useState(note);
  const [zones, setZones] = useState<number[]>(initialZones);
  const [showZoneGrid, setShowZoneGrid] = useState(false);
  const s = SEVERITY_LEVELS[severity];

  if (showZoneGrid && geometry) {
    return (
      <ZoneGridModal
        geometry={geometry}
        selectedZones={zones}
        onSave={(newZones) => {
          setZones(newZones);
          setShowZoneGrid(false);
        }}
        onClose={() => setShowZoneGrid(false)}
        weedName={weed.name}
        color={s.color}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          position: "relative",
          background: "#111111",
          borderTop: "1px solid #333333",
          borderRadius: "16px 16px 0 0",
          padding: "20px",
          maxWidth: "480px",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#eeeeee",
            }}
          >
            {weed.name}
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: s.color,
              fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            }}
          >
            {s.label} {s.name}
          </span>
        </div>

        {/* Text note with map icon */}
        <div style={{ position: "relative" }}>
          <textarea
            autoFocus
            placeholder="Nota (bv. posisie, digtheid)..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              paddingRight: geometry ? "44px" : "12px",
              background: "#1a1a1a",
              border: "1px solid #333333",
              borderRadius: "8px",
              color: "#cccccc",
              fontSize: "14px",
              resize: "vertical",
              minHeight: "80px",
              fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
              boxSizing: "border-box",
            }}
          />
          {geometry && (
            <button
              onClick={() => setShowZoneGrid(true)}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: zones.length > 0 ? "#1a2a1a" : "transparent",
                border: `1px solid ${zones.length > 0 ? "#4a9a4a" : "#444444"}`,
                borderRadius: "6px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke={zones.length > 0 ? "#4a9a4a" : "#666666"}
                strokeWidth="1.2"
              >
                <rect x="1" y="1" width="14" height="14" rx="1" />
                <line x1="1" y1="5" x2="15" y2="5" />
                <line x1="1" y1="9" x2="15" y2="9" />
                <line x1="1" y1="13" x2="15" y2="13" />
                <line x1="5" y1="1" x2="5" y2="15" />
                <line x1="9" y1="1" x2="9" y2="15" />
                <line x1="13" y1="1" x2="13" y2="15" />
              </svg>
            </button>
          )}
        </div>

        {/* Zone count indicator */}
        {zones.length > 0 && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              color: s.color,
              fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            }}
          >
            ▦ {zones.length} sone{zones.length !== 1 ? "s" : ""} gemerk
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "14px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              background: "#1a1a1a",
              border: "1px solid #333333",
              borderRadius: "8px",
              color: "#888888",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Kanselleer
          </button>
          <button
            onClick={() => onSave(value, zones)}
            style={{
              flex: 1,
              padding: "12px",
              background: "linear-gradient(135deg, #2a6a2a, #3a8a3a)",
              border: "1px solid #4a9a4a",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Stoor
          </button>
        </div>
      </div>
    </div>
  );
}
