
-- Client enrichment table for Pulse targeting
CREATE TABLE public.client_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL UNIQUE,
  industries text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  competitors text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_enrichment"
  ON public.client_enrichment FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert client_enrichment"
  ON public.client_enrichment FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update client_enrichment"
  ON public.client_enrichment FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete client_enrichment"
  ON public.client_enrichment FOR DELETE TO authenticated USING (true);

-- Pulse signals table for daily ephemeral signals
CREATE TABLE public.pulse_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  headline text NOT NULL,
  hook text NOT NULL,
  source_url text,
  relevance_score integer NOT NULL DEFAULT 50,
  industry text,
  generated_date date NOT NULL DEFAULT CURRENT_DATE,
  claimed_by uuid REFERENCES auth.users(id),
  claimed_at timestamptz,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pulse_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pulse_signals"
  ON public.pulse_signals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pulse_signals"
  ON public.pulse_signals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update pulse_signals"
  ON public.pulse_signals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
