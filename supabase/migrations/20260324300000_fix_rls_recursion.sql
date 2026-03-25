-- Fix all RLS recursion: the is_farm_member() function queries farm_members
-- which has its own RLS policy that also queries farm_members.
-- Solution: make farm_members policy use ONLY auth.uid() (no function calls),
-- and rewrite is_farm_member() to bypass RLS using security definer.

-- Step 1: Drop all policies that cause recursion
drop policy if exists "members read own farm" on public.farm_members;
drop policy if exists "owners manage members" on public.farm_members;
drop policy if exists "farm members read" on public.farm_members;
drop policy if exists "farm owners manage" on public.farm_members;

-- Step 2: Simple farm_members policies — no function calls, just auth.uid()
create policy "users read own memberships" on public.farm_members
  for select using (user_id = auth.uid());

create policy "owners manage farm members" on public.farm_members
  for all using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_members.farm_id
        and fm.user_id = auth.uid()
        and fm.role = 'owner'
    )
  );

-- Step 3: Recreate is_farm_member() so it works with the above
-- It's security definer so it runs as the function owner (bypasses RLS on farm_members)
create or replace function public.is_farm_member(p_farm_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.farm_members
    where farm_id = p_farm_id and user_id = auth.uid()
  );
$$ language sql security definer stable;
