"use client";

import { useState } from "react";

export function HelpButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: active ? "2px solid #1a1a1a" : "1px solid #d4d4d0",
        background: active ? "#1a1a1a" : "#fff",
        color: active ? "#fff" : "#999",
        fontSize: "16px",
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      ?
    </button>
  );
}

export function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        padding: "24px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        marginBottom: "28px",
        fontSize: "13px",
        color: "#444",
        lineHeight: "1.7",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>Hoe werk dit?</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#bbb", fontSize: "16px", cursor: "pointer" }}
        >
          &times;
        </button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>1. Plase &amp; Kampe</div>
        Elke plaas het kampe (blokke) met vaste grense en hektaar. Klik op &apos;n plaas en dan &quot;Kaart &amp; Kampe&quot; om kampe op die satellietkaart te sien, teken, of wysig.
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>2. KML Invoer</div>
        Op die kaart-bladsy, klik &quot;Importeer KML&quot; om kampe uit &apos;n KML-l&ecirc;er in te laai. Die l&ecirc;er kan kampe vir verskeie plase bevat &mdash; kies &apos;n plaas uit die keuselys, merk die relevante kampe, en klik &quot;Importeer&quot;. Herhaal vir elke plaas. Gebruik Ctrl+klik op die kaart om kampe vinnig te merk.
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>3. Seisoene</div>
        Klik op &apos;n plaas en dan &quot;Seisoen Bestuur&quot; om gewasse en cultivars per kamp per jaar te bestuur. Klik &quot;Begin [Jaar] Seisoen&quot; om seisoenrekords vir alle kampe te skep. Daarna kan jy gewas, kultivar en status per kamp invul.
      </div>

      <div>
        <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>Tipiese werkvloei</div>
        Skep plase &rarr; Importeer kampe via KML (of teken op die kaart) &rarr; Begin &apos;n seisoen &rarr; Vul gewas- en kultivardata in.
      </div>
    </div>
  );
}

export function useHelp() {
  const [showHelp, setShowHelp] = useState(false);
  const toggle = () => setShowHelp((v) => !v);
  return { showHelp, toggle, close: () => setShowHelp(false) };
}
