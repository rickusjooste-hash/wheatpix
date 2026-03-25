-- WheatPix: Add clients table and role hierarchy (super/agent/client)
-- Hierarchy: Super User → Agents → Clients → Farms → Blocks

-- ============================================================
-- CLIENTS TABLE
-- ============================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_name text,
  contact_email text,
  contact_phone text,
  agent_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_agent on public.clients(agent_id);

-- ============================================================
-- CLIENT_USERS TABLE (links client-role users to their client)
-- ============================================================

create table public.client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create index idx_client_users_client on public.client_users(client_id);
create index idx_client_users_user on public.client_users(user_id);

-- ============================================================
-- ADD client_id TO FARMS
-- ============================================================

alter table public.farms add column client_id uuid references public.clients(id) on delete set null;
create index idx_farms_client on public.farms(client_id);

-- ============================================================
-- HELPER: get user role from JWT metadata
-- ============================================================

create or replace function public.get_user_role()
returns text
language sql
stable
as 'select coalesce(auth.jwt() -> ''user_metadata'' ->> ''role'', ''client'')';

-- ============================================================
-- RLS ON CLIENTS
-- ============================================================

alter table public.clients enable row level security;

-- Super sees all
create policy "super reads all clients" on public.clients
  for select using (public.get_user_role() = 'super');

create policy "super manages all clients" on public.clients
  for all using (public.get_user_role() = 'super');

-- Agent sees/manages their own clients
create policy "agent reads own clients" on public.clients
  for select using (agent_id = auth.uid());

create policy "agent manages own clients" on public.clients
  for all using (agent_id = auth.uid());

-- Client users see their client
create policy "client user reads own client" on public.clients
  for select using (
    exists (select 1 from public.client_users cu where cu.client_id = clients.id and cu.user_id = auth.uid())
  );

-- ============================================================
-- RLS ON CLIENT_USERS
-- ============================================================

alter table public.client_users enable row level security;

-- Users see their own membership
create policy "users read own client membership" on public.client_users
  for select using (user_id = auth.uid());

-- Super manages all
create policy "super manages client users" on public.client_users
  for all using (public.get_user_role() = 'super');

-- Agent manages client_users for their own clients
create policy "agent manages own client users" on public.client_users
  for insert with check (
    exists (select 1 from public.clients c where c.id = client_users.client_id and c.agent_id = auth.uid())
  );

create policy "agent deletes own client users" on public.client_users
  for delete using (
    exists (select 1 from public.clients c where c.id = client_users.client_id and c.agent_id = auth.uid())
  );

-- ============================================================
-- UPDATE is_farm_member() — now role-aware
-- Checks (in order): super → agent → client_user → farm_member
-- Security definer: bypasses RLS on tables it queries
-- ============================================================

create or replace function public.is_farm_member(p_farm_id uuid)
returns boolean
language sql
security definer
stable
as '
  select
    -- Super has full access
    coalesce(auth.jwt() -> ''user_metadata'' ->> ''role'', ''client'') = ''super''
    -- Agent has access to farms belonging to their clients
    or exists (
      select 1 from public.farms f
      join public.clients c on c.id = f.client_id
      where f.id = p_farm_id and c.agent_id = auth.uid()
    )
    -- Client user has access to farms belonging to their client
    or exists (
      select 1 from public.farms f
      join public.client_users cu on cu.client_id = f.client_id
      where f.id = p_farm_id and cu.user_id = auth.uid()
    )
    -- Direct farm member (inspectors)
    or exists (
      select 1 from public.farm_members
      where farm_id = p_farm_id and user_id = auth.uid()
    )
';

-- ============================================================
-- BACKFILL: Set current user as super, create default client
-- ============================================================

-- Set rickus.jooste@gmail.com as super user
update auth.users
set raw_user_meta_data = raw_user_meta_data || '{"role": "super"}'::jsonb
where email = 'rickus.jooste@gmail.com';

-- Create a placeholder client and assign existing farms
do $$
declare
  v_client_id uuid;
  v_agent_id uuid;
begin
  -- Get the super user id (will also be the initial agent)
  select id into v_agent_id from auth.users where email = 'rickus.jooste@gmail.com';

  -- Create placeholder client
  insert into public.clients (name, slug, agent_id)
  values ('Kliënt 1', 'klient-1', v_agent_id)
  returning id into v_client_id;

  -- Assign all existing farms to this client
  update public.farms set client_id = v_client_id where client_id is null;
end;
$$;
