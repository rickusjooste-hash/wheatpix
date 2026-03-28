"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SidebarProps {
  userEmail: string;
  isAgent: boolean;
  isSuper: boolean;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Oorsig", icon: "⬡", agentOnly: false, superOnly: false },
  { href: "/dashboard/clients", label: "Kliënte", icon: "◈", agentOnly: true, superOnly: false },
  { href: "/dashboard/farms", label: "Plase", icon: "⬢", agentOnly: false, superOnly: false },
  { href: "/dashboard/history", label: "Inspeksies", icon: "◉", agentOnly: false, superOnly: false },
  { href: "/admin", label: "Admin", icon: "⚙", agentOnly: false, superOnly: true },
];

export default function Sidebar({ userEmail, isAgent, isSuper }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.superOnly && !isSuper) return false;
    if (item.agentOnly && !isAgent) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const w = collapsed ? "68px" : "240px";

  return (
    <aside
      style={{
        width: w,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0e1a08 0%, #0b1306 50%, #0d1607 100%)",
        borderRight: "1px solid rgba(45,90,27,0.35)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: collapsed ? "24px 14px" : "24px 24px",
          borderBottom: "1px solid rgba(45,90,27,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: "72px",
        }}
      >
        {!collapsed && (
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontSize: "20px",
                color: "#F5EDDA",
                fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
                letterSpacing: "0.5px",
              }}
            >
              Wheat<span style={{ color: "#D4890A", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>Pıx</span>
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "rgba(245,237,218,0.04)",
            border: "1px solid rgba(245,237,218,0.06)",
            color: "rgba(245,237,218,0.3)",
            fontSize: "12px",
            cursor: "pointer",
            padding: "6px 8px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
        >
          {collapsed ? "▸" : "◂"}
        </button>
      </div>

      {/* New inspection button */}
      <div style={{ padding: collapsed ? "16px 10px" : "20px 20px" }}>
        <Link
          href="/inspections/new"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: collapsed ? "12px" : "12px 20px",
            background: "linear-gradient(135deg, #D4890A 0%, #F5C842 100%)",
            borderRadius: "10px",
            textDecoration: "none",
            color: "#0E1A07",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "var(--font-jetbrains), monospace",
            boxShadow: "0 2px 12px rgba(212,137,10,0.25)",
            transition: "box-shadow 0.2s, transform 0.15s",
          }}
        >
          {collapsed ? "+" : "+ Inspeksie"}
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "4px 0" }}>
        {filteredItems.map((item) => {
          const active = isActive(item.href);
          const hovered = hoveredItem === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: collapsed ? "14px 22px" : "12px 24px",
                margin: "2px 8px",
                textDecoration: "none",
                color: active ? "#F5C842" : hovered ? "rgba(245,237,218,0.85)" : "rgba(245,237,218,0.45)",
                background: active
                  ? "rgba(245,200,66,0.12)"
                  : hovered
                  ? "rgba(245,237,218,0.06)"
                  : "transparent",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: active ? 600 : 400,
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {active && (
                <div
                  style={{
                    position: "absolute",
                    left: "-8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "3px",
                    height: "20px",
                    background: "linear-gradient(180deg, #F5C842, #D4890A)",
                    borderRadius: "2px",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: "15px",
                  width: "24px",
                  textAlign: "center",
                  opacity: active ? 1 : 0.7,
                }}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <span style={{ letterSpacing: "0.3px" }}>{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        style={{
          margin: "0 20px",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(45,90,27,0.2), transparent)",
        }}
      />

      {/* User info + logout */}
      <div
        style={{
          padding: collapsed ? "20px 10px" : "20px",
        }}
      >
        {!collapsed && (
          <div
            style={{
              fontSize: "11px",
              color: "rgba(245,237,218,0.25)",
              marginBottom: "10px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-jetbrains), monospace",
              letterSpacing: "0.3px",
            }}
          >
            {userEmail}
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: "8px",
            width: "100%",
            padding: "10px 14px",
            background: "rgba(245,237,218,0.03)",
            border: "1px solid rgba(245,237,218,0.06)",
            borderRadius: "8px",
            color: "rgba(245,237,218,0.4)",
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <span style={{ fontSize: "14px" }}>↗</span>
          {!collapsed && <span>Teken Uit</span>}
        </button>
      </div>
    </aside>
  );
}
