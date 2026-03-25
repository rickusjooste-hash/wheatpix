"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ClientDetail {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

interface Farm {
  id: string;
  name: string;
  client_id: string | null;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [assignedFarms, setAssignedFarms] = useState<Farm[]>([]);
  const [unassignedFarms, setUnassignedFarms] = useState<Farm[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Load client
      const { data: clientData } = await supabase
        .from("clients" as never)
        .select("*")
        .eq("id" as never, clientId as never)
        .single();

      if (clientData) {
        const c = clientData as unknown as ClientDetail;
        setClient(c);
        setEditName(c.name);
        setEditContact(c.contact_name || "");
        setEditEmail(c.contact_email || "");
        setEditPhone(c.contact_phone || "");
      }

      // Load all farms
      const { data: allFarms } = await supabase
        .from("farms" as never)
        .select("id, name, client_id" as never)
        .order("name" as never);

      if (allFarms) {
        const farms = allFarms as unknown as Farm[];
        setAssignedFarms(farms.filter((f) => f.client_id === clientId));
        setUnassignedFarms(farms.filter((f) => !f.client_id));
      }

      setLoading(false);
    }
    load();
  }, [supabase, clientId]);

  const saveClient = async () => {
    await supabase
      .from("clients" as never)
      .update({
        name: editName.trim(),
        contact_name: editContact.trim() || null,
        contact_email: editEmail.trim() || null,
        contact_phone: editPhone.trim() || null,
      } as never)
      .eq("id" as never, clientId as never);

    setClient((prev) =>
      prev ? { ...prev, name: editName.trim(), contact_name: editContact.trim() || null, contact_email: editEmail.trim() || null, contact_phone: editPhone.trim() || null } : prev
    );
    setEditing(false);
  };

  const assignFarm = async (farmId: string) => {
    await supabase
      .from("farms" as never)
      .update({ client_id: clientId } as never)
      .eq("id" as never, farmId as never);

    setAssignedFarms((prev) => [...prev, ...unassignedFarms.filter((f) => f.id === farmId)]);
    setUnassignedFarms((prev) => prev.filter((f) => f.id !== farmId));
  };

  const unassignFarm = async (farmId: string) => {
    await supabase
      .from("farms" as never)
      .update({ client_id: null } as never)
      .eq("id" as never, farmId as never);

    setUnassignedFarms((prev) => [...prev, ...assignedFarms.filter((f) => f.id === farmId)]);
    setAssignedFarms((prev) => prev.filter((f) => f.id !== farmId));
  };

  if (loading) {
    return <div style={{ color: "#8C847A", padding: "40px", textAlign: "center" }}>Laai...</div>;
  }

  if (!client) {
    return <div style={{ color: "#8C847A", padding: "40px", textAlign: "center" }}>Kliënt nie gevind nie.</div>;
  }

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px",
    border: "1px solid #E2DED6",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#0E1A07",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div>
      <button
        onClick={() => router.push("/dashboard/clients")}
        style={{
          background: "none",
          border: "none",
          color: "#D4890A",
          fontSize: "13px",
          cursor: "pointer",
          padding: 0,
          marginBottom: "16px",
        }}
      >
        ← Terug na kliënte
      </button>

      {/* Client info */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid #E2DED6",
          marginBottom: "24px",
        }}
      >
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Naam" style={inputStyle} />
            <input type="text" value={editContact} onChange={(e) => setEditContact(e.target.value)} placeholder="Kontak naam" style={inputStyle} />
            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="E-pos" style={inputStyle} />
            <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Telefoon" style={inputStyle} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={saveClient} style={{ padding: "8px 16px", background: "#2D5A1B", border: "none", borderRadius: "8px", color: "#F5EDDA", fontWeight: 600, cursor: "pointer" }}>
                Stoor
              </button>
              <button onClick={() => setEditing(false)} style={{ padding: "8px 16px", background: "none", border: "1px solid #E2DED6", borderRadius: "8px", color: "#5C554B", cursor: "pointer" }}>
                Kanselleer
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0E1A07", fontFamily: "var(--font-dm-serif), serif" }}>
                {client.name}
              </h1>
              <div style={{ fontSize: "13px", color: "#5C554B", marginTop: "4px" }}>
                {[client.contact_name, client.contact_email, client.contact_phone].filter(Boolean).join(" · ") || "Geen kontakbesonderhede"}
              </div>
            </div>
            <button onClick={() => setEditing(true)} style={{ padding: "8px 16px", background: "none", border: "1px solid #E2DED6", borderRadius: "8px", color: "#5C554B", cursor: "pointer", fontSize: "13px" }}>
              Wysig
            </button>
          </div>
        )}
      </div>

      {/* Assigned farms */}
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0E1A07", marginBottom: "12px" }}>
        Plase ({assignedFarms.length})
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
        {assignedFarms.map((f) => (
          <div
            key={f.id}
            style={{
              background: "#FFFFFF",
              borderRadius: "10px",
              padding: "14px 18px",
              border: "1px solid #E2DED6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: 500, color: "#0E1A07" }}>{f.name}</span>
            <button
              onClick={() => unassignFarm(f.id)}
              style={{
                padding: "6px 12px",
                background: "none",
                border: "1px solid #E2DED6",
                borderRadius: "6px",
                color: "#8C847A",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Verwyder
            </button>
          </div>
        ))}
      </div>

      {/* Unassigned farms */}
      {unassignedFarms.length > 0 && (
        <>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#8C847A", marginBottom: "12px" }}>
            Beskikbare plase
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {unassignedFarms.map((f) => (
              <div
                key={f.id}
                style={{
                  background: "#FBF6EC",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  border: "1px dashed #E2DED6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "15px", color: "#5C554B" }}>{f.name}</span>
                <button
                  onClick={() => assignFarm(f.id)}
                  style={{
                    padding: "6px 12px",
                    background: "#2D5A1B",
                    border: "none",
                    borderRadius: "6px",
                    color: "#F5EDDA",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Wys toe
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
