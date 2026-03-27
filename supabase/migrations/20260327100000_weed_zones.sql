-- Add zone grid data to weed inspection records
-- Stores which cells of a 4x4 grid overlay on the block polygon are selected
-- Array of indices 0-15 (row-major: 0=NW corner, 15=SE corner)

alter table public.camp_inspection_weeds
  add column zones smallint[] default null;
