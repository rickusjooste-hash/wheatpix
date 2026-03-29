-- Extend agent branding for rich report templates

alter table public.agent_branding
  add column tagline text,                    -- e.g., "CUSTOMISED CROP SOLUTIONS"
  add column secondary_color text default '#666666',
  add column header_image_path text,          -- banner strip image for inner pages
  add column cover_image_path text,           -- decorative image for cover page
  add column badge_image_path text;           -- corner badge (e.g., anniversary graphic)
