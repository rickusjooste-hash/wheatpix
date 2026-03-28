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
  { href: "/dashboard", label: "Oorsig", icon: "◎", agentOnly: false, superOnly: false },
  { href: "/dashboard/clients", label: "Kliënte", icon: "◈", agentOnly: true, superOnly: false },
  { href: "/dashboard/farms", label: "Plase", icon: "◇", agentOnly: false, superOnly: false },
  { href: "/dashboard/history", label: "Inspeksies", icon: "◆", agentOnly: false, superOnly: false },
  { href: "/admin", label: "Admin", icon: "⚙", agentOnly: false, superOnly: true },
];

export default function Sidebar({ userEmail, isAgent, isSuper }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <aside
      style={{
        width: collapsed ? "64px" : "220px",
        minHeight: "100vh",
        background: "#0E1A07",
        borderRight: "1px solid #1a2e0d",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: collapsed ? "20px 12px" : "20px 20px",
          borderBottom: "1px solid #1a2e0d",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {!collapsed && (
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontSize: "18px",
                color: "#F5EDDA",
                fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
              }}
            >
              Wheat<span style={{ color: "#D4890A", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>Pıx</span>
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none",
            border: "none",
            color: "#555555",
            fontSize: "14px",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {collapsed ? "▸" : "◂"}
        </button>
      </div>

      {/* New inspection button */}
      <div style={{ padding: collapsed ? "12px 8px" : "16px 16px" }}>
        <Link
          href="/inspections/new"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: collapsed ? "10px" : "10px 16px",
            background: "#F5C842",
            borderRadius: "8px",
            textDecoration: "none",
            color: "#0E1A07",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          {collapsed ? "+" : "+ Inspeksie"}
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
        {filteredItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: collapsed ? "12px 20px" : "10px 20px",
                marginBottom: "2px",
                textDecoration: "none",
                color: active ? "#F5C842" : "rgba(245,237,218,0.6)",
                background: active ? "rgba(245,200,66,0.08)" : "transparent",
                borderRight: active ? "3px solid #F5C842" : "3px solid transparent",
                fontSize: "13px",
                fontWeight: active ? 600 : 400,
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "16px", width: "24px", textAlign: "center" }}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div
        style={{
          padding: collapsed ? "16px 8px" : "16px",
          borderTop: "1px solid #1a2e0d",
        }}
      >
        {!collapsed && (
          <div
            style={{
              fontSize: "11px",
              color: "rgba(245,237,218,0.4)",
              marginBottom: "8px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-jetbrains), monospace",
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
            padding: "8px 12px",
            background: "rgba(245,237,218,0.05)",
            border: "1px solid #1a2e0d",
            borderRadius: "6px",
            color: "rgba(245,237,218,0.5)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <span>↗</span>
          {!collapsed && <span>Teken Uit</span>}
        </button>
      </div>
    </aside>
  );
}
