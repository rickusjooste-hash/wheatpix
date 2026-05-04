# Products Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD dashboard page for herbicide products with default rate/unit, plus PWA pre-fill from those defaults.

**Architecture:** Add `default_rate` and `default_unit` columns to `herbicides` table. Rename `rate_l_per_ha` to `rate` and add `unit` column on `camp_inspection_herbicides`. New dashboard page at `/dashboard/products` (super-only). PWA inspection pre-fills rate/unit from herbicide defaults when selecting a product.

**Tech Stack:** Next.js App Router, Supabase (Postgres), React inline styles (existing pattern), TypeScript.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260504120000_products_defaults_and_unit.sql`
- Delete: `supabase/migrations/20260504100000_add_herbicide_rate.sql`

- [ ] **Step 1: Remove the earlier migration that added `rate_l_per_ha`**

Delete `supabase/migrations/20260504100000_add_herbicide_rate.sql` — this migration added `rate_l_per_ha` to `camp_inspection_herbicides` but hasn't been applied to production yet. The new migration supersedes it.

- [ ] **Step 2: Create the consolidated migration**

Create `supabase/migrations/20260504120000_products_defaults_and_unit.sql`:

```sql
-- Add default rate/unit to herbicides table
alter table public.herbicides
  add column default_rate numeric,
  add column default_unit text check (default_unit in ('L/ha', 'ml/ha', 'g/ha', 'kg/ha'));

-- Add rate and unit to inspection herbicide selections
alter table public.camp_inspection_herbicides
  add column rate numeric,
  add column unit text check (unit in ('L/ha', 'ml/ha', 'g/ha', 'kg/ha'));

-- Allow super users to manage herbicides
create policy "Super users can insert herbicides"
  on public.herbicides for insert
  to authenticated
  with check (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'super'
  );

create policy "Super users can update herbicides"
  on public.herbicides for update
  to authenticated
  using (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'super'
  );

