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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("farms" as never)
      .insert({ name: newName.trim(), slug, client_id: newClientId || null } as never)
      .select("id, name, client_id")
      .single();
    if (data && !error) {
      // Add creator as farm owner so RLS allows access
      await supabase.from("farm_members" as never).insert({
        farm_id: (data as unknown as Farm).id,
        user_id: user.id,
        role: "owner",
      } as never);
      setFarms((prev) => [...prev, data as unknown as Farm]);
      setNewName("");
      setNewClientId("");
      setShowCreate(false);
    }
  };

  if (loading) {
    return <div style={{ color: "#999", fontSize: "14px" }}>Laai plase...</div>;
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
    padding: "10px 14px",
    background: "#fff",
    border: "1px solid #d4d4d0",
    borderRadius: "8px",
    color: "#1a1a1a",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const renderGroup = (label: string, groupFarms: Farm[]) => (
    <div key={label} style={{ marginBottom: "28px" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
        {label}
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {groupFarms.map((f, i) => (
          <Link
            key={f.id}
            href={`/dashboard/farms/${f.id}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderBottom: i < groupFarms.length - 1 ? "1px solid #f0f0ec" : "none",
              textDecoration: "none",
              transition: "background 0.1s",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>{f.name}</span>
            <span style={{ color: "#ccc", fontSize: "14px" }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Plase</h1>
          <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>
            {farms.length} plas{farms.length !== 1 ? "e" : ""} geregistreer
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "10px 20px",
            background: "#1a1a1a",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Nuwe Plaas
        </button>
      </div>

      {showCreate && (
        <div
          style={{
            padding: "24px",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
            marginBottom: "28px",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "16px" }}>
            Nuwe Plaas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="text" placeholder="Plaas naam" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus style={inputStyle} />
            <select value={newClientId} onChange={(e) => setNewClientId(e.target.value)} style={inputStyle}>
              <option value="">Geen kliënt</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: "10px 20px", background: "#fff", border: "1px solid #d4d4d0", borderRadius: "8px", color: "#6b6b6b", fontSize: "13px", cursor: "pointer" }}>
                Kanselleer
              </button>
              <button onClick={handleCreate} style={{ padding: "10px 20px", background: "#1a1a1a", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Skep Plaas
              </button>
            </div>
          </div>
        </div>
      )}

      {[...grouped.entries()].map(([clientId, clientFarms]) =>
        renderGroup(clientMap.get(clientId) || "Onbekend", clientFarms)
      )}
      {unassigned.length > 0 && renderGroup("Nie Toegewys", unassigned)}
    </div>
  );
}
