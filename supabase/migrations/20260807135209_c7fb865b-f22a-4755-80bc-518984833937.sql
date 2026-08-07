CREATE TABLE public.client_comms_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL UNIQUE,
  hubspot_company_id text,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  threads jsonb NOT NULL DEFAULT '[]'::jsonb,
  email_count integer NOT NULL DEFAULT 0,
  last_email_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.client_comms_intel TO authenticated;
GRANT ALL ON public.client_comms_intel TO service_role;

ALTER TABLE public.client_comms_intel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_comms_intel"
  ON public.client_comms_intel FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_client_comms_intel_updated_at
  BEFORE UPDATE ON public.client_comms_intel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();