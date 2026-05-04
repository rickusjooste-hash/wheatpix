# Products Dashboard Page — Design Spec

## Overview

Full CRUD dashboard page for managing herbicide products and their default application rates/units. Super-only access. Defaults pre-fill into the PWA inspection flow but can be overridden per inspection.

## Database Changes

### 1. Add columns to `herbicides` table

```sql
alter table public.herbicides
  add column default_rate numeric,
  add column default_unit text check (default_unit in ('L/ha', 'ml/ha', 'g/ha', 'kg/ha'));
```

### 2. Add `unit` column to `camp_inspection_herbicides` and rename `rate_l_per_ha`

```sql
alter table public.camp_inspection_herbicides
  rename column rate_l_per_ha to rate;

alter table public.camp_inspection_herbicides
  add column unit text check (unit in ('L/ha', 'ml/ha', 'g/ha', 'kg/ha'));
```

## Dashboard Page — `/dashboard/products`

### Access

- Sidebar nav item: `{ href: "/dashboard/products", label: "Middels", agentOnly: false, superOnly: true }`
- Only visible to super users

### Layout

Follows existing dashboard patterns (same as farms/clients pages):
- Header with title "Middels", subtitle "Bestuur produkte en verstekwaardes", and "+ Nuwe Middel" button
- Flat alphabetical list of all products (no grouping by category)

### Product List

Each row displays:
- **Name** (bold)
- **Active ingredients** (subtitle, joined with " + ")
- **Category** — "gras", "breeblaar", or "beide"
- **Group code** — small badge, if set
- **Default rate + unit** — e.g. "0.9 L/ha", or "—" if not set
- **Edit button** — opens inline edit form
- **Delete button** — shows confirm dialog, then deletes

### Add/Edit Form

Appears inline (expanded below the header for new, or replacing the row for edit). Fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | yes | |
| Active ingredients | text | yes | Comma-separated, stored as text[] |
| Group code | text | no | |
| Category | dropdown | yes | Options: gras (grass), breeblaar (broadleaf), beide (both) |
| Default rate | numeric | no | |
| Default unit | dropdown | no | Options: L/ha, ml/ha, g/ha, kg/ha |
| Is active | toggle | yes | Defaults to true |

### Delete

Confirm dialog: "Is jy seker jy wil hierdie middel verwyder?" with cancel/confirm buttons. Deletes from Supabase (cascade deletes efficacy records).

## PWA Inspection — Pre-fill from Defaults

### Type changes

`Herbicide` interface gains two fields:
```typescript
default_rate: number | null;
default_unit: string | null;
```

`SelectedHerbicide` interface gains `unit`:
```typescript
unit: string | null;
```

### Behaviour

- When agent selects a product, the rate input pre-fills from `default_rate` and unit from `default_unit`
- Both can be overridden per inspection
- If no default is set, fields start blank
- The `HerbicideRecommendations` component shows a unit selector alongside the rate input for selected products

### Offline sync

The `useOfflineSync` hook sends both `rate` and `unit` when inserting into `camp_inspection_herbicides`.

## Dashboard History Page

The history detail page (`/dashboard/history/[id]`) displays rate + unit (e.g. "0.9 L/ha") next to each herbicide instead of just the rate.

## Files to Create/Modify

### New files
- `supabase/migrations/20260504120000_products_defaults_and_unit.sql` — migration
- `src/app/(dashboard)/dashboard/products/page.tsx` — dashboard CRUD page

### Modified files
- `src/components/dashboard/Sidebar.tsx` — add nav item
- `src/lib/inspection-utils.ts` — update Herbicide and SelectedHerbicide types
- `src/components/inspections/HerbicideRecommendations.tsx` — add unit selector, pre-fill from defaults
- `src/app/(pwa)/inspections/[inspectionId]/page.tsx` — pass unit state, pre-fill on select
- `src/hooks/useOfflineSync.ts` — include unit in sync payload
- `src/app/(dashboard)/dashboard/history/[id]/page.tsx` — display unit alongside rate
