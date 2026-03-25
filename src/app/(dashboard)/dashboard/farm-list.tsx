"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Farm {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export default function FarmList({ farms: initialFarms }: { farms: Farm[] }) {
  const [farms, setFarms] = useState(initialFarms);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const startEdit = (farm: Farm) => {
    setEditingId(farm.id);
    setEditName(farm.name);
  };

  const saveEdit = async (farmId: string) => {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from("farms" as never)
      .update({ name: editName.trim() } as never)
      .eq("id" as never, farmId as never);

    if (!error) {
      setFarms((prev) =>
        prev.map((f) => (f.id === farmId ? { ...f, name: editName.trim() } : f))
      );
      setEditingId(null);
      router.refresh();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {farms.map((farm) => (
        <div
          key={farm.id}
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #E2DED6",
            boxShadow: "0 1px 3px rgba(26,22,18,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {editingId === farm.id ? (
            <div style={{ display: "flex", gap: "8px", flex: 1, marginRight: "12px" }}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(farm.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1px solid #E2DED6",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
                  color: "#0E1A07",
                }}
              />
              <button
                onClick={() => saveEdit(farm.id)}
                style={{
                  padding: "8px 16px",
                  background: "#2D5A1B",
                  border: "none",
                  borderRadius: "8px",
                  color: "#F5EDDA",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Stoor
              </button>
              <button
                onClick={() => setEditingId(null)}
                style={{
                  padding: "8px 12px",
                  background: "none",
                  border: "1px solid #E2DED6",
                  borderRadius: "8px",
                  color: "#8C847A",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Kanselleer
              </button>
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#0E1A07" }}>
                  {farm.name}
                </div>
                <div style={{ fontSize: "12px", color: "#8C847A", marginTop: "2px" }}>
                  {farm.role} · {farm.slug}
                </div>
              </div>
              <button
                onClick={() => startEdit(farm)}
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: "1px solid #E2DED6",
                  borderRadius: "8px",
                  color: "#5C554B",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
                }}
              >
                Hernoem
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
