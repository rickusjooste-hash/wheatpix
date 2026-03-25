"use client";

import { useState, useCallback, useRef } from "react";
import { SEVERITY_LEVELS, type SeverityLevel, type WeedSpecies } from "@/lib/inspection-utils";

interface WeedButtonProps {
  weed: WeedSpecies;
  severity: SeverityLevel;
  onTap: (weedId: string) => void;
}

export default function WeedButton({ weed, severity, onTap }: WeedButtonProps) {
  const s = SEVERITY_LEVELS[severity];
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const tooltipShowing = useRef(false);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      tooltipShowing.current = true;
      setShowTooltip(true);
    }, 400);
  }, []);

  const endPress = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tooltipShowing.current) {
      tooltipShowing.current = false;
      setShowTooltip(false);
    } else if (!didLongPress.current) {
      onTap(weed.id);
    }
  }, [onTap, weed.id]);

  const cancelPress = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    tooltipShowing.current = false;
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
            background: "#222222",
            border: "1px solid #444444",
            borderRadius: "6px",
            padding: "6px 10px",
            zIndex: 100,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            animation: "tooltipIn 0.15s ease",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#eeeeee" }}>
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
              background: "#222222",
              borderRight: "1px solid #444444",
              borderBottom: "1px solid #444444",
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
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          touchAction: "manipulation",
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
            color: severity > 0 ? s.color : "#666666",
            letterSpacing: "0.5px",
            zIndex: 1,
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          }}
        >
          {weed.abbreviation}
        </span>
        <span
          style={{
            fontSize: severity === 4 ? "14px" : severity === 3 ? "16px" : "18px",
            fontWeight: 800,
            color: severity > 0 ? s.color : "#333333",
            marginTop: "2px",
            zIndex: 1,
            fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
            letterSpacing: severity > 2 ? "-1px" : "0",
          }}
        >
          {severity === 0 ? "" : s.label}
        </span>
      </button>
    </div>
  );
}
