"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  contact_email: string | null;
}

export default function ClientsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("clients" as never)
        .select("id, name, slug, contact_name, contact_email" as never)
        .order("name" as never);
      if (data) setClients(data as unknown as Client[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("clients" as never)
      .insert({
        name: newName.trim(),
        slug,
        contact_name: newContact.trim() || null,
        contact_email: newEmail.trim() || null,
        agent_id: user.id,
      } as never)
      .select()
      .single();

    if (data && !error) {
      setClients((prev) => [...prev, data as unknown as Client]);
      setNewName("");
      setNewContact("");
      setNewEmail("");
      setShowCreate(false);
    }
    setCreating(false);
  };

  const cardStyle: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #E2DED6",
    boxShadow: "0 1px 3px rgba(26,22,18,0.06)",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#0E1A07",
            fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
          }}
        >
          Kliënte
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "10px 20px",
            background: "#F5C842",
            border: "none",
            borderRadius: "8px",
            color: "#0E1A07",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Nuwe Kliënt
        </button>
      </div>

      {showCreate && (
        <div style={{ ...cardStyle, marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="text"
              placeholder="Kliënt naam"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                padding: "12px 14px",
                border: "1px solid #E2DED6",
                borderRadius: "8px",
                fontSize: "15px",
                color: "#0E1A07",
              }}
            />
            <input
              type="text"
              placeholder="Kontak naam (opsioneel)"
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              style={{
                padding: "12px 14px",
                border: "1px solid #E2DED6",
                borderRadius: "8px",
                fontSize: "15px",
                color: "#0E1A07",
              }}
            />
            <input
              type="email"
              placeholder="Kontak e-pos (opsioneel)"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{
                padding: "12px 14px",
                border: "1px solid #E2DED6",
                borderRadius: "8px",
                fontSize: "15px",
                color: "#0E1A07",
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                style={{
                  padding: "10px 20px",
                  background: "#2D5A1B",
                  border: "none",
                  borderRadius: "8px",
                  color: "#F5EDDA",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Skep
              </button>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: "10px 16px",
                  background: "none",
                  border: "1px solid #E2DED6",
                  borderRadius: "8px",
                  color: "#5C554B",
                  cursor: "pointer",
                }}
              >
                Kanselleer
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#8C847A", padding: "40px", textAlign: "center" }}>Laai...</div>
      ) : clients.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", color: "#8C847A", padding: "40px" }}>
          Geen kliënte nog nie. Klik &quot;+ Nuwe Kliënt&quot; om te begin.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/clients/${c.id}`}
              style={{ textDecoration: "none" }}
            >
              <div style={{ ...cardStyle, cursor: "pointer" }}>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#0E1A07" }}>
                  {c.name}
                </div>
                {(c.contact_name || c.contact_email) && (
                  <div style={{ fontSize: "13px", color: "#5C554B", marginTop: "4px" }}>
                    {c.contact_name}{c.contact_name && c.contact_email ? " · " : ""}{c.contact_email}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
