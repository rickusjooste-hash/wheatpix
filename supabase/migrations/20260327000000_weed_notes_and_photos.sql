-- Per-weed notes + block-level photos

-- ============================================================
-- 1. Add notes to individual weed severity records
-- ============================================================

alter table public.camp_inspection_weeds
  add column notes text;

-- ============================================================
-- 2. Inspection photos table (max 3 per block inspection)
-- ============================================================

create table public.camp_inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.camp_inspections(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index idx_camp_inspection_photos_inspection
  on public.camp_inspection_photos(inspection_id);

-- ============================================================
-- 3. RLS for photos (same pattern as camp_inspection_weeds)
-- ============================================================

alter table public.camp_inspection_photos enable row level security;

create policy "farm members read" on public.camp_inspection_photos
  for select using (
    exists (
      select 1 from public.camp_inspections ci
      where ci.id = inspection_id
        and public.is_farm_member(ci.farm_id)
    )
  );

create policy "inspectors manage own" on public.camp_inspection_photos
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
-- 4. Storage bucket + policies
-- NOTE: Create bucket "inspection-photos" in Supabase dashboard
--   - Public: false
--   - File size limit: 5MB
--   - Allowed MIME types: image/jpeg, image/png, image/webp
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-photos',
  'inspection-photos',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "inspectors upload photos"
  on storage.objects for insert
  with check (
    bucket_id = 'inspection-photos'
    and auth.role() = 'authenticated'
  );

create policy "farm members read photos"
  on storage.objects for select
  using (
    bucket_id = 'inspection-photos'
    and auth.role() = 'authenticated'
  );

create policy "inspectors delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'inspection-photos'
    and auth.role() = 'authenticated'
  );
