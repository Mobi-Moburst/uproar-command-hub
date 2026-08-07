CREATE TABLE public.pitch_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  angle text NOT NULL,
  description text,
  press_release_body text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitch_campaigns TO authenticated;
GRANT ALL ON public.pitch_campaigns TO service_role;
ALTER TABLE public.pitch_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pitch_campaigns" ON public.pitch_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pitch_campaigns" ON public.pitch_campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pitch_campaigns" ON public.pitch_campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete pitch_campaigns" ON public.pitch_campaigns FOR DELETE TO authenticated USING (true);

CREATE TABLE public.pitch_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pitch_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  outlet text NOT NULL DEFAULT '',
  email text,
  beat text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  source_row jsonb NOT NULL DEFAULT '{}'::jsonb,
  hubspot_contact_id text,
  hubspot_ticket_id text,
  stage_cache text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pitch_contacts_campaign ON public.pitch_contacts(campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitch_contacts TO authenticated;
GRANT ALL ON public.pitch_contacts TO service_role;
ALTER TABLE public.pitch_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pitch_contacts" ON public.pitch_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pitch_contacts" ON public.pitch_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pitch_contacts" ON public.pitch_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete pitch_contacts" ON public.pitch_contacts FOR DELETE TO authenticated USING (true);

CREATE TABLE public.pitch_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.pitch_contacts(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pitch_drafts_contact ON public.pitch_drafts(contact_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitch_drafts TO authenticated;
GRANT ALL ON public.pitch_drafts TO service_role;
ALTER TABLE public.pitch_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pitch_drafts" ON public.pitch_drafts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pitch_drafts" ON public.pitch_drafts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pitch_drafts" ON public.pitch_drafts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete pitch_drafts" ON public.pitch_drafts FOR DELETE TO authenticated USING (true);

CREATE TABLE public.client_pitch_guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  rule text NOT NULL,
  scope text NOT NULL DEFAULT 'topic',
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_pitch_guardrails_client ON public.client_pitch_guardrails(client_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_pitch_guardrails TO authenticated;
GRANT ALL ON public.client_pitch_guardrails TO service_role;
ALTER TABLE public.client_pitch_guardrails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read client_pitch_guardrails" ON public.client_pitch_guardrails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_pitch_guardrails" ON public.client_pitch_guardrails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update client_pitch_guardrails" ON public.client_pitch_guardrails FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete client_pitch_guardrails" ON public.client_pitch_guardrails FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_pitch_campaigns_updated_at BEFORE UPDATE ON public.pitch_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pitch_contacts_updated_at BEFORE UPDATE ON public.pitch_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pitch_drafts_updated_at BEFORE UPDATE ON public.pitch_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_pitch_guardrails_updated_at BEFORE UPDATE ON public.client_pitch_guardrails FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();