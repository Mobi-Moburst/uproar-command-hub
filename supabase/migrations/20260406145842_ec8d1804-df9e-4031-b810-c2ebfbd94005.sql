ALTER TABLE public.client_enrichment
  ADD COLUMN IF NOT EXISTS health text NOT NULL DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS status_override text;