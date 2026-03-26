
CREATE TABLE public.client_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  from_date TEXT,
  to_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  slug TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  password_hash TEXT,
  title TEXT,
  curation_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage reports
CREATE POLICY "Authenticated users can read all reports"
  ON public.client_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert reports"
  ON public.client_reports FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update reports"
  ON public.client_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reports"
  ON public.client_reports FOR DELETE TO authenticated USING (true);

-- Anonymous users can read published reports (for public URL)
CREATE POLICY "Anyone can read published reports"
  ON public.client_reports FOR SELECT TO anon USING (status = 'published');