create policy "Super users can delete herbicides"
  on public.herbicides for delete
  to authenticated
  using (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'super'
  );
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260504120000_products_defaults_and_unit.sql
git rm supabase/migrations/20260504100000_add_herbicide_rate.sql
git commit -m "feat: add default rate/unit to herbicides and rate/unit to inspection herbicides"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/lib/inspection-utils.ts` (lines 89-113)

- [ ] **Step 1: Add `default_rate` and `default_unit` to `Herbicide` interface**

In `src/lib/inspection-utils.ts`, replace the `Herbicide` interface (lines 89-95):

```typescript
export interface Herbicide {
  id: string;
  name: string;
  active_ingredients: string[];
  group_code: string | null;
  category: "broadleaf" | "grass" | "both";
  is_active: boolean;
  default_rate: number | null;
  default_unit: string | null;
}
```

- [ ] **Step 2: Add `unit` to `SelectedHerbicide` interface**

Replace the `SelectedHerbicide` interface (lines 109-113):

```typescript
export interface SelectedHerbicide {
  herbicide_id: string;
  is_auto_suggested: boolean;
  rate: number | null;
  unit: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/inspection-utils.ts
git commit -m "feat: add default_rate, default_unit to Herbicide and unit to SelectedHerbicide"
```

---

### Task 3: Add Sidebar Nav Item

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx` (line 21)

- [ ] **Step 1: Add "Middels" to NAV_ITEMS**

In `src/components/dashboard/Sidebar.tsx`, add a new entry to the `NAV_ITEMS` array after the "Instellings" entry (line 20) and before the "Admin" entry (line 21):

```typescript
const NAV_ITEMS = [
  { href: "/dashboard", label: "Oorsig", agentOnly: false, superOnly: false },
  { href: "/dashboard/clients", label: "Kliënte", agentOnly: true, superOnly: false },
  { href: "/dashboard/farms", label: "Plase", agentOnly: false, superOnly: false },
  { href: "/dashboard/history", label: "Inspeksies", agentOnly: false, superOnly: false },
  { href: "/dashboard/settings", label: "Instellings", agentOnly: true, superOnly: false },
  { href: "/dashboard/products", label: "Middels", agentOnly: false, superOnly: true },
  { href: "/admin", label: "Admin", agentOnly: false, superOnly: true },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat: add Middels nav item to sidebar (super-only)"
```

---

### Task 4: Create Products Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/dashboard/products/page.tsx`

This is the main CRUD page. It follows the existing dashboard patterns from `farms/page.tsx`: client-side component, Supabase client, inline styles, same color palette.

- [ ] **Step 1: Create the products page**

Create `src/app/(dashboard)/dashboard/products/page.tsx`:

```typescript
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
```

- [ ] **Step 2: Verify the build passes**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds with `/dashboard/products` in the output.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/products/page.tsx
git commit -m "feat: add products dashboard page with full CRUD"
```

---

### Task 5: Update PWA Inspection — Pre-fill Rate/Unit from Defaults

**Files:**
- Modify: `src/components/inspections/HerbicideRecommendations.tsx`
- Modify: `src/app/(pwa)/inspections/[inspectionId]/page.tsx`

- [ ] **Step 1: Update `HerbicideRecommendations` to accept and display units**

Replace the `RateInput` component and the props interface in `src/components/inspections/HerbicideRecommendations.tsx`. The `RateInput` now includes a unit dropdown. The component receives `units` state alongside `rates`.

Replace the full file content:

```typescript
"use client";

import type { Herbicide, HerbicideRecommendation } from "@/lib/inspection-utils";

const UNITS = ["L/ha", "ml/ha", "g/ha", "kg/ha"] as const;

function RateInput({
  rate,
  unit,
  onRateChange,
  onUnitChange,
}: {
  rate: number | null;
  unit: string | null;
  onRateChange: (v: number | null) => void;
  onUnitChange: (v: string | null) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px 8px 36px",
        background: "#151f0c",
        border: "1px solid #3a6a2a",
        borderTop: "none",
        borderRadius: "0 0 8px 8px",
      }}
    >
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        placeholder="—"
        value={rate ?? ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = e.target.value;
          onRateChange(v === "" ? null : parseFloat(v));
        }}
        style={{
          width: "70px",
          padding: "6px 8px",
          background: "#0a0a0a",
          border: "1px solid #333333",
          borderRadius: "6px",
          color: "#cccccc",
          fontSize: "14px",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          textAlign: "right",
          boxSizing: "border-box",
        }}
      />
      <select
        value={unit || ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUnitChange(e.target.value || null)}
        style={{
          padding: "6px 8px",
          background: "#0a0a0a",
          border: "1px solid #333333",
          borderRadius: "6px",
          color: "#cccccc",
          fontSize: "12px",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          boxSizing: "border-box",
        }}
      >
        <option value="">—</option>
        {UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </div>
  );
}

interface HerbicideRecommendationsProps {
  recommendations: HerbicideRecommendation[];
  allHerbicides: Herbicide[];
  selectedIds: Set<string>;
  rates: Record<string, number | null>;
  units: Record<string, string | null>;
  onToggle: (herbicideId: string) => void;
  onRateChange: (herbicideId: string, rate: number | null) => void;
  onUnitChange: (herbicideId: string, unit: string | null) => void;
}

