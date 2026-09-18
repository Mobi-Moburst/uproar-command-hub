CREATE TABLE IF NOT EXISTS public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  account_email text,
  reconnect_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pitch_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pitch_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.pitch_contacts(id) ON DELETE CASCADE,
  draft_id uuid,
  sender_user_id uuid NOT NULL,
  sender_email text,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  gmail_message_id text,
  gmail_thread_id text,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  reply_at timestamptz,
  reply_snippet text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pitch_sends_campaign_idx ON public.pitch_sends (campaign_id);
CREATE INDEX IF NOT EXISTS pitch_sends_contact_idx ON public.pitch_sends (contact_id);
CREATE INDEX IF NOT EXISTS pitch_sends_sender_idx ON public.pitch_sends (sender_user_id, sent_at);

GRANT SELECT ON public.pitch_sends TO authenticated;
GRANT ALL ON public.pitch_sends TO service_role;
ALTER TABLE public.pitch_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sends"
  ON public.pitch_sends FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.pitch_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id uuid NOT NULL REFERENCES public.pitch_sends(id) ON DELETE CASCADE,
  step integer NOT NULL,
  scheduled_for timestamptz NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'scheduled',
  sent_at timestamptz,
  gmail_message_id text,
  cancelled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (send_id, step)
);

CREATE INDEX IF NOT EXISTS pitch_followups_due_idx ON public.pitch_followups (status, scheduled_for);

GRANT SELECT ON public.pitch_followups TO authenticated;
GRANT ALL ON public.pitch_followups TO service_role;
ALTER TABLE public.pitch_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read followups"
  ON public.pitch_followups FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.pitch_send_settings (
  campaign_id uuid PRIMARY KEY REFERENCES public.pitch_campaigns(id) ON DELETE CASCADE,
  followups_enabled boolean NOT NULL DEFAULT true,
  steps jsonb NOT NULL DEFAULT '[{"day":3,"body":"Following up on the note below in case it got buried. Happy to send anything else you need."},{"day":7,"body":"Last nudge from me on this one. If it is not a fit, no problem at all."}]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pitch_send_settings TO authenticated;
GRANT ALL ON public.pitch_send_settings TO service_role;
ALTER TABLE public.pitch_send_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read send settings"
  ON public.pitch_send_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write send settings"
  ON public.pitch_send_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update send settings"
  ON public.pitch_send_settings FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_pitch_sends_updated_at
  BEFORE UPDATE ON public.pitch_sends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_user_connections_updated_at
  BEFORE UPDATE ON public.app_user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();