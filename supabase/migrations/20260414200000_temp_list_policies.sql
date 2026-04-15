-- Temporary helper to inspect RLS policies (will be dropped after debugging)
create or replace function public.list_farm_policies()
returns table(policyname text, permissive text, cmd text, qual text, with_check text)
language sql
security definer
as $$
  SELECT policyname::text, permissive::text, cmd::text, qual::text, with_check::text
  FROM pg_policies WHERE tablename = 'farms';
$$;
