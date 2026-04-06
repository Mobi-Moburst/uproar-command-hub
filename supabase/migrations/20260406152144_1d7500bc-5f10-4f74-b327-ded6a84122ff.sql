
CREATE TABLE public.client_sows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  summary text,
  start_date text,
  end_date text,
  renewal_date text,
  retainer_amount text,
  deliverables jsonb DEFAULT '[]'::jsonb,
  raw_text text,
  ai_processed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.client_sows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_sows" ON public.client_sows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert client_sows" ON public.client_sows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update client_sows" ON public.client_sows FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete client_sows" ON public.client_sows FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.ensure_single_current_sow()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE public.client_sows
    SET is_current = false
    WHERE client_name = NEW.client_name AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_current_sow
BEFORE INSERT OR UPDATE ON public.client_sows
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_current_sow();

INSERT INTO storage.buckets (id, name, public) VALUES ('client-sows', 'client-sows', false);

CREATE POLICY "Authenticated users can upload SOWs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-sows');
CREATE POLICY "Authenticated users can read SOWs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-sows');
CREATE POLICY "Authenticated users can delete SOWs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-sows');
