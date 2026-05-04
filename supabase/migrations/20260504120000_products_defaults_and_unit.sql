-- Add default rate/unit to herbicides table
alter table public.herbicides
  add column default_rate numeric,
  add column default_unit text check (default_unit in ('L/ha', 'ml/ha', 'g/ha', 'kg/ha'));

-- Add rate and unit to inspection herbicide selections
alter table public.camp_inspection_herbicides
  add column rate numeric,
  add column unit text check (unit in ('L/ha', 'ml/ha', 'g/ha', 'kg/ha'));

-- Allow super users to manage herbicides
create policy "Super users can insert herbicides"
  on public.herbicides for insert
  to authenticated
  with check (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'super'
  );

create policy "Super users can update herbicides"
  on public.herbicides for update
  to authenticated
  using (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'super'
  );

create policy "Super users can delete herbicides"
  on public.herbicides for delete
  to authenticated
  using (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'super'
  );
