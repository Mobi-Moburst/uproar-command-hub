CREATE TABLE public.pitch_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_contact_id text NOT NULL,
  campaign_id uuid REFERENCES public.pitch_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.pitch_contacts(id) ON DELETE CASCADE,
  claimed_by uuid,
  claimed_by_email text,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  release_reason text,
  forced_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pitch_claims_one_active
  ON public.pitch_claims (hubspot_contact_id)
  WHERE released_at IS NULL;

CREATE INDEX pitch_claims_contact ON public.pitch_claims (contact_id);

GRANT SELECT ON public.pitch_claims TO authenticated;
GRANT ALL ON public.pitch_claims TO service_role;
ALTER TABLE public.pitch_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read claims"
  ON public.pitch_claims FOR SELECT TO authenticated USING (true);

ALTER TABLE public.pitch_contacts ADD COLUMN IF NOT EXISTS armed_at timestamptz;
ALTER TABLE public.pitch_contacts ADD COLUMN IF NOT EXISTS arm_error text;