-- Fix farm_members RLS recursion.
-- The FOR ALL policy caused recursion because it applies to SELECT too,
-- and its subquery hits farm_members again.
-- Solution: SELECT uses simple auth.uid() check, write ops use separate policies.

alter table public.farm_members disable row level security;
alter table public.farm_members enable row level security;

-- Users can see their own memberships (no subquery, no recursion)
create policy "user reads own memberships" on public.farm_members
  for select using (user_id = auth.uid());

-- Owners can insert/update/delete members (separate policies to avoid SELECT recursion)
create policy "owner inserts members" on public.farm_members
  for insert with check (
    farm_id in (select fm.farm_id from public.farm_members fm where fm.user_id = auth.uid() and fm.role = 'owner')
  );

create policy "owner updates members" on public.farm_members
  for update using (
    farm_id in (select fm.farm_id from public.farm_members fm where fm.user_id = auth.uid() and fm.role = 'owner')
  );

create policy "owner deletes members" on public.farm_members
  for delete using (
    farm_id in (select fm.farm_id from public.farm_members fm where fm.user_id = auth.uid() and fm.role = 'owner')
  );

-- Recreate is_farm_member as security definer (bypasses RLS when called from other table policies)
create or replace function public.is_farm_member(p_farm_id uuid)
returns boolean
language sql
security definer
stable
as 'select exists (select 1 from public.farm_members where farm_id = p_farm_id and user_id = auth.uid())';
