"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Farm {
  id: string;
  name: string;
  client_id: string | null;
}

interface Client {
  id: string;
  name: string;
}

const cardBg = "rgba(20,35,12,0.7)";
const cardBorder = "rgba(55,100,35,0.25)";

export default function FarmsPage() {
  const supabase = createClient();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClientId, setNewClientId] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: farmData }, { data: clientData }] = await Promise.all([
        supabase.from("farms" as never).select("id, name, client_id").order("name" as never),
        supabase.from("clients" as never).select("id, name").order("name" as never),
      ]);
      if (farmData) setFarms(farmData as unknown as Farm[]);
      if (clientData) setClients(clientData as unknown as Client[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { data, error } = await supabase
      .from("farms" as never)
      .insert({
        name: newName.trim(),
        slug,
        client_id: newClientId || null,
      } as never)
      .select("id, name, client_id")
      .single();

    if (data && !error) {
      setFarms((prev) => [...prev, data as unknown as Farm]);
      setNewName("");
      setNewClientId("");
      setShowCreate(false);
    }
  };

  if (loading) {
    return <div style={{ color: "rgba(245,237,218,0.25)", fontSize: "13px", fontFamily: "var(--font-jetbrains), monospace" }}>Laai plase...</div>;
  }

  const grouped = new Map<string, Farm[]>();
  const unassigned: Farm[] = [];
  for (const f of farms) {
    if (f.client_id) {
      const group = grouped.get(f.client_id) || [];
      group.push(f);
      grouped.set(f.client_id, group);
    } else {
      unassigned.push(f);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "12px 16px",
    background: "rgba(8,12,4,0.8)",
    border: "1px solid rgba(45,90,27,0.25)",
    borderRadius: "10px",
    color: "#F5EDDA",
    fontSize: "14px",
    fontFamily: "var(--font-outfit), sans-serif",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(245,237,218,0.25)",
              letterSpacing: "3px",
              textTransform: "uppercase",
              fontFamily: "var(--font-jetbrains), monospace",
              marginBottom: "8px",
            }}
          >
            Bestuur
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#F5EDDA", margin: 0 }}>Plase</h1>
          <p style={{ fontSize: "13px", color: "rgba(245,237,218,0.3)", margin: "6px 0 0" }}>
            {farms.length} plas{farms.length !== 1 ? "e" : ""} geregistreer
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #D4890A 0%, #F5C842 100%)",
            border: "none",
            borderRadius: "10px",
            color: "#0E1A07",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 16px rgba(212,137,10,0.2)",
          }}
        >
          + Nuwe Plaas
        </button>
      </div>

      {/* Create farm form */}
      {showCreate && (
        <div
          style={{
            padding: "24px",
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: "14px",
            marginBottom: "28px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#F5EDDA", marginBottom: "16px" }}>
            Nuwe Plaas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="text"
              placeholder="Plaas naam"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              style={inputStyle}
            />
            <select
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
              style={{ ...inputStyle, appearance: "none" }}
            >
              <option value="">Geen kliënt</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: "12px 24px",
                  background: "transparent",
                  border: "1px solid rgba(245,237,218,0.1)",
                  borderRadius: "10px",
                  color: "rgba(245,237,218,0.5)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Kanselleer
              </button>
              <button
                onClick={handleCreate}
                style={{
                  padding: "12px 24px",
                  background: "rgba(45,90,27,0.4)",
                  border: "1px solid rgba(45,90,27,0.5)",
                  borderRadius: "10px",
                  color: "#F5EDDA",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Skep Plaas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped farm list */}
      {[...grouped.entries()].map(([clientId, clientFarms]) => (
        <div key={clientId} style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(245,237,218,0.2)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "12px",
              fontFamily: "var(--font-jetbrains), monospace",
              paddingLeft: "4px",
            }}
          >
            {clientMap.get(clientId) || "Onbekend"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {clientFarms.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/farms/${f.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: "12px",
                  textDecoration: "none",
                  backdropFilter: "blur(12px)",
                  transition: "border-color 0.2s, transform 0.1s",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#F5EDDA", letterSpacing: "0.2px" }}>
                  {f.name}
                </span>
                <span style={{ color: "rgba(245,237,218,0.2)", fontSize: "16px" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {unassigned.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(245,237,218,0.2)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "12px",
              fontFamily: "var(--font-jetbrains), monospace",
              paddingLeft: "4px",
            }}
          >
            Nie Toegewys
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {unassigned.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/farms/${f.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: "12px",
                  textDecoration: "none",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#F5EDDA" }}>
                  {f.name}
                </span>
                <span style={{ color: "rgba(245,237,218,0.2)", fontSize: "16px" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