export default function HerbicideRecommendations({
  recommendations,
  allHerbicides,
  selectedIds,
  rates,
  units,
  onToggle,
  onRateChange,
  onUnitChange,
}: HerbicideRecommendationsProps) {
  const recMap = new Map(recommendations.map((r) => [r.herbicide.id, r]));
  const sorted = [...allHerbicides].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ padding: "16px 20px 0" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#5a6a3a",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "10px",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
        }}
      >
        ▌ Middels
      </div>

      {sorted.map((h) => {
        const selected = selectedIds.has(h.id);
        const rec = recMap.get(h.id);
        return (
          <div key={h.id} style={{ marginBottom: "6px" }}>
            <button
              onClick={() => onToggle(h.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                width: "100%",
                padding: "10px 12px",
                background: selected ? "#1a2a10" : "#111111",
                border: `1px solid ${selected ? "#3a6a2a" : "#222222"}`,
                borderRadius: selected ? "8px 8px 0 0" : "8px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  lineHeight: 1,
                  color: selected ? "#4a9a4a" : "#333333",
                  marginTop: "1px",
                  flexShrink: 0,
                }}
              >
                {selected ? "✓" : "○"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: selected ? "#cccccc" : "#888888",
                  }}
                >
                  {h.name}
                </div>
                {rec && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#666666",
                      marginTop: "2px",
                      fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                    }}
                  >
                    {rec.coveredWeeds.map((w) => w.abbreviation).join(", ")}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "9px",
                    color: "#444444",
                    marginTop: "2px",
                    fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                  }}
                >
                  {h.active_ingredients.join(" + ")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {rec && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#4a9a4a",
                      fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                    }}
                  >
                    aanbeveel
                  </span>
                )}
                {h.group_code && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#555555",
                      fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
                      padding: "2px 5px",
                      border: "1px solid #333333",
                      borderRadius: "4px",
                    }}
                  >
                    {h.group_code}
                  </span>
                )}
              </div>
            </button>
            {selected && (
              <RateInput
                rate={rates[h.id] ?? null}
                unit={units[h.id] ?? null}
                onRateChange={(v) => onRateChange(h.id, v)}
                onUnitChange={(v) => onUnitChange(h.id, v)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Update inspection page state and handlers**

In `src/app/(pwa)/inspections/[inspectionId]/page.tsx`, make these changes:

**Add `herbicideUnits` state** next to the existing `herbicideRates` state (after line 50):

```typescript
const [herbicideUnits, setHerbicideUnits] = useState<Record<string, Record<string, string | null>>>({});
```

**Add `currentUnits`** next to `currentRates` (after the `currentRates` line):

```typescript
const currentUnits = herbicideUnits[selectedBlockId] || {};
```

**Update `handleHerbicideToggle`** — when selecting (adding) a herbicide, pre-fill rate and unit from the herbicide's defaults. When deselecting, also clean up units. Replace the entire `handleHerbicideToggle` callback:

```typescript
const handleHerbicideToggle = useCallback(
  (herbicideId: string) => {
    markBlockDirty();
    setSelectedHerbicides((prev) => {
      const current = new Set(prev[selectedBlockId] || []);
      if (current.has(herbicideId)) {
        current.delete(herbicideId);
        setHerbicideRates((rp) => {
          const blockRates = { ...rp[selectedBlockId] };
          delete blockRates[herbicideId];
          return { ...rp, [selectedBlockId]: blockRates };
        });
        setHerbicideUnits((up) => {
          const blockUnits = { ...up[selectedBlockId] };
          delete blockUnits[herbicideId];
          return { ...up, [selectedBlockId]: blockUnits };
        });
      } else {
        current.add(herbicideId);
        const herb = allHerbicides.find((h) => h.id === herbicideId);
        if (herb) {
          if (herb.default_rate != null) {
            setHerbicideRates((rp) => ({
              ...rp,
              [selectedBlockId]: { ...rp[selectedBlockId], [herbicideId]: herb.default_rate },
            }));
          }
          if (herb.default_unit) {
            setHerbicideUnits((up) => ({
              ...up,
              [selectedBlockId]: { ...up[selectedBlockId], [herbicideId]: herb.default_unit },
            }));
          }
        }
      }
      return { ...prev, [selectedBlockId]: current };
    });
  },
  [selectedBlockId, allHerbicides]
);
```

**Add `handleUnitChange`** callback after `handleRateChange`:

```typescript
const handleUnitChange = useCallback(
  (herbicideId: string, unit: string | null) => {
    markBlockDirty();
    setHerbicideUnits((prev) => ({
      ...prev,
      [selectedBlockId]: { ...prev[selectedBlockId], [herbicideId]: unit },
    }));
  },
  [selectedBlockId]
);
```

**Update the save logic** — in the `herbicideEntries` mapping, add `unit`:

```typescript
const herbicideEntries: SelectedHerbicide[] = [...currentSelectedHerbicides].map((id) => ({
  herbicide_id: id,
  is_auto_suggested: autoSuggestedIds.has(id),
  rate: currentRates[id] ?? null,
  unit: currentUnits[id] ?? null,
}));
```

**Update the `HerbicideRecommendations` JSX** to pass new props:

```tsx
<HerbicideRecommendations
  recommendations={recommendations}
  allHerbicides={allHerbicides}
  selectedIds={currentSelectedHerbicides}
  rates={currentRates}
  units={currentUnits}
  onToggle={handleHerbicideToggle}
  onRateChange={handleRateChange}
  onUnitChange={handleUnitChange}
/>
```

- [ ] **Step 3: Verify the build passes**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/inspections/HerbicideRecommendations.tsx src/app/\(pwa\)/inspections/\[inspectionId\]/page.tsx
git commit -m "feat: add unit selector to PWA inspection and pre-fill from defaults"
```

---

### Task 6: Update Offline Sync

**Files:**
- Modify: `src/hooks/useOfflineSync.ts` (lines 243-248)

- [ ] **Step 1: Include `unit` in the herbicide sync payload**

In `src/hooks/useOfflineSync.ts`, replace the herbicide row mapping (lines 243-248):

```typescript
const herbicideRows = herbicides.map((h) => ({
  inspection_id: inspectionId,
  herbicide_id: h.herbicide_id,
  is_auto_suggested: h.is_auto_suggested,
  rate: h.rate,
  unit: h.unit,
}));
```

Note: This also renames `rate_l_per_ha` to `rate` to match the migration that renames the column.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useOfflineSync.ts
git commit -m "feat: include unit in herbicide offline sync payload"
```

---

### Task 7: Update Dashboard History Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/history/[id]/page.tsx` (lines 31-34, 93-98, 271-274)

- [ ] **Step 1: Update `HerbicideRecord` type**

Replace the `HerbicideRecord` interface (line 31-34):

```typescript
interface HerbicideRecord {
  is_auto_suggested: boolean;
  rate: number | null;
  unit: string | null;
  herbicides: { name: string; active_ingredients: string[]; group_code: string | null };
}
```

- [ ] **Step 2: Update the select query**

Replace the herbicide select query (lines 94-97):

```typescript
const { data: herbData } = await supabase
  .from("camp_inspection_herbicides" as never)
  .select("is_auto_suggested, rate, unit, herbicides(name, active_ingredients, group_code)" as never)
  .eq("inspection_id" as never, inspectionId as never);
```

- [ ] **Step 3: Update the rate display**

Replace the rate display (lines 271-274):

```tsx
{h.rate != null && (
  <span style={{ fontSize: "10px", padding: "2px 6px", background: "#f0f0ec", borderRadius: "4px", color: "#6b6b6b", fontFamily: "var(--font-jetbrains), monospace" }}>
    {h.rate} {h.unit || "L/ha"}
  </span>
)}
```

- [ ] **Step 4: Verify the build passes**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/history/\[id\]/page.tsx
git commit -m "feat: display rate with unit on inspection history page"
```

---

### Task 8: Final Build Verification

- [ ] **Step 1: Run full build**

Run: `npx next build 2>&1 | tail -25`
Expected: Build succeeds with all routes including `/dashboard/products`.

- [ ] **Step 2: Verify all new/modified files are committed**

Run: `git status`
Expected: Clean working tree.
