"use client";

import { useState } from "react";
import { SEVERITY_LEVELS, type SeverityLevel, type WeedSpecies } from "@/lib/inspection-utils";

interface WeedNoteModalProps {
  weed: WeedSpecies;
  severity: SeverityLevel;
  note: string;
  onSave: (note: string) => void;
  onClose: () => void;
}

export default function WeedNoteModal({
  weed,
  severity,
  note,
  onSave,
  onClose,
}: WeedNoteModalProps) {
  const [value, setValue] = useState(note);
  const s = SEVERITY_LEVELS[severity];

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
        <textarea
          autoFocus
          placeholder="Nota (bv. posisie, digtheid)..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
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
            onClick={() => onSave(value)}
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
