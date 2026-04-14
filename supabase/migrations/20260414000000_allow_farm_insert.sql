-- Allow authenticated users to create new farms
-- The existing "farm owners manage" policy requires the user to already be
-- an owner of the farm, which is impossible for INSERT (chicken-and-egg).
-- After insert, the app adds the creator as farm_member with role 'owner'.

create policy "authenticated users create farms" on public.farms
  for insert with check (auth.uid() is not null);
