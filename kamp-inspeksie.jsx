import React, { useState, useEffect, useCallback } from "react";

const SEVERITY = [
  { level: 0, label: "", name: "Niks", color: "#2a2a2a", bg: "#1a1a1a", border: "#333" },
  { level: 1, label: "−", name: "Baie Min", color: "#5a8a5a", bg: "#1a2a1a", border: "#3a5a3a" },
  { level: 2, label: "X", name: "Min", color: "#d4a017", bg: "#2c2510", border: "#6b5210" },
  { level: 3, label: "XX", name: "Redelik", color: "#e87b35", bg: "#2c1a0e", border: "#7a3d15" },
  { level: 4, label: "XXX", name: "Baie", color: "#e8413c", bg: "#2c0e0e", border: "#7a1515" },
];

const DEFAULT_WEEDS = {
  grasse: [
    { id: "wh", name: "Wilde Hawer", abbr: "WH" },
    { id: "pl", name: "Predikantstuis", abbr: "PL" },
    { id: "rg", name: "Raaigras", abbr: "RG" },
    { id: "ks", name: "Kanariesaad", abbr: "KS" },
    { id: "vl", name: "Vulpia", abbr: "VL" },
  ],
  breeblaar: [
    { id: "mx", name: "Emex", abbr: "MX" },
    { id: "kb", name: "Kiesieblaar", abbr: "KB" },
    { id: "s", name: "Sierings", abbr: "S" },
    { id: "tk", name: "Turknaels", abbr: "TK" },
    { id: "rs", name: "Rumnas", abbr: "RS" },
    { id: "gb", name: "Gousbloem", abbr: "GB" },
    { id: "sm", name: "Sterremier", abbr: "SM" },
    { id: "cn", name: "Canola", abbr: "CN" },
    { id: "kd", name: "Koperdraad", abbr: "KD" },
    { id: "sk", name: "Stinkkruid", abbr: "SK" },
    { id: "md", name: "Medics", abbr: "MD" },
    { id: "lp", name: "Suuring", abbr: "LP" },
    { id: "hb", name: "Hongerbos", abbr: "HB" },
    { id: "gk", name: "Ganskos", abbr: "GK" },
  ],
};

const DEFAULT_STAGES = ["Voor Plant", "Opkoms"];

const BLOCKS = [
  { id: 1, name: "Werfkamp", crop: "Koring", cultivar: "SST 806" },
  { id: 2, name: "2 Reservoir", crop: "Koring", cultivar: "SST 806" },
  { id: 3, name: "Sluiskamp", crop: "Canola", cultivar: "Diamond" },
  { id: 4, name: "Rivierkamp", crop: "Koring", cultivar: "SST 866" },
  { id: 5, name: "Rivier pad kamp", crop: "Hawer", cultivar: "Pallinup" },
  { id: 6, name: "Rooikop", crop: "Koring", cultivar: "SST 806" },
  { id: 7, name: "Bergkamp", crop: "Lupiene", cultivar: "Mandelup" },
  { id: 8, name: "Slootkamp", crop: "Koring", cultivar: "SST 806" },
  { id: 9, name: "Klipkop", crop: "Canola", cultivar: "Diamond" },
  { id: 10, name: "Begraafplaas", crop: "Koring", cultivar: "SST 866" },
  { id: 11, name: "Houthuis", crop: "Koring", cultivar: "SST 806" },
  { id: 12, name: "Stoor", crop: "Hawer", cultivar: "Pallinup" },
  { id: 13, name: "Middelrug Wes", crop: "Koring", cultivar: "SST 806" },
  { id: 14, name: "Motorhek Onder", crop: "Canola", cultivar: "Diamond" },
  { id: 15, name: "Motorhek Bo", crop: "Koring", cultivar: "SST 866" },
  { id: 16, name: "Sloot Wes", crop: "Koring", cultivar: "SST 806" },
  { id: 17, name: "Bergkamp Hberg", crop: "Lupiene", cultivar: "Mandelup" },
  { id: 18, name: "Wolfkloof", crop: "Koring", cultivar: "SST 806" },
];

