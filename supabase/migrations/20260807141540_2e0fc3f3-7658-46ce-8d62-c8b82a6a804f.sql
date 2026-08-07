CREATE TABLE public.client_coverage_intel (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text NOT NULL UNIQUE,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  placement_count integer NOT NULL DEFAULT 0,
  total_reach numeric NOT NULL DEFAULT 0,
  window_start text,
  window_end text,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.client_coverage_intel TO authenticated;
GRANT ALL ON public.client_coverage_intel TO service_role;

ALTER TABLE public.client_coverage_intel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_coverage_intel"
ON public.client_coverage_intel FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_client_coverage_intel_updated_at
BEFORE UPDATE ON public.client_coverage_intel
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();