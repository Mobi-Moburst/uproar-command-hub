CREATE TABLE public.app_cron_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Service role only: no grants to anon or authenticated, RLS on with no policies.
GRANT ALL ON public.app_cron_secrets TO service_role;
ALTER TABLE public.app_cron_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_cron_secrets (key, value)
VALUES ('pitch_cron', '69ac54f17183330c74fee3a47cff77e95a495dfca27fd40a')
ON CONFLICT (key) DO NOTHING;