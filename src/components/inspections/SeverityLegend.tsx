"use client";

import { SEVERITY_LEVELS } from "@/lib/inspection-utils";

export default function SeverityLegend() {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        padding: "8px 0",
      }}
    >
      {SEVERITY_LEVELS.map((s) => (
        <div
          key={s.level}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11px",
            color: s.level === 0 ? "#555555" : s.color,
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "3px",
              background: s.level === 0 ? "#1a1a1a" : s.bg,
              border: `1.5px solid ${s.border}`,
            }}
          />
          {s.name}
        </div>
      ))}
    </div>
  );
}
