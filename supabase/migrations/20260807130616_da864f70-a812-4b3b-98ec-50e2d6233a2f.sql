CREATE TABLE public.client_hubspot_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL UNIQUE,
  hubspot_company_id text,
  match_confidence text NOT NULL DEFAULT 'none',
  matched_by text NOT NULL DEFAULT 'auto',
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_hubspot_links TO authenticated;
GRANT ALL ON public.client_hubspot_links TO service_role;
ALTER TABLE public.client_hubspot_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_hubspot_links" ON public.client_hubspot_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert client_hubspot_links" ON public.client_hubspot_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update client_hubspot_links" ON public.client_hubspot_links FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete client_hubspot_links" ON public.client_hubspot_links FOR DELETE TO authenticated USING (true);

CREATE TABLE public.client_hubspot_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL UNIQUE,
  hubspot_company_id text NOT NULL,
  company_name text,
  domain text,
  lifecycle_stage text,
  industry text,
  owner_name text,
  city text,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  deals jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_activity_date timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_hubspot_snapshot TO authenticated;
GRANT ALL ON public.client_hubspot_snapshot TO service_role;
ALTER TABLE public.client_hubspot_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_hubspot_snapshot" ON public.client_hubspot_snapshot FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert client_hubspot_snapshot" ON public.client_hubspot_snapshot FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update client_hubspot_snapshot" ON public.client_hubspot_snapshot FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete client_hubspot_snapshot" ON public.client_hubspot_snapshot FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_client_hubspot_links_updated_at BEFORE UPDATE ON public.client_hubspot_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_hubspot_snapshot_updated_at BEFORE UPDATE ON public.client_hubspot_snapshot FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();