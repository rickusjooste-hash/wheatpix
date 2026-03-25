-- Allow farm owners to update their farm (e.g. rename)
create policy "farm owners update" on public.farms
  for update using (
    exists (
      select 1 from public.farm_members
      where farm_id = farms.id and user_id = auth.uid() and role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.farm_members
      where farm_id = farms.id and user_id = auth.uid() and role = 'owner'
    )
  );