function WeedButton({ weed, severity, onTap }) {
  const s = SEVERITY[severity];
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = React.useRef(null);
  const didLongPress = React.useRef(false);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      setShowTooltip(true);
    }, 400);
  }, []);

  const endPress = useCallback(() => {
    clearTimeout(timerRef.current);
    if (showTooltip) {
      setShowTooltip(false);
    } else if (!didLongPress.current) {
      onTap(weed.id);
    }
  }, [showTooltip, onTap, weed.id]);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
    setShowTooltip(false);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#222",
            border: "1px solid #444",
            borderRadius: "6px",
            padding: "6px 10px",
            zIndex: 100,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            animation: "tooltipIn 0.15s ease",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#eee",
            }}
          >
            {weed.name}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "-5px",
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: "8px",
              height: "8px",
              background: "#222",
              borderRight: "1px solid #444",
              borderBottom: "1px solid #444",
            }}
          />
        </div>
      )}
      <button
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onTouchCancel={cancelPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          aspectRatio: "1",
          border: `2px solid ${s.border}`,
          borderRadius: "10px",
          background: s.bg,
          cursor: "pointer",
          transition: "all 0.15s ease",
          position: "relative",
          overflow: "hidden",
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
        }}
      >
        {severity > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at center, ${s.color}15, transparent 70%)`,
            }}
          />
        )}
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: severity > 0 ? s.color : "#666",
            letterSpacing: "0.5px",
            zIndex: 1,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
        >
          {weed.abbr}
        </span>
        <span
          style={{
            fontSize: severity === 4 ? "14px" : severity === 3 ? "16px" : "18px",
            fontWeight: 800,
            color: severity > 0 ? s.color : "#333",
            marginTop: "2px",
            zIndex: 1,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            letterSpacing: severity > 2 ? "-1px" : "0",
          }}
        >
          {severity === 0 ? "" : s.label}
        </span>
      </button>
    </div>
  );
}

function SeverityLegend() {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        padding: "8px 0",
      }}
    >
      {SEVERITY.map((s) => (
        <div
          key={s.level}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11px",
            color: s.level === 0 ? "#555" : s.color,
            fontFamily: "'JetBrains Mono', monospace",
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

function BlockSelector({ blocks, selectedId, onSelect, onClose }) {
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
          borderBottom: "1px solid #222",
        }}
      >
        <span
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#ccc",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Kies Kamp
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
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
              background:
                selectedId === b.id ? "#1a2a1a" : "transparent",
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
                  color: selectedId === b.id ? "#6dbb6d" : "#ddd",
                }}
              >
                {b.name}
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                {b.crop} — {b.cultivar}
              </div>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#555",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              #{b.id}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryView({ inspections, blocks, stage, onClose }) {
  const allWeeds = [...DEFAULT_WEEDS.grasse, ...DEFAULT_WEEDS.breeblaar];
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
          borderBottom: "1px solid #222",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#ccc",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Opsomming
          </span>
          {stage && (
            <div
              style={{
                fontSize: "10px",
                color: "#4a9a4a",
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginTop: "2px",
              }}
            >
              ● {stage}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
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
              color: "#555",
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
                fontFamily: "'JetBrains Mono', monospace",
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
                      color: "#888",
                      borderBottom: "1px solid #333",
                      zIndex: 2,
                      minWidth: "90px",
                    }}
                  >
                    Kamp
                  </th>
                  {allWeeds.map((w) => (
                    <th
                      key={w.id}
                      style={{
                        padding: "6px 4px",
                        color: "#666",
                        borderBottom: "1px solid #333",
                        textAlign: "center",
                        minWidth: "28px",
                        fontSize: "9px",
                      }}
                    >
                      {w.abbr}
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
                          color: "#ccc",
                          borderBottom: "1px solid #1a1a1a",
                          fontWeight: 600,
                          fontSize: "11px",
                          zIndex: 2,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.name}
                      </td>
                      {allWeeds.map((w) => {
                        const sev = data[w.id] || 0;
                        const s = SEVERITY[sev];
                        return (
                          <td
                            key={w.id}
                            style={{
                              textAlign: "center",
                              padding: "4px 2px",
                              color: sev > 0 ? s.color : "#222",
                              borderBottom: "1px solid #1a1a1a",
                              fontWeight: 700,
                              fontSize: sev >= 3 ? "9px" : "10px",
                            }}
                          >
                            {sev > 0 ? s.label : "·"}
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

export default function KampInspeksie() {
  const [selectedBlockId, setSelectedBlockId] = useState(BLOCKS[0].id);
  const [inspections, setInspections] = useState({});
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("searching");
  const [saved, setSaved] = useState(false);

  // Stage / timeline state
  const [started, setStarted] = useState(false);
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [selectedStage, setSelectedStage] = useState(null);
  const [editingStages, setEditingStages] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  const selectedBlock = BLOCKS.find((b) => b.id === selectedBlockId);
  const currentData = inspections[selectedBlockId] || {};

  // Simulate GPS lock
  useEffect(() => {
    const t = setTimeout(() => setGpsStatus("locked"), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleTap = useCallback(
    (weedId) => {
      setSaved(false);
      setInspections((prev) => {
        const blockData = prev[selectedBlockId] || {};
        const current = blockData[weedId] || 0;
        const next = (current + 1) % 5;
        return {
          ...prev,
          [selectedBlockId]: {
            ...blockData,
            [weedId]: next,
          },
        };
      });
    },
    [selectedBlockId]
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const completedCount = Object.keys(inspections).length;
  const hasData = Object.values(currentData).some((v) => v > 0);

  // ── Start Screen ──
  if (!started) {
    return (
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          background: "#0a0a0a",
          minHeight: "100vh",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#eee",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />

        <div style={{ padding: "40px 24px 20px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#555",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Kamp Inspeksie
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#444",
              marginTop: "4px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {new Date().toLocaleDateString("af-ZA", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        <div style={{ padding: "0 24px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#ccc",
              marginBottom: "16px",
            }}
          >
            Kies inspeksie stadium
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {stages.map((stage) => (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "16px 18px",
                  background: selectedStage === stage ? "#1a2a1a" : "#111",
                  border: selectedStage === stage ? "2px solid #4a9a4a" : "2px solid #222",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: selectedStage === stage ? "#6dbb6d" : "#ccc",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {stage}
                </span>
                {selectedStage === stage && (
                  <span style={{ color: "#4a9a4a", fontSize: "18px" }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Edit stages toggle */}
          <button
            onClick={() => setEditingStages(!editingStages)}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              fontSize: "12px",
              padding: "12px 0",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {editingStages ? "▲ Klaar met wysig" : "▼ Wysig stadiums"}
          </button>

          {editingStages && (
            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: "10px",
                padding: "14px",
              }}
            >
              {stages.map((stage, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 4px",
                    borderBottom: idx < stages.length - 1 ? "1px solid #1a1a1a" : "none",
                  }}
                >
                  <span style={{ color: "#ccc", fontSize: "13px" }}>{stage}</span>
                  <button
                    onClick={() => {
                      const updated = stages.filter((_, i) => i !== idx);
                      setStages(updated);
                      if (selectedStage === stage) setSelectedStage(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#663333",
                      fontSize: "16px",
                      cursor: "pointer",
                      padding: "2px 8px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Nuwe stadium..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newStageName.trim()) {
                      setStages([...stages, newStageName.trim()]);
                      setNewStageName("");
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    background: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    color: "#ccc",
                    fontSize: "13px",
                    fontFamily: "-apple-system, sans-serif",
                  }}
                />
                <button
                  onClick={() => {
                    if (newStageName.trim()) {
                      setStages([...stages, newStageName.trim()]);
                      setNewStageName("");
                    }
                  }}
                  style={{
                    padding: "10px 16px",
                    background: newStageName.trim() ? "#1a2a1a" : "#111",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    color: newStageName.trim() ? "#6dbb6d" : "#444",
                    fontSize: "13px",
                    cursor: newStageName.trim() ? "pointer" : "default",
                    fontWeight: 600,
                  }}
                >
                  + Voeg by
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Start button */}
        <div style={{ padding: "24px", marginTop: "auto" }}>
          <button
            onClick={() => {
              if (selectedStage) setStarted(true);
            }}
            disabled={!selectedStage}
            style={{
              width: "100%",
              padding: "16px",
              background: selectedStage
                ? "linear-gradient(135deg, #2a6a2a, #3a8a3a)"
                : "#1a1a1a",
              border: selectedStage ? "1px solid #4a9a4a" : "1px solid #222",
              borderRadius: "12px",
              color: selectedStage ? "#fff" : "#444",
              fontSize: "16px",
              fontWeight: 700,
              cursor: selectedStage ? "pointer" : "default",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "1px",
            }}
          >
            Begin Inspeksie →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#eee",
        position: "relative",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div
        style={{
          padding: "16px 20px 12px",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#555",
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Kamp Inspeksie
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#444",
                marginTop: "4px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {new Date().toLocaleDateString("af-ZA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "#4a9a4a",
                marginTop: "4px",
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              ● {selectedStage}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowSummary(true)}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "6px",
                color: "#888",
                fontSize: "11px",
                padding: "6px 12px",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ☰ Opsomming
            </button>
          </div>
        </div>

        {/* GPS Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "10px",
            fontSize: "10px",
            fontFamily: "'JetBrains Mono', monospace",
            color: gpsStatus === "locked" ? "#4a9a4a" : "#8a7a2a",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: gpsStatus === "locked" ? "#4a9a4a" : "#8a7a2a",
              animation:
                gpsStatus === "searching"
                  ? "pulse 1.5s ease-in-out infinite"
                  : "none",
            }}
          />
          {gpsStatus === "locked"
            ? `GPS · ${selectedBlock?.name}`
            : "GPS soek..."}
          <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } } @keyframes tooltipIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
        </div>
      </div>

      {/* Block Header */}
      <button
        onClick={() => setShowBlockSelector(true)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "14px 20px",
          background: "#111",
          border: "none",
          borderBottom: "1px solid #1a1a1a",
          cursor: "pointer",
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#eee",
            }}
          >
            {selectedBlock?.name}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#666",
              marginTop: "3px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {selectedBlock?.crop} · {selectedBlock?.cultivar}
          </div>
        </div>
        <div style={{ color: "#555", fontSize: "18px" }}>▾</div>
      </button>

      {/* Progress Bar */}
      <div style={{ padding: "0 20px", marginTop: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#555",
            marginBottom: "4px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span>{completedCount} / {BLOCKS.length} kampe</span>
          <span>{Math.round((completedCount / BLOCKS.length) * 100)}%</span>
        </div>
        <div
          style={{
            height: "3px",
            background: "#1a1a1a",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(completedCount / BLOCKS.length) * 100}%`,
              background: "linear-gradient(90deg, #2a6a2a, #4a9a4a)",
              borderRadius: "2px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "8px 20px 0" }}>
        <SeverityLegend />
      </div>

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
            fontFamily: "'JetBrains Mono', monospace",
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
          {DEFAULT_WEEDS.grasse.map((w) => (
            <WeedButton
              key={w.id}
              weed={w}
              severity={currentData[w.id] || 0}
              onTap={handleTap}
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
            fontFamily: "'JetBrains Mono', monospace",
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
          {DEFAULT_WEEDS.breeblaar.map((w) => (
            <WeedButton
              key={w.id}
              weed={w}
              severity={currentData[w.id] || 0}
              onTap={handleTap}
            />
          ))}
        </div>
      </div>

      {/* Notes + Actions */}
      <div style={{ padding: "20px 20px 100px" }}>
        <textarea
          placeholder="Notas (opsioneel)..."
          style={{
            width: "100%",
            padding: "12px",
            background: "#111",
            border: "1px solid #222",
            borderRadius: "8px",
            color: "#ccc",
            fontSize: "14px",
            resize: "vertical",
            minHeight: "60px",
            fontFamily: "-apple-system, sans-serif",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "480px",
          padding: "12px 20px",
          background: "linear-gradient(transparent, #0a0a0a 30%)",
          display: "flex",
          gap: "10px",
          boxSizing: "border-box",
          paddingTop: "30px",
        }}
      >
        <button
          onClick={() => {
            const idx = BLOCKS.findIndex((b) => b.id === selectedBlockId);
            if (idx > 0) {
              setSelectedBlockId(BLOCKS[idx - 1].id);
              setSaved(false);
            }
          }}
          disabled={selectedBlockId === BLOCKS[0].id}
          style={{
            padding: "14px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "10px",
            color: selectedBlockId === BLOCKS[0].id ? "#333" : "#888",
            fontSize: "16px",
            cursor: selectedBlockId === BLOCKS[0].id ? "default" : "pointer",
          }}
        >
          ◀
        </button>
        <button
          onClick={handleSave}
          disabled={!hasData}
          style={{
            flex: 1,
            padding: "14px",
            background: saved
              ? "#1a3a1a"
              : hasData
              ? "linear-gradient(135deg, #2a6a2a, #3a8a3a)"
              : "#1a1a1a",
            border: saved
              ? "1px solid #4a9a4a"
              : hasData
              ? "1px solid #4a9a4a"
              : "1px solid #222",
            borderRadius: "10px",
            color: saved ? "#4a9a4a" : hasData ? "#fff" : "#444",
            fontSize: "15px",
            fontWeight: 700,
            cursor: hasData ? "pointer" : "default",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.5px",
            transition: "all 0.2s ease",
          }}
        >
          {saved ? "✓ Gestoor" : "Stoor Inspeksie"}
        </button>
        <button
          onClick={() => {
            const idx = BLOCKS.findIndex((b) => b.id === selectedBlockId);
            if (idx < BLOCKS.length - 1) {
              setSelectedBlockId(BLOCKS[idx + 1].id);
              setSaved(false);
            }
          }}
          disabled={selectedBlockId === BLOCKS[BLOCKS.length - 1].id}
          style={{
            padding: "14px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "10px",
            color:
              selectedBlockId === BLOCKS[BLOCKS.length - 1].id
                ? "#333"
                : "#888",
            fontSize: "16px",
            cursor:
              selectedBlockId === BLOCKS[BLOCKS.length - 1].id
                ? "default"
                : "pointer",
          }}
        >
          ▶
        </button>
      </div>

      {/* Block Selector Modal */}
      {showBlockSelector && (
        <BlockSelector
          blocks={BLOCKS}
          selectedId={selectedBlockId}
          onSelect={setSelectedBlockId}
          onClose={() => setShowBlockSelector(false)}
        />
      )}

      {/* Summary Modal */}
      {showSummary && (
        <SummaryView
          inspections={inspections}
          blocks={BLOCKS}
          stage={selectedStage}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}
