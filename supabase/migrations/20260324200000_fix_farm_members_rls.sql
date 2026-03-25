-- Fix infinite recursion: farm_members RLS policy calls is_farm_member()
-- which queries farm_members — causing a loop.
-- Replace with a direct auth.uid() check.

drop policy if exists "farm members read" on public.farm_members;
drop policy if exists "farm owners manage" on public.farm_members;

-- Users can read memberships for farms they belong to (direct check, no function call)
create policy "members read own farm" on public.farm_members
  for select using (
    farm_id in (
      select fm.farm_id from public.farm_members fm where fm.user_id = auth.uid()
    )
  );

-- Farm owners can manage memberships
create policy "owners manage members" on public.farm_members
  for all using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_members.farm_id
        and fm.user_id = auth.uid()
        and fm.role = 'owner'
    )
  );
