
CREATE TABLE public.weekly_wins (
  id text PRIMARY KEY,
  date text,
  week_start date,
  client_name text NOT NULL DEFAULT '',
  team_name text NOT NULL DEFAULT '',
  outlet text NOT NULL DEFAULT '',
  reporter_name text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  vertical text NOT NULL DEFAULT '',
  readership_viewership numeric NOT NULL DEFAULT 0,
  ad_value numeric NOT NULL DEFAULT 0,
  secured_by text NOT NULL DEFAULT '',
  topic_product text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  captured_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_wins_week_start ON public.weekly_wins (week_start DESC);
CREATE INDEX idx_weekly_wins_date ON public.weekly_wins (date DESC);

GRANT SELECT, INSERT, UPDATE ON public.weekly_wins TO authenticated;
GRANT ALL ON public.weekly_wins TO service_role;

ALTER TABLE public.weekly_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read weekly_wins"
  ON public.weekly_wins FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert weekly_wins"
  ON public.weekly_wins FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update weekly_wins"
  ON public.weekly_wins FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
