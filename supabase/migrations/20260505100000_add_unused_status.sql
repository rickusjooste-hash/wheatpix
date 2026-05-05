-- Allow blocks to be marked as "not in use" for a given season
alter table public.block_seasons drop constraint block_seasons_status_check;
alter table public.block_seasons add constraint block_seasons_status_check
  check (status in ('planned', 'planted', 'harvested', 'unused'));
