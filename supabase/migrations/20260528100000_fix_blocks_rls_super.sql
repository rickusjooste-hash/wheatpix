-- Fix blocks RLS: the "farm managers manage" FOR ALL policy only checks
-- farm_members table directly, so super users and agents cannot insert/update blocks.
-- Replace with policies that use is_farm_member() which handles the full role hierarchy.

drop policy if exists "farm managers manage" on public.blocks;

-- INSERT: any farm member (super/agent/client_user/farm_member) can add blocks
create policy "farm members insert blocks" on public.blocks
  for insert with check (public.is_farm_member(farm_id));

-- UPDATE: any farm member can update blocks
create policy "farm members update blocks" on public.blocks
  for update using (public.is_farm_member(farm_id))
  with check (public.is_farm_member(farm_id));

-- DELETE: any farm member can delete blocks
create policy "farm members delete blocks" on public.blocks
  for delete using (public.is_farm_member(farm_id));
