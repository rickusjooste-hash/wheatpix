"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const UNITS = ["L/ha", "ml/ha", "g/ha", "kg/ha"] as const;
const CATEGORIES = [
  { value: "grass", label: "Gras" },
  { value: "broadleaf", label: "Breeblaar" },
  { value: "both", label: "Beide" },
] as const;

interface Product {
  id: string;
  name: string;
  active_ingredients: string[];
  group_code: string | null;
  category: "broadleaf" | "grass" | "both";
  is_active: boolean;
  default_rate: number | null;
  default_unit: string | null;
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

const categoryLabel = (c: string) =>
  c === "grass" ? "gras" : c === "broadleaf" ? "breeblaar" : "beide";

export default function ProductsPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formIngredients, setFormIngredients] = useState("");
  const [formGroupCode, setFormGroupCode] = useState("");
  const [formCategory, setFormCategory] = useState<string>("grass");
  const [formRate, setFormRate] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("herbicides" as never)
        .select("*")
        .order("name" as never);
      if (data) setProducts(data as unknown as Product[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const resetForm = () => {
    setFormName("");
    setFormIngredients("");
    setFormGroupCode("");
    setFormCategory("grass");
    setFormRate("");
    setFormUnit("");
    setFormIsActive(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setShowCreate(false);
    setFormName(p.name);
    setFormIngredients(p.active_ingredients.join(", "));
    setFormGroupCode(p.group_code || "");
    setFormCategory(p.category);
    setFormRate(p.default_rate != null ? String(p.default_rate) : "");
    setFormUnit(p.default_unit || "");
    setFormIsActive(p.is_active);
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    const payload = {
      name: formName.trim(),
      active_ingredients: formIngredients.split(",").map((s) => s.trim()).filter(Boolean),
      group_code: formGroupCode.trim() || null,
      category: formCategory,
      default_rate: formRate ? parseFloat(formRate) : null,
      default_unit: formUnit || null,
      is_active: formIsActive,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from("herbicides" as never)
        .update(payload as never)
        .eq("id" as never, editingId as never)
        .select()
        .single();

      if (!error && data) {
        setProducts((prev) =>
          prev
            .map((p) => (p.id === editingId ? (data as unknown as Product) : p))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
      } else {
        alert("Kon nie stoor nie: " + (error?.message || "Onbekende fout"));
      }
    } else {
      const { data, error } = await supabase
        .from("herbicides" as never)
        .insert(payload as never)
        .select()
        .single();

      if (!error && data) {
        setProducts((prev) =>
          [...prev, data as unknown as Product].sort((a, b) => a.name.localeCompare(b.name))
        );
        setShowCreate(false);
        resetForm();
      } else {
        alert("Kon nie skep nie: " + (error?.message || "Onbekende fout"));
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("herbicides" as never)
      .delete()
      .eq("id" as never, id as never);

    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
    } else {
      alert("Kon nie verwyder nie: " + (error?.message || "Onbekende fout"));
    }
  };

  if (loading) {
    return <div style={{ color: "#999", fontSize: "14px" }}>Laai middels...</div>;
  }

  const renderForm = () => (
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
        {editingId ? "Wysig Middel" : "Nuwe Middel"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b6b6b", marginBottom: "4px" }}>
            Naam
          </label>
          <input type="text" placeholder="Produk naam" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b6b6b", marginBottom: "4px" }}>
            Aktiewe bestanddele (komma-geskeide)
          </label>
          <input type="text" placeholder="bv. Pinoxaden, Cloquintocet-mexyl" value={formIngredients} onChange={(e) => setFormIngredients(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b6b6b", marginBottom: "4px" }}>
              Groepkode
            </label>
            <input type="text" placeholder="bv. A" value={formGroupCode} onChange={(e) => setFormGroupCode(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b6b6b", marginBottom: "4px" }}>
              Kategorie
            </label>
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b6b6b", marginBottom: "4px" }}>
              Verstek dosis
            </label>
            <input type="number" step="0.1" min="0" placeholder="bv. 0.9" value={formRate} onChange={(e) => setFormRate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#6b6b6b", marginBottom: "4px" }}>
              Eenheid
            </label>
            <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} style={inputStyle}>
              <option value="">— Kies —</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="checkbox" id="is-active" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
          <label htmlFor="is-active" style={{ fontSize: "13px", color: "#6b6b6b" }}>Aktief</label>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <button
            onClick={() => { setShowCreate(false); setEditingId(null); resetForm(); }}
            style={{ padding: "10px 20px", background: "#fff", border: "1px solid #d4d4d0", borderRadius: "8px", color: "#6b6b6b", fontSize: "13px", cursor: "pointer" }}
          >
            Kanselleer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "10px 20px", background: "#1a1a1a", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Stoor..." : editingId ? "Stoor Wysigings" : "Skep Middel"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Middels</h1>
          <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>
            Bestuur produkte en verstekwaardes
          </p>
        </div>
        {!showCreate && !editingId && (
          <button
            onClick={openCreate}
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
            + Nuwe Middel
          </button>
        )}
      </div>

      {(showCreate || editingId) && renderForm()}

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {products.map((p, i) => (
          <div key={p.id}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: i < products.length - 1 ? "1px solid #f0f0ec" : "none",
                opacity: p.is_active ? 1 : 0.5,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "2px", fontFamily: "var(--font-jetbrains), monospace" }}>
                  {p.active_ingredients.join(" + ")}
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "#999", width: "80px", flexShrink: 0 }}>
                {categoryLabel(p.category)}
              </div>
              {p.group_code && (
                <span style={{ fontSize: "10px", padding: "2px 6px", background: "#f0f0ec", borderRadius: "4px", color: "#6b6b6b", fontFamily: "var(--font-jetbrains), monospace", marginRight: "12px", flexShrink: 0 }}>
                  {p.group_code}
                </span>
              )}
              <div style={{ fontSize: "12px", fontWeight: 600, width: "100px", flexShrink: 0, color: "#1a1a1a" }}>
                {p.default_rate != null && p.default_unit
                  ? `${p.default_rate} ${p.default_unit}`
                  : "—"}
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button
                  onClick={() => openEdit(p)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#6b6b6b", padding: "4px 8px" }}
                >
                  Wysig
                </button>
                <button
                  onClick={() => setDeleteConfirmId(p.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#C0392B", padding: "4px 8px" }}
                >
                  Verwyder
                </button>
              </div>
            </div>

            {deleteConfirmId === p.id && (
              <div style={{ padding: "12px 20px", background: "#fef2f2", borderBottom: "1px solid #f0f0ec", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "13px", color: "#C0392B" }}>
                  Is jy seker jy wil hierdie middel verwyder?
                </span>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{ padding: "6px 14px", background: "#fff", border: "1px solid #d4d4d0", borderRadius: "6px", color: "#6b6b6b", fontSize: "12px", cursor: "pointer" }}
                >
                  Nee
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{ padding: "6px 14px", background: "#C0392B", border: "none", borderRadius: "6px", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Ja, verwyder
                </button>
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "#999", fontSize: "14px" }}>
            Geen middels gevind nie
          </div>
        )}
      </div>
    </div>
  );
}
