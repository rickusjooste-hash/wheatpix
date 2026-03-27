-- Herbicide reference data + inspection recommendations

-- ============================================================
-- 1. Herbicide products
-- ============================================================

create table public.herbicides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active_ingredients text[] not null,
  group_code text,
  category text not null check (category in ('broadleaf', 'grass', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. Efficacy matrix: herbicide × weed species
-- ============================================================

create table public.herbicide_weed_efficacy (
  id uuid primary key default gen_random_uuid(),
  herbicide_id uuid not null references public.herbicides(id) on delete cascade,
  weed_species_id uuid not null references public.weed_species(id),
  efficacy text not null check (efficacy in ('effective', 'very_effective', 'uncertain')),
  unique (herbicide_id, weed_species_id)
);

create index idx_herbicide_efficacy_herbicide on public.herbicide_weed_efficacy(herbicide_id);
create index idx_herbicide_efficacy_weed on public.herbicide_weed_efficacy(weed_species_id);

-- ============================================================
-- 3. Herbicides recommended per block inspection
-- ============================================================

create table public.camp_inspection_herbicides (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.camp_inspections(id) on delete cascade,
  herbicide_id uuid not null references public.herbicides(id),
  is_auto_suggested boolean not null default false,
  created_at timestamptz not null default now(),
  unique (inspection_id, herbicide_id)
);

create index idx_camp_inspection_herbicides_inspection on public.camp_inspection_herbicides(inspection_id);

-- ============================================================
-- 4. RLS
-- ============================================================

alter table public.herbicides enable row level security;
alter table public.herbicide_weed_efficacy enable row level security;
alter table public.camp_inspection_herbicides enable row level security;

-- Reference data: readable by all authenticated users
create policy "authenticated read" on public.herbicides
  for select using (auth.role() = 'authenticated');

create policy "authenticated read" on public.herbicide_weed_efficacy
  for select using (auth.role() = 'authenticated');

-- Inspection herbicides: same pattern as camp_inspection_weeds
create policy "farm members read" on public.camp_inspection_herbicides
  for select using (
    exists (
      select 1 from public.camp_inspections ci
      where ci.id = inspection_id
        and public.is_farm_member(ci.farm_id)
    )
  );

create policy "inspectors manage own" on public.camp_inspection_herbicides
  for all using (
    exists (
      select 1 from public.camp_inspections ci
      where ci.id = inspection_id
        and ci.inspector_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.camp_inspections ci
      where ci.id = inspection_id
        and ci.inspector_id = auth.uid()
    )
  );
