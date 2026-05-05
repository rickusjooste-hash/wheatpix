-- Fix: herbicide RLS policies queried auth.users directly,
-- which the authenticated role cannot access. Use auth.jwt() instead.

drop policy if exists "Super users can insert herbicides" on public.herbicides;
drop policy if exists "Super users can update herbicides" on public.herbicides;
drop policy if exists "Super users can delete herbicides" on public.herbicides;

create policy "Super users can insert herbicides"
  on public.herbicides for insert
  to authenticated
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super'
  );

create policy "Super users can update herbicides"
  on public.herbicides for update
  to authenticated
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super'
  );

create policy "Super users can delete herbicides"
  on public.herbicides for delete
  to authenticated
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super'
  );
