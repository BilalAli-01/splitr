-- Add optional event detail fields
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS start_time time without time zone,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- Add custom amount per participant
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS custom_amount numeric;
