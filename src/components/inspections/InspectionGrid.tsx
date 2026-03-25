"use client";

import WeedButton from "./WeedButton";
import type { WeedSpecies, SeverityLevel, WeedData } from "@/lib/inspection-utils";

interface InspectionGridProps {
  grasses: WeedSpecies[];
  broadleaf: WeedSpecies[];
  weedData: WeedData;
  onTap: (weedId: string) => void;
}

export default function InspectionGrid({
  grasses,
  broadleaf,
  weedData,
  onTap,
}: InspectionGridProps) {
  return (
    <>
      {/* Grasse Section */}
      <div style={{ padding: "12px 20px 0" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#4a7a4a",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: "8px",
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          }}
        >
          ▌ Grasse
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "8px",
          }}
        >
          {grasses.map((w) => (
            <WeedButton
              key={w.id}
              weed={w}
              severity={(weedData[w.id] || 0) as SeverityLevel}
              onTap={onTap}
            />
          ))}
        </div>
      </div>

      {/* Breeblaar Section */}
      <div style={{ padding: "16px 20px 0" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#7a6a3a",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: "8px",
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          }}
        >
          ▌ Breeblaar
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "8px",
          }}
        >
          {broadleaf.map((w) => (
            <WeedButton
              key={w.id}
              weed={w}
              severity={(weedData[w.id] || 0) as SeverityLevel}
              onTap={onTap}
            />
          ))}
        </div>
      </div>
    </>
  );
}
