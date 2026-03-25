-- WheatPix — Kamp Inspeksie schema
-- Farm weed inspection tables with RLS

-- ============================================================
-- FARMS & BLOCKS
-- ============================================================

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location_lat double precision,
  location_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farm_members (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'inspector' check (role in ('owner', 'manager', 'inspector')),
  created_at timestamptz not null default now(),
  unique (farm_id, user_id)
);

create index idx_farm_members_farm on public.farm_members(farm_id);
create index idx_farm_members_user on public.farm_members(user_id);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  crop text,
  cultivar text,
  sort_order integer not null default 0,
  -- Polygon stored as JSON array of {lat, lng} points
  -- Point-in-polygon done client-side (avoids PostGIS dependency)
  geometry jsonb,
  area_hectares double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_blocks_farm on public.blocks(farm_id);

-- ============================================================
-- INSPECTION TABLES
-- ============================================================

create table public.inspection_stages (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_inspection_stages_farm on public.inspection_stages(farm_id);

create table public.weed_species (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references public.farms(id) on delete cascade, -- NULL = global default
  name text not null,
  abbreviation varchar(4) not null,
  category text not null check (category in ('grass', 'broadleaf')),
  is_default boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_weed_species_farm on public.weed_species(farm_id);

create table public.camp_inspections (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  stage_id uuid not null references public.inspection_stages(id),
  inspector_id uuid not null references auth.users(id),
  inspection_date date not null default current_date,
  gps_lat double precision,
  gps_lng double precision,
  crop text,
  cultivar text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_camp_inspections_farm on public.camp_inspections(farm_id);
create index idx_camp_inspections_block on public.camp_inspections(block_id);
create index idx_camp_inspections_stage on public.camp_inspections(stage_id);
create index idx_camp_inspections_inspector on public.camp_inspections(inspector_id);
create index idx_camp_inspections_date on public.camp_inspections(inspection_date);

create table public.camp_inspection_weeds (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.camp_inspections(id) on delete cascade,
  weed_species_id uuid not null references public.weed_species(id),
  severity smallint not null default 0 check (severity between 0 and 4),
  unique (inspection_id, weed_species_id)
);

create index idx_camp_inspection_weeds_inspection on public.camp_inspection_weeds(inspection_id);

-- ============================================================
-- RLS
-- ============================================================

alter table public.farms enable row level security;
alter table public.farm_members enable row level security;
alter table public.blocks enable row level security;
alter table public.inspection_stages enable row level security;
alter table public.weed_species enable row level security;
alter table public.camp_inspections enable row level security;
alter table public.camp_inspection_weeds enable row level security;

-- Helper: check if user is a member of a farm
create or replace function public.is_farm_member(p_farm_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.farm_members
    where farm_id = p_farm_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- farms
create policy "farm members read" on public.farms
  for select using (public.is_farm_member(id));
create policy "farm owners manage" on public.farms
  for all using (
    exists (
      select 1 from public.farm_members
      where farm_id = farms.id and user_id = auth.uid() and role = 'owner'
    )
  );

-- farm_members
create policy "farm members read" on public.farm_members
  for select using (public.is_farm_member(farm_id));
create policy "farm owners manage" on public.farm_members
  for all using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_members.farm_id and fm.user_id = auth.uid() and fm.role = 'owner'
    )
  );

-- blocks
create policy "farm members read" on public.blocks
  for select using (public.is_farm_member(farm_id));
create policy "farm managers manage" on public.blocks
  for all using (
    exists (
      select 1 from public.farm_members
      where farm_id = blocks.farm_id
        and user_id = auth.uid()
        and role in ('owner', 'manager')
    )
  );

-- inspection_stages
create policy "farm members read" on public.inspection_stages
  for select using (public.is_farm_member(farm_id));
create policy "farm members manage" on public.inspection_stages
  for all using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

-- weed_species: global defaults readable by all authenticated, farm-specific by members
create policy "read global defaults" on public.weed_species
  for select using (farm_id is null);
create policy "farm members read own" on public.weed_species
  for select using (farm_id is not null and public.is_farm_member(farm_id));
create policy "farm members manage own" on public.weed_species
  for all using (farm_id is not null and public.is_farm_member(farm_id))
  with check (farm_id is not null and public.is_farm_member(farm_id));

-- camp_inspections
create policy "farm members read" on public.camp_inspections
  for select using (public.is_farm_member(farm_id));
create policy "inspectors insert" on public.camp_inspections
  for insert with check (
    public.is_farm_member(farm_id) and inspector_id = auth.uid()
  );
create policy "inspectors update own" on public.camp_inspections
  for update using (inspector_id = auth.uid())
  with check (inspector_id = auth.uid());

-- camp_inspection_weeds
create policy "farm members read" on public.camp_inspection_weeds
  for select using (
    exists (
      select 1 from public.camp_inspections ci
      where ci.id = inspection_id
        and public.is_farm_member(ci.farm_id)
    )
  );
create policy "inspectors manage own" on public.camp_inspection_weeds
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

-- ============================================================
-- SEED: Default weed species (global, farm_id = NULL)
-- ============================================================

-- Grasses
insert into public.weed_species (farm_id, name, abbreviation, category, is_default, sort_order) values
  (null, 'Wilde Hawer',    'WH', 'grass', true, 0),
  (null, 'Predikantstuis', 'PL', 'grass', true, 1),
  (null, 'Raaigras',       'RG', 'grass', true, 2),
  (null, 'Kanariesaad',    'KS', 'grass', true, 3),
  (null, 'Vulpia',         'VL', 'grass', true, 4);

-- Broadleaf
insert into public.weed_species (farm_id, name, abbreviation, category, is_default, sort_order) values
  (null, 'Emex',        'MX', 'broadleaf', true, 0),
  (null, 'Kiesieblaar', 'KB', 'broadleaf', true, 1),
  (null, 'Sierings',    'S',  'broadleaf', true, 2),
  (null, 'Turknaels',   'TK', 'broadleaf', true, 3),
  (null, 'Rumnas',       'RS', 'broadleaf', true, 4),
  (null, 'Gousbloem',   'GB', 'broadleaf', true, 5),
  (null, 'Sterremier',  'SM', 'broadleaf', true, 6),
  (null, 'Canola',      'CN', 'broadleaf', true, 7),
  (null, 'Koperdraad',  'KD', 'broadleaf', true, 8),
  (null, 'Stinkkruid',  'SK', 'broadleaf', true, 9),
  (null, 'Medics',      'MD', 'broadleaf', true, 10),
  (null, 'Suuring',     'LP', 'broadleaf', true, 11),
  (null, 'Hongerbos',   'HB', 'broadleaf', true, 12),
  (null, 'Ganskos',     'GK', 'broadleaf', true, 13);

-- ============================================================
-- TRIGGER: seed default stages when a new farm is created
-- ============================================================

create or replace function public.seed_farm_inspection_defaults()
returns trigger as $$
begin
  insert into public.inspection_stages (farm_id, name, sort_order, is_default) values
    (new.id, 'Voor Plant', 0, true),
    (new.id, 'Opkoms', 1, true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_farm_created_seed_inspection_defaults
  after insert on public.farms
  for each row execute function public.seed_farm_inspection_defaults();
