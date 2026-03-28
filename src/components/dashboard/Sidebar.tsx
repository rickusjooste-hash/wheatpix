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
  { href: "/dashboard", label: "Oorsig", agentOnly: false, superOnly: false },
  { href: "/dashboard/clients", label: "Kliënte", agentOnly: true, superOnly: false },
  { href: "/dashboard/farms", label: "Plase", agentOnly: false, superOnly: false },
  { href: "/dashboard/history", label: "Inspeksies", agentOnly: false, superOnly: false },
  { href: "/dashboard/settings", label: "Instellings", agentOnly: true, superOnly: false },
  { href: "/admin", label: "Admin", agentOnly: false, superOnly: true },
];

export default function Sidebar({ userEmail, isAgent, isSuper }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
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

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "#ffffff",
        borderRight: "1px solid #e8e8e4",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "28px 24px 24px",
        }}
      >
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontSize: "20px",
              color: "#1a1a1a",
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
              letterSpacing: "0.3px",
            }}
          >
            Wheat<span style={{ color: "#D4890A", fontFamily: "var(--font-jetbrains), 'Space Mono', monospace" }}>Pıx</span>
          </span>
        </Link>
      </div>

      {/* New inspection button */}
      <div style={{ padding: "0 16px 20px" }}>
        <Link
          href="/inspections/new"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px 20px",
            background: "#1a1a1a",
            borderRadius: "8px",
            textDecoration: "none",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          + Nuwe Inspeksie
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "0 8px" }}>
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
                display: "block",
                padding: "10px 16px",
                margin: "1px 0",
                textDecoration: "none",
                color: active ? "#1a1a1a" : "#6b6b6b",
                background: active ? "#f0f0ec" : hovered ? "#f7f7f5" : "transparent",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: active ? 600 : 400,
                transition: "all 0.1s ease",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid #e8e8e4",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#999",
            marginBottom: "10px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail}
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: "block",
            width: "100%",
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid #e8e8e4",
            borderRadius: "6px",
            color: "#6b6b6b",
            fontSize: "13px",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.1s",
          }}
        >
          Teken Uit
        </button>
      </div>
    </aside>
  );
}
