-- Block Seasons: separate crop rotation from permanent block definitions
-- Blocks (name, geometry, hectares) are permanent. Crop rotates yearly.

-- ============================================================
-- CREATE block_seasons TABLE
-- ============================================================

create table public.block_seasons (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  season integer not null,
  crop text,
  cultivar text,
  status text not null default 'planned' check (status in ('planned', 'planted', 'harvested')),
  yield_ton_per_ha double precision,
  notes text,
  created_at timestamptz not null default now(),
  unique (block_id, season)
);

create index idx_block_seasons_block on public.block_seasons(block_id);
create index idx_block_seasons_season on public.block_seasons(season);

-- ============================================================
-- RLS: access via block → farm → is_farm_member
-- ============================================================

alter table public.block_seasons enable row level security;

create policy "farm members read block seasons" on public.block_seasons
  for select using (
    exists (
      select 1 from public.blocks b
      where b.id = block_seasons.block_id
        and public.is_farm_member(b.farm_id)
    )
  );

create policy "farm members manage block seasons" on public.block_seasons
  for all using (
    exists (
      select 1 from public.blocks b
      where b.id = block_seasons.block_id
        and public.is_farm_member(b.farm_id)
    )
  )
  with check (
    exists (
      select 1 from public.blocks b
      where b.id = block_seasons.block_id
        and public.is_farm_member(b.farm_id)
    )
  );

-- ============================================================
-- MIGRATE: existing blocks.crop/cultivar → block_seasons 2026
-- ============================================================

insert into public.block_seasons (block_id, season, crop, cultivar, status)
select id, 2026, crop, cultivar, 'planted'
from public.blocks
where crop is not null or cultivar is not null;

-- ============================================================
-- DROP crop/cultivar from blocks (now in block_seasons)
-- ============================================================

alter table public.blocks drop column if exists crop;
alter table public.blocks drop column if exists cultivar;
