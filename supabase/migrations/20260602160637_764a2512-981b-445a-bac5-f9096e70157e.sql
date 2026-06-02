ALTER TABLE public.pulse_signals
ADD COLUMN IF NOT EXISTS matched_reporters jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS drafted_pitches jsonb NOT NULL DEFAULT '{}'::jsonb;