-- Remove duplicate inspections from 2026-04-30
-- Keeps the earliest created record per (farm_id, block_id, stage_id, inspector_id, inspection_date)
-- Related weeds, herbicides, and photos cascade delete automatically

delete from public.camp_inspections
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by farm_id, block_id, stage_id, inspector_id, inspection_date
        order by created_at asc
      ) as rn
    from public.camp_inspections
    where inspection_date = '2026-04-30'
  ) ranked
  where rn > 1
);
