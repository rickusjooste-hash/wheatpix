"use client";

import {
  SEVERITY_LEVELS,
  type WeedSpecies,
  type Block,
  type WeedData,
  type SeverityLevel,
} from "@/lib/inspection-utils";

interface InspectionSummaryProps {
  inspections: Record<string, WeedData>;
  blocks: Block[];
  weeds: WeedSpecies[];
  stageName: string;
  onClose: () => void;
}

export default function InspectionSummary({
  inspections,
  blocks,
  weeds,
  stageName,
  onClose,
}: InspectionSummaryProps) {
  const inspectedBlocks = blocks.filter((b) => inspections[b.id]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#0a0a0a",
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
        <div>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#cccccc",
              fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            }}
          >
            Opsomming
          </span>
          {stageName && (
            <div
              style={{
                fontSize: "10px",
                color: "#4a9a4a",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginTop: "2px",
              }}
            >
              ● {stageName}
            </div>
          )}
        </div>
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
      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        {inspectedBlocks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#555555",
              padding: "40px",
              fontSize: "14px",
            }}
          >
            Geen inspeksies voltooi nie
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                fontSize: "10px",
                fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                width: "max-content",
                minWidth: "100%",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      position: "sticky",
                      left: 0,
                      background: "#0a0a0a",
                      padding: "6px 10px",
                      textAlign: "left",
                      color: "#888888",
                      borderBottom: "1px solid #333333",
                      zIndex: 2,
                      minWidth: "90px",
                    }}
                  >
                    Kamp
                  </th>
                  {weeds.map((w) => (
                    <th
                      key={w.id}
                      style={{
                        padding: "6px 4px",
                        color: "#666666",
                        borderBottom: "1px solid #333333",
                        textAlign: "center",
                        minWidth: "28px",
                        fontSize: "9px",
                      }}
                    >
                      {w.abbreviation}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspectedBlocks.map((b) => {
                  const data = inspections[b.id] || {};
                  return (
                    <tr key={b.id}>
                      <td
                        style={{
                          position: "sticky",
                          left: 0,
                          background: "#0a0a0a",
                          padding: "6px 10px",
                          color: "#cccccc",
                          borderBottom: "1px solid #1a1a1a",
                          fontWeight: 600,
                          fontSize: "11px",
                          zIndex: 2,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.name}
                      </td>
                      {weeds.map((w) => {
                        const sev = (data[w.id]?.severity || 0) as SeverityLevel;
                        const sv = SEVERITY_LEVELS[sev];
                        return (
                          <td
                            key={w.id}
                            style={{
                              textAlign: "center",
                              padding: "4px 2px",
                              color: sev > 0 ? sv.color : "#222222",
                              borderBottom: "1px solid #1a1a1a",
                              fontWeight: 700,
                              fontSize: sev >= 3 ? "9px" : "10px",
                            }}
                          >
                            {sev > 0 ? sv.label : "·"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
