"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface RecentInspection {
  id: string;
  created_at: string;
  blocks: { name: string };
  farms: { name: string };
  inspection_stages: { name: string };
}

const MODULES = [
  {
    id: "weeds",
    title: "Onkruid",
    subtitle: "Inspeksie",
    icon: "🌿",
    href: "/inspections/new",
    active: true,
    color: "#4a7a4a",
    bg: "#1a2a1a",
    border: "#2D5A1B",
  },
  {
    id: "disease",
    title: "Siektes",
    subtitle: "Inspeksie",
    icon: "🦠",
    href: null,
    active: false,
    color: "#7a4a4a",
    bg: "#2a1a1a",
    border: "#5a2020",
  },
  {
    id: "pests",
    title: "Plae",
    subtitle: "Inspeksie",
    icon: "🐛",
    href: null,
    active: false,
    color: "#7a6a3a",
    bg: "#2a2510",
    border: "#5a4a20",
  },
  {
    id: "calibration",
    title: "Spuit",
    subtitle: "Kalibrasie",
    icon: "💧",
    href: null,
    active: false,
    color: "#3a5a7a",
    bg: "#1a2030",
    border: "#204060",
  },
  {
    id: "growth",
    title: "Groei-",
    subtitle: "stadium",
    icon: "📊",
    href: null,
    active: false,
    color: "#6a5a3a",
    bg: "#252010",
    border: "#504020",
  },
  {
    id: "recommendations",
    title: "Aanbe-",
    subtitle: "velings",
    icon: "🌾",
    href: null,
    active: false,
    color: "#5a6a3a",
    bg: "#1a2510",
    border: "#304020",
  },
];

export default function PwaHomePage() {
  const router = useRouter();
  const supabase = createClient();
  const { onlineStatus, pendingCount } = useOfflineSync();

  const [userEmail, setUserEmail] = useState("");
  const [recentInspections, setRecentInspections] = useState<RecentInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");

      // Load recent inspections
      const { data } = await supabase
        .from("camp_inspections" as never)
        .select("id, created_at, blocks (name), farms (name), inspection_stages (name)" as never)
        .order("created_at" as never, { ascending: false })
        .limit(5);

      if (data) setRecentInspections(data as unknown as RecentInspection[]);
      setLoading(false);
    }

    load();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min gelede`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} uur gelede`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? "dag" : "dae"} gelede`;
  };

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
        color: "#eeeeee",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1
              style={{
                fontSize: "22px",
                margin: 0,
                color: "#F5EDDA",
                fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
              }}
            >
              Wheat<span style={{ color: "#D4890A", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>Pıx</span>
            </h1>
            <div style={{ fontSize: "12px", color: "#666666", marginTop: "4px" }}>
              {userEmail}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "1px solid #333333",
              borderRadius: "6px",
              color: "#666666",
              fontSize: "11px",
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            Teken uit
          </button>
        </div>

        {/* Status indicators */}
        <div style={{ display: "flex", gap: "12px", marginTop: "12px", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              fontFamily: "var(--font-jetbrains), monospace",
              color: onlineStatus === "online" ? "#4a9a4a" : "#8a7a2a",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: onlineStatus === "online" ? "#4a9a4a" : "#8a7a2a",
              }}
            />
            {onlineStatus === "online" ? "Aanlyn" : "Aflyn"}
          </div>
          {pendingCount > 0 && (
            <div
              style={{
                fontSize: "10px",
                color: "#8a7a2a",
                fontFamily: "var(--font-jetbrains), monospace",
                padding: "2px 8px",
                background: "#1a1a0a",
                border: "1px solid #333300",
                borderRadius: "4px",
              }}
            >
              {pendingCount} wag vir sinkronisasie
            </div>
          )}
        </div>
      </div>

      {/* Module Tiles */}
      <div style={{ padding: "20px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => mod.active && mod.href && router.push(mod.href)}
              disabled={!mod.active}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 16px",
                background: mod.active ? mod.bg : "#111111",
                border: `2px solid ${mod.active ? mod.border : "#1a1a1a"}`,
                borderRadius: "16px",
                cursor: mod.active ? "pointer" : "default",
                transition: "all 0.15s ease",
                opacity: mod.active ? 1 : 0.4,
                position: "relative",
              }}
            >
              <span style={{ fontSize: "32px", marginBottom: "8px" }}>{mod.icon}</span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: mod.active ? mod.color : "#444444",
                  fontFamily: "var(--font-jetbrains), monospace",
                  letterSpacing: "0.5px",
                }}
              >
                {mod.title}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: mod.active ? mod.color : "#333333",
                  fontFamily: "var(--font-jetbrains), monospace",
                  opacity: 0.8,
                }}
              >
                {mod.subtitle}
              </span>
              {!mod.active && (
                <span
                  style={{
                    fontSize: "9px",
                    color: "#444444",
                    marginTop: "6px",
                    fontFamily: "var(--font-jetbrains), monospace",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Binnekort
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ padding: "0 24px 24px", flex: 1 }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#555555",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: "12px",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          Onlangse Aktiwiteit
        </div>

        {loading ? (
          <div style={{ color: "#333333", fontSize: "12px" }}>Laai...</div>
        ) : recentInspections.length === 0 ? (
          <div style={{ color: "#333333", fontSize: "13px" }}>
            Geen inspeksies nog nie
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentInspections.map((insp) => (
              <div
                key={insp.id}
                style={{
                  padding: "12px 14px",
                  background: "#111111",
                  borderRadius: "10px",
                  border: "1px solid #1a1a1a",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#cccccc" }}>
                      {insp.farms?.name}
                    </span>
                    <span style={{ fontSize: "13px", color: "#555555" }}> · </span>
                    <span style={{ fontSize: "13px", color: "#888888" }}>
                      {insp.blocks?.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#444444",
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    {timeAgo(insp.created_at)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#4a9a4a",
                    marginTop: "2px",
                    fontFamily: "var(--font-jetbrains), monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  ● {insp.inspection_stages?.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
