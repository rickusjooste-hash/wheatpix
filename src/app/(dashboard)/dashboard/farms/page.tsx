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
    return <div style={{ color: "rgba(245,237,218,0.4)", fontSize: "13px" }}>Laai plase...</div>;
  }

  // Group by client
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#F5EDDA", margin: 0 }}>Plase</h1>
          <p style={{ fontSize: "13px", color: "rgba(245,237,218,0.4)", margin: "4px 0 0" }}>
            {farms.length} plas{farms.length !== 1 ? "e" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "10px 20px",
            background: "#F5C842",
            border: "none",
            borderRadius: "8px",
            color: "#0E1A07",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Nuwe Plaas
        </button>
      </div>

      {/* Create farm form */}
      {showCreate && (
        <div
          style={{
            padding: "20px",
            background: "#111a08",
            border: "1px solid #2D5A1B",
            borderRadius: "12px",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#F5EDDA", marginBottom: "12px" }}>
            Nuwe Plaas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              placeholder="Plaas naam"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                padding: "10px 14px",
                background: "#0a0f05",
                border: "1px solid #2D5A1B",
                borderRadius: "8px",
                color: "#F5EDDA",
                fontSize: "14px",
              }}
            />
            <select
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
              style={{
                padding: "10px 14px",
                background: "#0a0f05",
                border: "1px solid #2D5A1B",
                borderRadius: "8px",
                color: "#F5EDDA",
                fontSize: "14px",
              }}
            >
              <option value="">Geen kliënt</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid #2D5A1B",
                  borderRadius: "8px",
                  color: "rgba(245,237,218,0.6)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Kanselleer
              </button>
              <button
                onClick={handleCreate}
                style={{
                  padding: "10px 20px",
                  background: "#2D5A1B",
                  border: "none",
                  borderRadius: "8px",
                  color: "#F5EDDA",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Skep
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped farm list */}
      {[...grouped.entries()].map(([clientId, clientFarms]) => (
        <div key={clientId} style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(245,237,218,0.3)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "10px",
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            {clientMap.get(clientId) || "Onbekend"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {clientFarms.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/farms/${f.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  background: "#111a08",
                  border: "1px solid #1a2e0d",
                  borderRadius: "10px",
                  textDecoration: "none",
                  transition: "border-color 0.15s",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#F5EDDA" }}>
                  {f.name}
                </span>
                <span style={{ color: "rgba(245,237,218,0.3)", fontSize: "14px" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {unassigned.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(245,237,218,0.3)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "10px",
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            Nie toegewys
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {unassigned.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/farms/${f.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  background: "#111a08",
                  border: "1px solid #1a2e0d",
                  borderRadius: "10px",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#F5EDDA" }}>
                  {f.name}
                </span>
                <span style={{ color: "rgba(245,237,218,0.3)", fontSize: "14px" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
