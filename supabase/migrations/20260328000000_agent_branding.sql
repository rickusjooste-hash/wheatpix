-- Agent branding for reports

create table public.agent_branding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) unique,
  company_name text not null,
  logo_path text,
  primary_color text not null default '#D4890A',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_branding enable row level security;

create policy "users manage own" on public.agent_branding
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Allow reading branding for report generation (e.g., by super user or API)
create policy "authenticated read" on public.agent_branding
  for select using (auth.role() = 'authenticated');

-- Storage bucket for agent logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-logos',
  'agent-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "users upload own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'agent-logos'
    and auth.role() = 'authenticated'
  );

create policy "public read logos"
  on storage.objects for select
  using (bucket_id = 'agent-logos');

create policy "users delete own logo"
  on storage.objects for delete
  using (
    bucket_id = 'agent-logos'
    and auth.role() = 'authenticated'
  );
